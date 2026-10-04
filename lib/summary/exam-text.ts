import type { ExamDocumentTable, ExamLanguage, GeneratedExam } from "@/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { localizeExamType, localizeLevel, localizeSubject } from "@/lib/i18n/labels";
import {
  examDocLabels,
  examLanguage,
  layoutExam,
  localizeExamTypeFor,
  subQuestionLetter,
  type LaidOutDocument,
} from "./exam-layout";

function tableToText(table: ExamDocumentTable, indent = ""): string[] {
  return [
    `${indent}| ${table.columns.join(" | ")} |`,
    ...table.rows.map((row) => `${indent}| ${row.join(" | ")} |`),
  ];
}

function documentToText(doc: LaidOutDocument, label: string): string[] {
  const lines = [`${label} ${doc.number}${doc.title ? ` — ${doc.title}` : ""}`];
  if (doc.content) lines.push(doc.content);
  if (doc.table) lines.push(...tableToText(doc.table));
  if (doc.source) lines.push(`(${doc.source})`);
  lines.push("");
  return lines;
}

/**
 * Version texte brut d'une épreuve (copie vierge) — alimente le téléchargement
 * `.txt`, la copie et le partage (`ResultActions`). Client-safe (pas de
 * `server-only`). Même structure que l'affichage : en-tête, consignes générales,
 * parties A/B/C/D, questions A.1…, total / appréciation / signature. Intitulés
 * dans la langue de l'épreuve (`locale` : repli pour les épreuves anciennes).
 */
export function examToPlainText(
  exam: GeneratedExam,
  dict: Dictionary,
  locale: ExamLanguage,
): string {
  const language = examLanguage(exam, locale);
  const l = examDocLabels(language);
  // Épreuves anciennes (sans langue) : valeurs localisées comme avant.
  const legacy = !exam.language;
  const subject = legacy ? localizeSubject(exam.subject, dict) : exam.subject;
  const level = legacy ? localizeLevel(exam.level, dict) : exam.level;
  const examType = legacy
    ? localizeExamType(exam.examType, dict)
    : localizeExamTypeFor(exam.examType, l);

  const lines: string[] = [];
  if (exam.institution) lines.push(`${l.institution} : ${exam.institution}`);
  lines.push(
    exam.title.toUpperCase(),
    examType,
    [
      `${l.subject} : ${subject}`,
      `${l.level} : ${level}`,
      exam.theme?.trim() ? `${l.theme} : ${exam.theme.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    `${l.duration} : ${exam.durationLabel} · ${l.scale} : ${l.points(exam.totalPoints)}`,
    `${l.name} : ______________________________   ${l.date} : ${exam.dateLabel}`,
    "",
  );

  if (exam.generalInstructions?.length) {
    lines.push(`${l.generalInstructions} :`);
    for (const instruction of exam.generalInstructions) lines.push(`- ${instruction}`);
    lines.push("");
  }

  for (const part of layoutExam(exam)) {
    lines.push(
      `${l.part} ${part.letter} — ${part.title.toUpperCase()} (${l.points(part.points)})`,
    );
    if (part.instructions) lines.push(part.instructions);
    lines.push("");

    for (const doc of part.documents) lines.push(...documentToText(doc, l.document));

    for (const item of part.questions) {
      const { question } = item;
      lines.push(`${item.label}  ${item.prompt}  (${l.points(question.points)})`);
      for (const choice of question.choices ?? []) {
        lines.push(`   [ ] ${choice.letter}. ${choice.text}`);
      }
      item.subQuestions.forEach((sub, i) => {
        lines.push(`   ${subQuestionLetter(i)}) ${sub}`);
      });
      (question.statements ?? []).forEach((statement, i) => {
        lines.push(`   ${i + 1}. ${statement.text}   ${l.tfTrue} [ ]  ${l.tfFalse} [ ]`);
      });
      for (let i = 0; i < Math.min(item.answerLines, 6); i += 1) {
        lines.push("   ......................................................................");
      }
      lines.push("");
    }
  }

  lines.push(
    `${l.total} : ______ / ${exam.totalPoints}`,
    `${l.appreciation} : ________________________________________________`,
    `${l.signature} : ____________________`,
  );
  return lines.join("\n").trim();
}

/**
 * Sérialise une épreuve **avec son corrigé** (bonnes réponses QCM, réponses
 * attendues, valeurs de vérité, documents à analyser) pour la passer à l'IA de
 * correction comme `examReferenceText`. Ne dépend pas du dictionnaire (entrée de
 * prompt, jamais affichée) — libellés en français, comme le prompt système.
 * Les questions sont repérées « A.1 », « B.2 »… comme sur la copie de l'élève.
 */
export function examToReferenceText(exam: GeneratedExam): string {
  const lines: string[] = [
    exam.title,
    `Matière : ${exam.subject} · Niveau : ${exam.level} · Thème : ${exam.theme}`,
    `Barème total : ${exam.totalPoints} points`,
    "",
  ];

  for (const part of layoutExam(exam)) {
    lines.push(`PARTIE ${part.letter} — ${part.title} (${part.points} points)`);
    if (part.instructions) lines.push(`Consigne : ${part.instructions}`);
    for (const doc of part.documents) lines.push(...documentToText(doc, "Document"));

    for (const item of part.questions) {
      const { question } = item;
      lines.push(`${item.label} ${item.prompt}  [${question.points} pt]`);

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
      item.subQuestions.forEach((sub, i) => {
        lines.push(`   ${subQuestionLetter(i)}) ${sub}`);
      });
      if (question.expectedAnswer) {
        lines.push(`   Réponse attendue : ${question.expectedAnswer}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n").trim();
}
