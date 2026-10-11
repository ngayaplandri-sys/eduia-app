import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasUnlimitedAccess } from "@/lib/data/user";
import {
  consumeCredits,
  getCreditWallet,
  refundCredits,
} from "@/lib/data/credits";
import { summarizeCourse, type SummarizeSourceFile } from "@/lib/ai/generate";
import {
  saveCourseSummary,
  type SummarySourceKind,
} from "@/lib/data/summary";
import { storeDocumentOriginals, type DocumentOriginal } from "@/lib/data/documents";
import {
  collectUploadedFiles,
  deleteStoredFiles,
  describeUploadIntakeError,
} from "@/lib/uploads/server";
import { summaryRequestSchema } from "@/lib/ai/schemas";
import { describeAIError } from "@/lib/ai/errors";
import { OPENAI_MODEL } from "@/lib/ai/openai-client";
import { logAiUsage } from "@/lib/ai/usage";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
  detectServerUploadKind,
  extractDocxText,
  estimatePdfPageCount,
  matchesMagicBytes,
  estimatePageCountFromText,
} from "@/lib/ai/extract";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { formatBytes } from "@/lib/utils/format";
import type { CreditDebitResult } from "@/types";

/** Génération IA parfois longue — laisse la fonction respirer sur les plateformes serverless. */
export const maxDuration = 120;

interface SourceMeta {
  fileName: string;
  fileKind: SummarySourceKind;
  sizeLabel: string;
  pageCount: number;
}

/**
 * « Résumer mes cours » : reçoit le fichier + les paramètres construits par
 * `CourseUploadPanel` (`multipart/form-data` : champ `payload` JSON + `file`
 * optionnel), génère un résumé pédagogique avec OpenAI **côté serveur**, le
 * persiste dans Neon (`documents` + `summaries` + `activities`) et le renvoie
 * pour affichage immédiat.
 *
 * Extraction du contenu selon le format :
 *  - PDF   → transmis nativement à OpenAI (`input_file`) ;
 *  - DOCX  → texte extrait via `mammoth` ;
 *  - TXT / photo → texte déjà extrait avant l'envoi (lecture directe / photo
 *    transcrite par le modèle de vision via `POST /api/ai/ocr`).
 *
 * Coût : 5 crédits, prélevés atomiquement AVANT l'appel OpenAI — sauf
 * l'admin/propriétaire (accès illimité). Remboursés si la génération ou la
 * sauvegarde échoue ensuite.
 */
export async function POST(request: Request) {
  const [user, dict, locale] = await Promise.all([
    getCurrentUser(),
    getDictionary(),
    getLocale(),
  ]);
  const t = dict.ai;

  if (!user) {
    return NextResponse.json({ error: t.notSignedIn }, { status: 401 });
  }

  const unlimited = hasUnlimitedAccess(user);

  // ── Lecture de la requête ────────────────────────────────────────────────
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }

  const rawPayload = form.get("payload");
  let payloadJson: unknown = null;
  if (typeof rawPayload === "string") {
    try {
      payloadJson = JSON.parse(rawPayload);
    } catch {
      payloadJson = null;
    }
  }

  const parsed = summaryRequestSchema.safeParse(payloadJson);
  if (!parsed.success) {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }
  const summaryRequest = { ...parsed.data };

  // Jusqu'à 5 fichiers/pages en une seule génération, traités comme UN seul
  // document (voir `MultiFileDropzone` côté client). Au-delà de 4 Mo, ils
  // arrivent par le stockage privé (`lib/uploads`), effacé après la requête.
  let uploadedFiles: File[];
  try {
    const intake = await collectUploadedFiles(form, "files", user.id);
    uploadedFiles = intake.files;
    after(() => deleteStoredFiles(intake.tempPathnames));
  } catch (error) {
    const { status, error: message } = describeUploadIntakeError(error, dict);
    return NextResponse.json({ error: message }, { status });
  }

  // Texte déjà extrait côté client (fichier TXT, photo lue par l'IA), conservé
  // tel quel comme fichier d'origine `.txt` du document.
  // (Un document d'une seule page perd son repère « [Page 1 — nom] ».)
  const rawClientText = summaryRequest.sourceText?.trim() ?? "";
  const clientText =
    summaryRequest.sourceKind === "multi"
      ? rawClientText
      : rawClientText.replace(/^\[[^\]\n]*\]\n/, "");

  if (uploadedFiles.length > MAX_UPLOAD_FILES) {
    return NextResponse.json(
      { error: t.tooManyFiles(MAX_UPLOAD_FILES) },
      { status: 400 },
    );
  }

  for (const uploadedFile of uploadedFiles) {
    if (uploadedFile.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: t.fileTooLarge(formatBytes(uploadedFile.size, locale)) },
        { status: 413 },
      );
    }
  }

  let debit: CreditDebitResult | null = null;

  try {
    const sourceFiles: SummarizeSourceFile[] = [];
    let source: SourceMeta | null = null;
    let pdfPageCount = 0;
    let attachedBytes = 0;
    let firstAttachedKind: SummarySourceKind | null = null;
    const originals: DocumentOriginal[] = [];
    // Un seul fichier envoyé au total (aucune autre page texte côté client) :
    // le texte Word extrait devient directement `sourceText`, sans repère de
    // page — comportement strictement identique à l'import mono-fichier.
    const singleDocxTotal =
      uploadedFiles.length === 1 && !summaryRequest.sourceText?.trim();

    for (const uploadedFile of uploadedFiles) {
      const kind = detectServerUploadKind(uploadedFile);
      const bytes = Buffer.from(await uploadedFile.arrayBuffer());

      if (kind && !matchesMagicBytes(bytes, kind)) {
        return NextResponse.json(
          { error: t.unsupportedFormat },
          { status: 415 },
        );
      }

      if (kind === "pdf") {
        sourceFiles.push({
          filename: uploadedFile.name || "cours.pdf",
          dataUrl: `data:application/pdf;base64,${bytes.toString("base64")}`,
        });
        pdfPageCount += estimatePdfPageCount(bytes);
        firstAttachedKind ??= "pdf";
        attachedBytes += uploadedFile.size;
        originals.push({
          name: uploadedFile.name || "cours.pdf",
          contentType: "application/pdf",
          bytes,
        });
      } else if (kind === "docx") {
        const text = await extractDocxText(
          bytes,
          uploadedFile.name || "cours.docx",
          dict,
        );
        summaryRequest.sourceText = singleDocxTotal
          ? text
          : summaryRequest.sourceText
            ? `${summaryRequest.sourceText}\n\n[Pièce jointe — ${uploadedFile.name}]\n${text}`
            : `[Pièce jointe — ${uploadedFile.name}]\n${text}`;
        firstAttachedKind ??= "docx";
        attachedBytes += uploadedFile.size;
        originals.push({
          name: uploadedFile.name || "cours.docx",
          contentType:
            uploadedFile.type ||
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          bytes,
        });
      } else {
        return NextResponse.json(
          { error: t.unsupportedFormat },
          { status: 415 },
        );
      }
    }

    if (uploadedFiles.length > 0 || summaryRequest.sourceText?.trim()) {
      const isImage = summaryRequest.sourceKind === "image";
      const fileKind: SummarySourceKind =
        firstAttachedKind ?? (isImage ? "image" : "txt");
      source = {
        fileName:
          summaryRequest.fileName ||
          (isImage ? dict.resumer.sourcePhoto : dict.resumer.sourceText),
        fileKind,
        // Taille de ce qui est conservé et téléchargeable : fichiers joints +
        // texte lu côté client (TXT, photo transcrite).
        sizeLabel:
          attachedBytes + Buffer.byteLength(clientText, "utf8") > 0
            ? formatBytes(attachedBytes + Buffer.byteLength(clientText, "utf8"), locale)
            : "",
        pageCount:
          pdfPageCount +
          (summaryRequest.sourceText
            ? estimatePageCountFromText(summaryRequest.sourceText)
            : 0),
      };
    }

    if (!unlimited) {
      debit = await db.transaction((tx) => consumeCredits(tx, user.id, "resumer"));
      if (!debit.ok) {
        return NextResponse.json(
          { error: dict.credits.insufficientMessage, code: "INSUFFICIENT_CREDITS" },
          { status: 402 },
        );
      }
    }

    const { summary, usage } = await summarizeCourse(
      summaryRequest,
      dict,
      locale,
      sourceFiles,
    );

    const { documentId } = await saveCourseSummary({
      userId: user.id,
      request: summaryRequest,
      summary,
      source,
    });

    if (documentId && clientText) {
      const baseName = (source?.fileName ?? dict.resumer.sourceText).replace(/\.[^.]+$/, "");
      originals.push({
        name: `${baseName}.txt`,
        contentType: "text/plain; charset=utf-8",
        bytes: Buffer.from(clientText, "utf8"),
      });
    }
    // Conservation des fichiers d'origine pour `/documents` : au mieux — un
    // échec n'annule jamais le résumé déjà généré et enregistré.
    if (documentId) await storeDocumentOriginals(user.id, documentId, originals);

    await logAiUsage({
      userId: user.id,
      kind: "summary",
      model: OPENAI_MODEL,
      status: "success",
      tokens: usage,
    });

    const credits = unlimited ? null : await getCreditWallet(user.id);
    return NextResponse.json({ summary, credits });
  } catch (error) {
    console.error("[/api/ai/summarize] échec de la génération :", error);
    if (debit?.ok) {
      const { drawnFromSubscription, drawnFromRecharge } = debit;
      await db.transaction((tx) =>
        refundCredits(tx, user.id, drawnFromSubscription, drawnFromRecharge, "resumer"),
      );
    }
    await logAiUsage({
      userId: user.id,
      kind: "summary",
      model: OPENAI_MODEL,
      status: "error",
    });
    const { status, message } = describeAIError(error, dict);
    return NextResponse.json({ error: message }, { status });
  }
}
