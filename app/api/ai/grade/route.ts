import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasUnlimitedAccess } from "@/lib/data/user";
import {
  consumeCredits,
  getCreditWallet,
  refundCredits,
} from "@/lib/data/credits";
import { CREDIT_COSTS } from "@/lib/config/credits";
import { gradeExam } from "@/lib/ai/generate";
import { analyzeExamDocument } from "@/lib/ai/exam-analysis";
import type { ExamAttachment } from "@/lib/ai/attachments";
import type { AIExamAnalysis } from "@/lib/ai/schemas";
import {
  findMatchingExam,
  resolveExamReference,
  saveCorrection,
} from "@/lib/data/correction";
import { gradeRequestSchema } from "@/lib/ai/schemas";
import { describeAIError } from "@/lib/ai/errors";
import {
  collectUploadedFiles,
  deleteStoredFiles,
  describeUploadIntakeError,
} from "@/lib/uploads/server";
import { OPENAI_MODEL } from "@/lib/ai/openai-client";
import { logAiUsage } from "@/lib/ai/usage";
import { detectImageMime } from "@/lib/ai/ocr";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
  detectServerUploadKind,
  extractDocxText,
  matchesMagicBytes,
} from "@/lib/ai/extract";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatBytes } from "@/lib/utils/format";
import type { CorrectionStreamEvent, CreditDebitResult } from "@/types";

/**
 * Analyse de l'épreuve + correction avec raisonnement : jusqu'à quelques
 * minutes pour une longue épreuve — laisse la fonction respirer en serverless.
 */
export const maxDuration = 300;

/**
 * Marge gardée avant la coupure de la fonction (`maxDuration`) : chaque appel
 * IA reçoit au plus le temps restant moins cette marge, pour qu'un dépassement
 * se termine toujours par une erreur propre (et un remboursement des crédits)
 * plutôt que par l'arrêt brutal de la fonction.
 */
const DEADLINE_MARGIN_MS = 20_000;

/** Pages d'une épreuve importée en une fois (traitées comme UNE épreuve). */
const MAX_EXAM_FILES = 10;

/** Volume total accepté pour une correction (épreuve + copie). */
const MAX_TOTAL_BYTES = 60 * 1024 * 1024;

/** Texte brut d'un fichier `.txt` importé (borné, comme le reste du contenu). */
const MAX_TEXT_FILE_CHARS = 60_000;

class UploadError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function isTextFile(file: File): boolean {
  return file.type.toLowerCase().startsWith("text/") || /\.txt$/i.test(file.name);
}

/**
 * Convertit les fichiers importés en pages transmissibles au modèle, dans
 * l'ordre : PDF et photos tels quels (lus nativement : figures, tableaux et
 * écriture manuscrite compris), Word et TXT en texte. Le type réel est vérifié
 * par signature binaire, jamais sur la seule extension déclarée par le client.
 */
async function toAttachments(
  files: File[],
  labelFor: (index: number, name: string) => string,
  dict: Dictionary,
): Promise<ExamAttachment[]> {
  const attachments: ExamAttachment[] = [];

  for (const [index, file] of files.entries()) {
    const name = file.name || `page-${index + 1}`;
    const label = labelFor(index, name);
    const bytes = Buffer.from(await file.arrayBuffer());

    const imageMime = detectImageMime(bytes);
    if (imageMime) {
      attachments.push({
        kind: "image",
        label,
        dataUrl: `data:${imageMime};base64,${bytes.toString("base64")}`,
      });
      continue;
    }

    const kind = detectServerUploadKind(file);
    if (kind === "pdf" && matchesMagicBytes(bytes, "pdf")) {
      attachments.push({
        kind: "pdf",
        label,
        filename: name,
        dataUrl: `data:application/pdf;base64,${bytes.toString("base64")}`,
      });
      continue;
    }
    if (kind === "docx" && matchesMagicBytes(bytes, "docx")) {
      attachments.push({ kind: "text", label, text: await extractDocxText(bytes, name, dict) });
      continue;
    }
    if (isTextFile(file) && !bytes.includes(0)) {
      const text = bytes.toString("utf8").trim().slice(0, MAX_TEXT_FILE_CHARS);
      if (text) {
        attachments.push({ kind: "text", label, text });
        continue;
      }
    }

    throw new UploadError(dict.ai.unsupportedFormat, 415);
  }

  return attachments;
}

/**
 * Message précis quand une page de l'épreuve ne peut pas être lue : la photo
 * (ou le PDF) est nommée pour que l'élève sache laquelle reprendre.
 */
function unreadableMessage(
  analysis: AIExamAnalysis,
  attachments: ExamAttachment[],
  names: string[],
  dict: Dictionary,
): string | null {
  const t = dict.corriger;
  const unreadable = analysis.pages
    .filter((page) => page.readability === "unreadable")
    .map((page) => page.page)
    .filter((page) => page >= 1 && page <= attachments.length);
  if (unreadable.length === 0) return null;

  const first = unreadable[0];
  const message =
    attachments[first - 1].kind === "pdf" ? t.pdfUnreadable : t.imageUnreadable;
  if (attachments.length === 1) return message;
  return t.pageUnreadable(
    unreadable.map((page) => t.pageRef(page, names[page - 1])).join(", "),
    message,
  );
}

/**
 * « Corriger une épreuve ». Corps `multipart/form-data` :
 *  - `payload` : `CorrectionRequest` (JSON) ;
 *  - `examFiles` : pages de l'épreuve importée ou scannée (PDF, photos, Word,
 *    TXT), dans l'ordre — une seule épreuve, quelle que soit sa source ;
 *  - `copyFiles` : copie de l'élève jointe en fichier (facultatif).
 *
 * Parcours :
 *  1. épreuve EduIA choisie dans la liste → correction ancrée sur son cours
 *     d'origine (fonctionnement historique, inchangé) ;
 *  2. épreuve importée → ANALYSE (lisibilité, matière, niveau, barème,
 *     questions) sans prélever de crédit ; une page illisible ou un document
 *     sans question s'arrête là, avec un message précis ;
 *     - reconnue comme une épreuve EduIA de l'élève → parcours 1 ;
 *     - sinon, épreuve EXTERNE → correction sans cours, à partir de l'épreuve
 *       et des connaissances générales du modèle ;
 *  3. copie seule (sans épreuve) → correction libre (fonctionnement historique).
 *
 * Crédits : coût unique `corriger`, prélevé atomiquement côté serveur juste
 * avant la correction (jamais pendant l'analyse), remboursé si la correction ou
 * sa sauvegarde échoue. Les erreurs de validation répondent en JSON avec un
 * statut HTTP ; ensuite la progression est diffusée en NDJSON
 * (`CorrectionStreamEvent`, une ligne par événement).
 */
export async function POST(request: Request) {
  const deadline = Date.now() + maxDuration * 1000 - DEADLINE_MARGIN_MS;
  const remaining = (cap: number) => Math.max(15_000, Math.min(cap, deadline - Date.now()));
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

  // ── Lecture et validation de la requête ──────────────────────────────────
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

  // Au-delà de 4 Mo au total, les fichiers arrivent par le stockage privé
  // (`lib/uploads`), effacé une fois la correction terminée.
  let examFiles: File[];
  let copyFiles: File[];
  try {
    const examIntake = await collectUploadedFiles(form, "examFiles", user.id);
    after(() => deleteStoredFiles(examIntake.tempPathnames));
    const copyIntake = await collectUploadedFiles(form, "copyFiles", user.id);
    after(() => deleteStoredFiles(copyIntake.tempPathnames));
    examFiles = examIntake.files;
    copyFiles = copyIntake.files;
  } catch (error) {
    const { status, error: message } = describeUploadIntakeError(error, dict);
    return NextResponse.json({ error: message }, { status });
  }

  if (examFiles.length > MAX_EXAM_FILES || copyFiles.length > MAX_UPLOAD_FILES) {
    return NextResponse.json(
      { error: t.tooManyFiles(examFiles.length > MAX_EXAM_FILES ? MAX_EXAM_FILES : MAX_UPLOAD_FILES) },
      { status: 400 },
    );
  }
  for (const file of [...examFiles, ...copyFiles]) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: t.fileTooLarge(formatBytes(file.size, locale)) },
        { status: 413 },
      );
    }
  }
  const totalBytes = [...examFiles, ...copyFiles].reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { error: t.fileTooLarge(formatBytes(totalBytes, locale)) },
      { status: 413 },
    );
  }

  let examAttachments: ExamAttachment[];
  let copyAttachments: ExamAttachment[];
  try {
    examAttachments = await toAttachments(
      examFiles,
      (index, name) => dict.corriger.pageRef(index + 1, name),
      dict,
    );
    copyAttachments = await toAttachments(
      copyFiles,
      (index, name) => `${dict.corriger.copyLabel} — ${dict.corriger.pageRef(index + 1, name)}`,
      dict,
    );
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const { status, message } = describeAIError(error, dict);
    return NextResponse.json({ error: message }, { status });
  }

  // Les fichiers Word / TXT de la copie rejoignent son texte (photos déjà
  // transcrites côté client) ; PDF et photos restent joints tels quels.
  const copyTexts = copyAttachments.filter((a) => a.kind === "text");
  copyAttachments = copyAttachments.filter((a) => a.kind !== "text");
  if (copyTexts.length > 0) {
    gradeRequest.answerSourceText = [
      gradeRequest.answerSourceText?.trim(),
      ...copyTexts.map((a) => (a.kind === "text" ? `[${a.label}]\n${a.text}` : "")),
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const hasCopy =
    copyAttachments.length > 0 ||
    Boolean(gradeRequest.answerSourceText?.trim()) ||
    gradeRequest.answerText.trim().length > 0;
  if (!hasCopy && examAttachments.length === 0 && !gradeRequest.selectedExamId) {
    return NextResponse.json({ error: t.noAnswerToGrade }, { status: 400 });
  }

  // L'analyse coûte un appel IA : on vérifie d'abord que l'élève pourra payer
  // la correction (le prélèvement atomique reste fait plus loin).
  if (!unlimited && examAttachments.length > 0) {
    const wallet = await getCreditWallet(user.id);
    if (wallet.total < CREDIT_COSTS.corriger) {
      return NextResponse.json(
        { error: dict.credits.insufficientMessage, code: "INSUFFICIENT_CREDITS" },
        { status: 402 },
      );
    }
  }

  const examNames = examFiles.map((file, index) => file.name || `page-${index + 1}`);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: CorrectionStreamEvent) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      let debit: CreditDebitResult | null = null;
      let correcting = false;
      try {
        let reference = await resolveExamReference(user.id, gradeRequest.selectedExamId);
        let externalAnalysis: AIExamAnalysis | null = null;
        let notice: string | undefined;
        let examPagesForGrading: ExamAttachment[] = [];

        if (reference.examId) {
          // Épreuve EduIA choisie : des pages importées en plus sont examinées
          // comme la copie (le modèle vérifie qu'elles contiennent des réponses).
          copyAttachments = [...examAttachments, ...copyAttachments];
        } else if (examAttachments.length > 0) {
          // ── 1. Analyse de l'épreuve importée (aucun crédit prélevé) ──────
          send({ type: "stage", stage: "analyzing" });
          let analysis: AIExamAnalysis;
          try {
            const result = await analyzeExamDocument(examAttachments, dict, remaining(120_000));
            analysis = result.analysis;
            await logAiUsage({
              userId: user.id,
              kind: "ocr",
              model: OPENAI_MODEL,
              status: "success",
              tokens: result.usage,
            });
          } catch (error) {
            await logAiUsage({ userId: user.id, kind: "ocr", model: OPENAI_MODEL, status: "error" });
            throw error;
          }

          const unreadable = unreadableMessage(analysis, examAttachments, examNames, dict);
          if (unreadable) {
            send({ type: "error", error: unreadable, code: "UNREADABLE" });
            return;
          }
          if (!analysis.isExam || analysis.questions.length === 0) {
            send({ type: "error", error: dict.corriger.notAnExam, code: "NOT_AN_EXAM" });
            return;
          }

          const partial = analysis.pages
            .filter((page) => page.readability === "partial")
            .map((page) => page.page)
            .filter((page) => page >= 1 && page <= examAttachments.length);
          if (partial.length > 0) {
            notice = dict.corriger.partialNotice(
              examAttachments.length > 1
                ? partial.map((page) => dict.corriger.pageRef(page, examNames[page - 1])).join(", ")
                : null,
            );
          }

          // ── 2. Épreuve EduIA de l'élève reconnue ? Sinon : externe ───────
          const matchedId = await findMatchingExam(user.id, analysis.questions);
          if (matchedId) {
            reference = await resolveExamReference(user.id, matchedId);
          }
          if (reference.examId) {
            if (analysis.containsStudentAnswers) {
              copyAttachments = [...examAttachments, ...copyAttachments];
            }
          } else {
            externalAnalysis = analysis;
            examPagesForGrading = examAttachments;
          }

          send({
            type: "analysis",
            subject: analysis.subject,
            level: gradeRequest.level || analysis.level,
            title: analysis.title,
            questionCount: analysis.questions.length,
            matchedEduia: Boolean(reference.examId),
          });
        }

        // Rien à corriger (ex. épreuve choisie introuvable pour ce compte, sans
        // copie) : on s'arrête AVANT tout prélèvement.
        if (!reference.examId && !externalAnalysis && !hasCopy) {
          send({ type: "error", error: t.noAnswerToGrade });
          return;
        }

        // ── 3. Prélèvement (une seule fois), puis correction ──────────────
        if (!unlimited) {
          debit = await db.transaction((tx) => consumeCredits(tx, user.id, "corriger"));
          if (!debit.ok) {
            send({
              type: "error",
              error: dict.credits.insufficientMessage,
              code: "INSUFFICIENT_CREDITS",
            });
            return;
          }
        }

        send({ type: "stage", stage: "correcting" });
        correcting = true;
        const { correction, usage } = await gradeExam(
          {
            ...gradeRequest,
            selectedExam: reference.label ?? gradeRequest.selectedExam,
            examReferenceText: reference.referenceText,
            documentContext: reference.documentContext,
            referencePoints: reference.points,
            referenceTotal: reference.totalPoints,
            referenceLevel: reference.level,
            externalAnalysis,
          },
          dict,
          locale,
          { exam: examPagesForGrading, copy: copyAttachments },
          remaining(270_000),
        );
        if (notice) correction.notice = notice;

        await saveCorrection({
          userId: user.id,
          request: gradeRequest,
          correction,
          examId: reference.examId,
        });

        await logAiUsage({
          userId: user.id,
          kind: "correction",
          model: OPENAI_MODEL,
          status: "success",
          tokens: usage,
        });

        send({ type: "result", correction });
      } catch (error) {
        console.error("[/api/ai/grade] échec de la correction :", error);
        if (debit?.ok) {
          const { drawnFromSubscription, drawnFromRecharge } = debit;
          await db.transaction((tx) =>
            refundCredits(tx, user.id, drawnFromSubscription, drawnFromRecharge, "corriger"),
          );
        }
        if (correcting) {
          await logAiUsage({
            userId: user.id,
            kind: "correction",
            model: OPENAI_MODEL,
            status: "error",
          });
        }
        const { message } = describeAIError(error, dict);
        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
