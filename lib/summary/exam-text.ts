import type { GeneratedExam } from "@/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  localizeExamType,
  localizeLevel,
  localizePageCount,
  localizeSubject,
} from "@/lib/i18n/labels";

/**
 * Version texte brut d'une épreuve (copie vierge) — alimente le téléchargement
 * `.txt`, la copie et le partage (`ResultActions`). Client-safe (pas de
 * `server-only`). Le contenu des questions suit la langue de génération ; seuls
 * les intitulés sont localisés via `dict`.
 */
export function examToPlainText(exam: GeneratedExam, dict: Dictionary): string {
  const g = dict.generer;
  const lines: string[] = [
    exam.title.toUpperCase(),
    `${localizeSubject(exam.subject, dict)} · ${localizeLevel(exam.level, dict)} · ${exam.theme}`,
    `${localizeExamType(exam.examType, dict)} · ${exam.durationLabel} · ${g.questionCountOption(
      exam.questionCount,
    )} · ${localizePageCount(exam.pageCountLabel, dict)} · ${exam.dateLabel}`,
    `${g.metaName} : ______________________________`,
    "",
  ];

  exam.parts.forEach((part) => {
    lines.push(`${part.title.toUpperCase()} ${g.points(part.points)}`);
    if (part.instructions) lines.push(part.instructions);
    lines.push("");

    part.questions.forEach((question, index) => {
      if (question.kind === "truefalse" && question.statements) {
        question.statements.forEach((statement, sIndex) => {
          lines.push(`${sIndex + 1}. ${statement.text}`);
          lines.push(`   ${g.tfTrue} [ ]   ${g.tfFalse} [ ]`);
        });
      } else {
        lines.push(`${index + 1}. ${question.prompt}  (${question.points} pt)`);
        if (question.choices) {
          for (const choice of question.choices) {
            lines.push(`   ${choice.letter}. ${choice.text}`);
          }
        }
        for (const sub of question.subQuestions ?? []) {
          lines.push(`   - ${sub}`);
        }
      }
      lines.push("");
    });
  });

  lines.push(g.footerScale(exam.totalPoints));
  return lines.join("\n").trim();
}

/**
 * Sérialise une épreuve **avec son corrigé** (bonnes réponses QCM, réponses
 * attendues, valeurs de vérité) pour la passer à l'IA de correction comme
 * `examReferenceText`. Ne dépend pas du dictionnaire (entrée de prompt, jamais
 * affichée) — libellés en français, comme le prompt système.
 */
export function examToReferenceText(exam: GeneratedExam): string {
  const lines: string[] = [
    exam.title,
    `Matière : ${exam.subject} · Niveau : ${exam.level} · Thème : ${exam.theme}`,
    `Barème total : ${exam.totalPoints} points`,
    "",
  ];

  exam.parts.forEach((part) => {
    lines.push(`${part.title} (${part.points} points)`);
    if (part.instructions) lines.push(`Consigne : ${part.instructions}`);

    part.questions.forEach((question, index) => {
      lines.push(`${index + 1}. ${question.prompt}  [${question.points} pt]`);

      if (question.kind === "qcm" && question.choices) {
        for (const choice of question.choices) {
          lines.push(
            `   ${choice.letter}. ${choice.text}${choice.correct ? "  ← bonne réponse" : ""}`,
          );
        }
      }
      if (question.kind === "truefalse" && question.statements) {
        question.statements.forEach((statement, i) => {
          lines.push(
            `   ${i + 1}. ${statement.text} → ${statement.isTrue ? "VRAI" : "FAUX"}`,
          );
        });
      }
      for (const sub of question.subQuestions ?? []) {
        lines.push(`   - ${sub}`);
      }
      if (question.expectedAnswer) {
        lines.push(`   Réponse attendue : ${question.expectedAnswer}`);
      }
      lines.push("");
    });
  });

  return lines.join("\n").trim();
}
