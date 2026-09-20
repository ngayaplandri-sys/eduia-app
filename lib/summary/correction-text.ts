import type { ExamCorrection } from "@/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  localizeLevel,
  localizePageCount,
  localizeSubject,
} from "@/lib/i18n/labels";

/**
 * Version texte brut d'une correction — alimente le téléchargement `.txt`, la
 * copie et le partage (`ResultActions`). Client-safe. Le contenu (réponses,
 * feedback) suit la langue de génération ; les intitulés sont localisés.
 */
export function correctionToPlainText(
  correction: ExamCorrection,
  dict: Dictionary,
): string {
  const c = dict.corriger;
  const verdicts = dict.activity.verdicts;
  const isAnswerKey = correction.mode === "answer-key";

  const lines: string[] = [
    `${isAnswerKey ? c.resultTitleAnswerKey : c.resultTitle} — ${correction.examTitle}`,
    `${localizeSubject(correction.subject, dict)} · ${localizeLevel(
      correction.level,
      dict,
    )} · ${correction.theme} · ${localizePageCount(correction.pageCountLabel, dict)}`,
  ];
  if (!isAnswerKey) {
    lines.push(
      `${c.scoreAria} : ${correction.score} / ${correction.maxScore} — ${correction.appreciation}`,
    );
  }
  if (correction.summary) lines.push(correction.summary);
  lines.push(
    "",
    `${isAnswerKey ? c.answerKeyByQuestion : c.detailByQuestion} :`,
  );

  correction.questions.forEach((question, index) => {
    lines.push(
      isAnswerKey
        ? `${index + 1}. ${question.prompt}  (${c.ptMax(question.pointsMax)})`
        : `${index + 1}. ${question.prompt}  (${question.pointsEarned}/${question.pointsMax} pt · ${verdicts[question.verdict]})`,
    );
    if (!isAnswerKey) {
      lines.push(`   ${c.yourAnswer} : ${question.studentAnswer || "—"}`);
    }
    lines.push(`   ${c.expectedAnswer} : ${question.expectedAnswer}`);
    if (question.feedback) {
      lines.push(`   ${c.explanation} ${question.feedback}`);
    }
    lines.push("");
  });

  if (!isAnswerKey) {
    lines.push(`${c.strengths} :`);
    for (const item of correction.strengths) lines.push(`- ${item}`);
    lines.push("");
    lines.push(`${c.improvements} :`);
    for (const item of correction.improvements) lines.push(`- ${item}`);
  }

  if (correction.advice.length > 0) {
    lines.push("");
    lines.push(`${isAnswerKey ? c.methodAdvice : c.advice} :`);
    correction.advice.forEach((item, index) =>
      lines.push(`${index + 1}. ${item}`),
    );
  }

  lines.push("");
  lines.push(
    (isAnswerKey ? c.footerAnswerKey : c.footer)(
      correction.correctedBy,
      correction.dateLabel,
      correction.maxScore,
    ),
  );
  return lines.join("\n").trim();
}
