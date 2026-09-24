import { NextResponse } from "next/server";
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
  // document (voir `MultiFileDropzone` côté client).
  const uploadedFiles = form
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

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
        sizeLabel: attachedBytes > 0 ? formatBytes(attachedBytes, locale) : "",
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

    await saveCourseSummary({
      userId: user.id,
      request: summaryRequest,
      summary,
      source,
    });

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
