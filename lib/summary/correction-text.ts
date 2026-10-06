import type { ExamCorrection } from "@/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  localizeLevel,
  localizePageCount,
  localizeSubject,
} from "@/lib/i18n/labels";

/**
 * Version texte brut d'une correction — alimente le téléchargement `.txt`, la
 * copie et le partage (`ResultActions`). Client-safe. Même plan que le
 * document affiché et le PDF : en-tête (matière, niveau, barème…), puis
 * QUESTION par QUESTION (énoncé, réponse correcte, démarche, explication),
 * TOTAL, points à retenir et conseils. Le contenu suit la langue de
 * génération ; les intitulés sont localisés.
 */
export function correctionToPlainText(
  correction: ExamCorrection,
  dict: Dictionary,
  locale: "fr" | "en" = "fr",
): string {
  const c = dict.corriger;
  const verdicts = dict.activity.verdicts;
  const isAnswerKey = correction.mode === "answer-key";
  const sep = locale === "en" ? ": " : " : ";
  const number = (value: number) =>
    value.toLocaleString(locale === "en" ? "en-GB" : "fr-FR", {
      maximumFractionDigits: 2,
    });

  const lines: string[] = [c.docTitle.toUpperCase(), correction.examTitle, ""];

  const meta: [string, string][] = [
    [c.metaSubject, localizeSubject(correction.subject, dict)],
    [c.metaLevel, correction.level ? localizeLevel(correction.level, dict) : ""],
    [c.metaTheme, correction.theme],
    [
      c.metaScale,
      correction.pointsSource === "exam"
        ? c.scaleFromExam(number(correction.maxScore))
        : correction.pointsSource === "proposed"
          ? c.scaleProposed(number(correction.maxScore))
          : "",
    ],
    [
      c.metaSource,
      correction.examSource === "external"
        ? c.sourceExternal
        : correction.examSource === "eduia"
          ? c.sourceEduiaLabel
          : "",
    ],
    [c.metaDate, correction.dateLabel],
    [c.metaLength, localizePageCount(correction.pageCountLabel, dict)],
  ];
  for (const [label, value] of meta) {
    if (value.trim()) lines.push(`${label}${sep}${value}`);
  }

  if (correction.notice) lines.push("", correction.notice);
  if (!isAnswerKey) {
    lines.push(
      "",
      `${c.scoreAria}${sep}${number(correction.score)} / ${number(correction.maxScore)}${
        correction.appreciation ? ` — ${correction.appreciation}` : ""
      }`,
    );
  }
  if (correction.summary) lines.push("", correction.summary);

  lines.push(
    "",
    (isAnswerKey ? c.answerKeyByQuestion : c.detailByQuestion).toUpperCase(),
  );

  correction.questions.forEach((question, index) => {
    const points = isAnswerKey
      ? c.ptMax(question.pointsMax)
      : `${c.ptShort(question.pointsEarned, question.pointsMax)} · ${verdicts[question.verdict]}`;
    lines.push(
      "",
      `${c.questionLabel(index + 1).toUpperCase()}${question.ref ? ` · ${question.ref}` : ""}  (${points})`,
      `${c.statementLabel}${sep}${question.prompt}`,
    );
    if (!isAnswerKey) {
      lines.push(`${c.yourAnswer}${sep}${question.studentAnswer || "—"}`);
    }
    lines.push(`${c.expectedAnswer}${sep}${question.expectedAnswer}`);
    const steps = question.steps ?? [];
    if (steps.length > 0) {
      lines.push(`${c.stepsLabel}${sep}`);
      for (const step of steps) lines.push(`  - ${step.label}${sep}${step.content}`);
    }
    if (question.feedback) {
      lines.push(`${c.explanationLabel}${sep}${question.feedback}`);
    }
  });

  lines.push(
    "",
    isAnswerKey
      ? `${c.totalAnswerKey.toUpperCase()}${sep}${c.ptMax(correction.maxScore)}`
      : `${c.totalLabel.toUpperCase()}${sep}${number(correction.score)} / ${number(correction.maxScore)}`,
  );

  const keyPoints = correction.keyPoints ?? [];
  if (keyPoints.length > 0) {
    lines.push("", c.keyPoints.toUpperCase());
    for (const item of keyPoints) lines.push(`- ${item}`);
  }

  if (!isAnswerKey) {
    if (correction.strengths.length > 0) {
      lines.push("", c.strengths.toUpperCase());
      for (const item of correction.strengths) lines.push(`- ${item}`);
    }
    if (correction.improvements.length > 0) {
      lines.push("", c.improvements.toUpperCase());
      for (const item of correction.improvements) lines.push(`- ${item}`);
    }
  }

  if (correction.advice.length > 0) {
    lines.push("", (isAnswerKey ? c.methodAdvice : c.advice).toUpperCase());
    correction.advice.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
  }

  lines.push(
    "",
    (isAnswerKey ? c.footerAnswerKey : c.footer)(
      correction.correctedBy,
      correction.dateLabel,
      correction.maxScore,
    ),
  );
  return lines.join("\n").trim();
}
