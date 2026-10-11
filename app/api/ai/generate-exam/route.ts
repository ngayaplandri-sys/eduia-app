import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasUnlimitedAccess } from "@/lib/data/user";
import {
  consumeCredits,
  getCreditWallet,
  refundCredits,
} from "@/lib/data/credits";
import { generateExam, type SummarizeSourceFile } from "@/lib/ai/generate";
import { saveGeneratedExam } from "@/lib/data/exam";
import { examRequestSchema } from "@/lib/ai/schemas";
import { describeAIError } from "@/lib/ai/errors";
import {
  collectUploadedFiles,
  deleteStoredFiles,
  describeUploadIntakeError,
} from "@/lib/uploads/server";
import { OPENAI_MODEL } from "@/lib/ai/openai-client";
import { logAiUsage } from "@/lib/ai/usage";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
  detectServerUploadKind,
  extractDocxText,
  matchesMagicBytes,
} from "@/lib/ai/extract";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { formatBytes } from "@/lib/utils/format";
import type { CreditDebitResult } from "@/types";

/** Génération IA parfois longue — laisse la fonction respirer en serverless. */
export const maxDuration = 120;

/**
 * « Générer une épreuve » : reçoit les paramètres construits par
 * `ExamConfigPanel` (`multipart/form-data` : champ `payload` JSON = `ExamRequest`
 * + `file` optionnel), génère une épreuve avec OpenAI **côté serveur**, la
 * persiste dans Neon (`exams` + `activities`) et la renvoie pour affichage.
 *
 * Réutilise exactement l'intégration OpenAI de « Résumer mes cours » (même
 * client, même modèle, même extraction : PDF natif / DOCX `mammoth` / TXT-photo
 * texte client).
 *
 * Coût : 10 crédits (aussi pour une régénération — pas de coût séparé, voir
 * `lib/config/credits.ts`), prélevés atomiquement AVANT l'appel OpenAI —
 * sauf l'admin/propriétaire (accès illimité). Remboursés si la génération ou
 * la sauvegarde échoue ensuite.
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

  const parsed = examRequestSchema.safeParse(payloadJson);
  if (!parsed.success) {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }
  const examRequest = { ...parsed.data };

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
    // Un seul fichier envoyé au total (aucune autre page texte côté client) :
    // le texte Word extrait devient directement `sourceText`, sans repère de
    // page — comportement strictement identique à l'import mono-fichier.
    const singleDocxTotal =
      uploadedFiles.length === 1 && !examRequest.sourceText?.trim();

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
      } else if (kind === "docx") {
        const text = await extractDocxText(
          bytes,
          uploadedFile.name || "cours.docx",
          dict,
        );
        examRequest.sourceText = singleDocxTotal
          ? text
          : examRequest.sourceText
            ? `${examRequest.sourceText}\n\n[Pièce jointe — ${uploadedFile.name}]\n${text}`
            : `[Pièce jointe — ${uploadedFile.name}]\n${text}`;
      } else {
        return NextResponse.json(
          { error: t.unsupportedFormat },
          { status: 415 },
        );
      }
    }

    if (!unlimited) {
      debit = await db.transaction((tx) => consumeCredits(tx, user.id, "generer"));
      if (!debit.ok) {
        return NextResponse.json(
          { error: dict.credits.insufficientMessage, code: "INSUFFICIENT_CREDITS" },
          { status: 402 },
        );
      }
    }

    const { exam, usage, sourceGrounding } = await generateExam(
      examRequest,
      dict,
      locale,
      sourceFiles,
    );

    await saveGeneratedExam({
      userId: user.id,
      request: examRequest,
      exam,
      sourceText: sourceGrounding,
    });

    await logAiUsage({
      userId: user.id,
      kind: "exam",
      model: OPENAI_MODEL,
      status: "success",
      tokens: usage,
    });

    const credits = unlimited ? null : await getCreditWallet(user.id);
    return NextResponse.json({ exam, credits });
  } catch (error) {
    console.error("[/api/ai/generate-exam] échec de la génération :", error);
    if (debit?.ok) {
      const { drawnFromSubscription, drawnFromRecharge } = debit;
      await db.transaction((tx) =>
        refundCredits(tx, user.id, drawnFromSubscription, drawnFromRecharge, "generer"),
      );
    }
    await logAiUsage({
      userId: user.id,
      kind: "exam",
      model: OPENAI_MODEL,
      status: "error",
    });
    const { status, message } = describeAIError(error, dict);
    return NextResponse.json({ error: message }, { status });
  }
}
