import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasUnlimitedAccess } from "@/lib/data/user";
import {
  consumeCredits,
  getCreditWallet,
  refundCredits,
} from "@/lib/data/credits";
import { gradeExam, type SummarizeSourceFile } from "@/lib/ai/generate";
import { resolveExamReference, saveCorrection } from "@/lib/data/correction";
import { gradeRequestSchema } from "@/lib/ai/schemas";
import { describeAIError } from "@/lib/ai/errors";
import { OPENAI_MODEL } from "@/lib/ai/openai-client";
import { logAiUsage } from "@/lib/ai/usage";
import {
  MAX_UPLOAD_BYTES,
  detectServerUploadKind,
  extractDocxText,
  matchesMagicBytes,
} from "@/lib/ai/extract";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { formatBytes } from "@/lib/utils/format";
import type { CreditDebitResult } from "@/types";

/** Correction IA parfois longue — laisse la fonction respirer en serverless. */
export const maxDuration = 120;

/**
 * « Corriger une épreuve » : reçoit la copie construite par `AnswerSubmissionPanel`
 * (`multipart/form-data` : champ `payload` JSON = `CorrectionRequest` + `file`
 * optionnel), corrige la copie avec OpenAI **côté serveur** (en s'appuyant sur
 * l'épreuve de référence choisie dans le déroulant, si l'élève en a généré une),
 * la persiste dans Neon (`corrections` + `activities`) et la renvoie pour affichage.
 *
 * Réutilise exactement l'intégration OpenAI de « Résumer mes cours » / « Générer
 * une épreuve » (même client, même modèle, même extraction PDF / DOCX).
 *
 * Coût : 10 crédits, prélevés atomiquement AVANT l'appel OpenAI — sauf
 * l'admin/propriétaire (accès illimité). Remboursés si la correction ou la
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

  const parsed = gradeRequestSchema.safeParse(payloadJson);
  if (!parsed.success) {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }
  const gradeRequest = { ...parsed.data };

  const uploaded = form.get("file");
  const file = uploaded instanceof File && uploaded.size > 0 ? uploaded : null;

  if (file && file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: t.fileTooLarge(formatBytes(file.size, locale)) },
      { status: 413 },
    );
  }

  let debit: CreditDebitResult | null = null;

  try {
    let sourceFile: SummarizeSourceFile | undefined;

    if (file) {
      const kind = detectServerUploadKind(file);
      const bytes = Buffer.from(await file.arrayBuffer());

      if (kind && !matchesMagicBytes(bytes, kind)) {
        return NextResponse.json(
          { error: t.unsupportedFormat },
          { status: 415 },
        );
      }

      if (kind === "pdf") {
        sourceFile = {
          filename: file.name || "copie.pdf",
          dataUrl: `data:application/pdf;base64,${bytes.toString("base64")}`,
        };
        gradeRequest.answerSourceText = null;
      } else if (kind === "docx") {
        gradeRequest.answerSourceText = await extractDocxText(
          bytes,
          file.name || "copie.docx",
          dict,
        );
      } else {
        return NextResponse.json(
          { error: t.unsupportedFormat },
          { status: 415 },
        );
      }
    }

    const { examId, referenceText, documentContext } =
      await resolveExamReference(user.id, gradeRequest.selectedExamId);

    // Rien à corriger : ni copie (texte ou fichier), ni épreuve de référence
    // sélectionnée. Sans copie mais avec une épreuve → corrigé type (autorisé).
    const hasCopy =
      Boolean(sourceFile) ||
      Boolean(gradeRequest.answerSourceText?.trim()) ||
      gradeRequest.answerText.trim().length > 0;
    if (!hasCopy && !referenceText) {
      return NextResponse.json({ error: t.noAnswerToGrade }, { status: 400 });
    }

    if (!unlimited) {
      debit = await db.transaction((tx) => consumeCredits(tx, user.id, "corriger"));
      if (!debit.ok) {
        return NextResponse.json(
          { error: dict.credits.insufficientMessage, code: "INSUFFICIENT_CREDITS" },
          { status: 402 },
        );
      }
    }

    const { correction, usage } = await gradeExam(
      {
        ...gradeRequest,
        examReferenceText: referenceText,
        documentContext,
      },
      dict,
      locale,
      sourceFile,
    );

    await saveCorrection({
      userId: user.id,
      request: gradeRequest,
      correction,
      examId,
    });

    await logAiUsage({
      userId: user.id,
      kind: "correction",
      model: OPENAI_MODEL,
      status: "success",
      tokens: usage,
    });

    const credits = unlimited ? null : await getCreditWallet(user.id);
    return NextResponse.json({ correction, credits });
  } catch (error) {
    console.error("[/api/ai/grade] échec de la correction :", error);
    if (debit?.ok) {
      const { drawnFromSubscription, drawnFromRecharge } = debit;
      await db.transaction((tx) =>
        refundCredits(tx, user.id, drawnFromSubscription, drawnFromRecharge, "corriger"),
      );
    }
    await logAiUsage({
      userId: user.id,
      kind: "correction",
      model: OPENAI_MODEL,
      status: "error",
    });
    const { status, message } = describeAIError(error, dict);
    return NextResponse.json({ error: message }, { status });
  }
}
