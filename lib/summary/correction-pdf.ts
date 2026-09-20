import type { CorrectionQuestion, ExamCorrection } from "@/types";
import { formatActivityDate } from "@/lib/utils/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  localizeLevel,
  localizePageCount,
  localizeSubject,
} from "@/lib/i18n/labels";
import {
  PDF_INK as INK,
  PDF_LINE as LINE,
  PDF_MUTED as MUTED,
  PDF_PRIMARY as PRIMARY,
  PDF_CONTENT_WIDTH,
  PDF_PAGE_MARGINS,
  downloadPdf,
  pdfFile,
  type PdfBlock as Block,
} from "./pdf-kit";

type PdfLocale = "fr" | "en";

/**
 * Génère un **vrai fichier PDF** structuré (pagination automatique) du rapport de
 * correction affiché — même contenu et même hiérarchie que `CorrectionReportPanel` :
 * titre, grille d'informations, note globale (mode `graded`), corrigé question par
 * question (réponse de l'élève, correction attendue, explication), points forts /
 * à travailler, conseils.
 *
 * Deux mises en page selon `correction.mode` :
 *  - `graded` : copie notée (note, verdicts, « ta réponse ») ;
 *  - `answer-key` : corrigé type d'une épreuve (pas de note ni de « ta réponse »).
 *
 * `pdfmake` est chargé à la demande via `lib/summary/pdf-kit` (partagé avec
 * `summary-pdf.ts` / `exam-pdf.ts`) : il n'entre jamais dans le bundle initial de
 * `/corriger`.
 */

const VERDICT_COLOR: Record<CorrectionQuestion["verdict"], string> = {
  correct: "#15803d",
  partial: "#b45309",
  incorrect: "#b91c1c",
};

function metaGrid(items: { label: string; value: string }[]): Block {
  const rows: Block[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([metaCell(items[i]), metaCell(items[i + 1])]);
  }
  return {
    table: { widths: ["*", "*"], body: rows },
    layout: "noBorders",
    margin: [0, 4, 0, 0],
  };
}

function metaCell(item: { label: string; value: string } | undefined): Block {
  if (!item) return { text: "" };
  return {
    text: [
      { text: `${item.label} : `, bold: true, color: INK },
      { text: item.value, color: MUTED },
    ],
    fontSize: 9,
    margin: [0, 1.5, 0, 1.5],
  };
}

function rule(width: number, color: string): Block {
  return {
    canvas: [
      { type: "line", x1: 0, y1: 0, x2: PDF_CONTENT_WIDTH, y2: 0, lineWidth: width, lineColor: color },
    ],
    margin: [0, width >= 1 ? 5 : 8, 0, width >= 1 ? 8 : 6],
  };
}

function questionBlocks(
  question: CorrectionQuestion,
  n: number,
  dict: Dictionary,
  isAnswerKey: boolean,
): Block[] {
  const c = dict.corriger;
  const blocks: Block[] = [
    { text: `${n}.  ${question.prompt}`, style: "question" },
  ];

  if (!isAnswerKey) {
    blocks.push({
      text: [
        { text: `${c.yourAnswer} : `, bold: true, color: INK },
        { text: question.studentAnswer || "—", color: "#33384a" },
      ],
      style: "answer",
    });
  }

  blocks.push({
    text: [
      { text: `${c.expectedAnswer} : `, bold: true, color: PRIMARY },
      { text: question.expectedAnswer, color: "#33384a" },
    ],
    style: "answer",
  });

  if (question.feedback) {
    blocks.push({
      text: [
        { text: `${c.explanation} `, bold: true, color: INK },
        { text: question.feedback, color: "#33384a" },
      ],
      style: "answer",
    });
  }

  blocks.push({
    text: isAnswerKey
      ? c.ptMax(question.pointsMax)
      : `${dict.activity.verdicts[question.verdict]}  ·  ${c.ptShort(
          question.pointsEarned,
          question.pointsMax,
        )}`,
    fontSize: 8.5,
    bold: true,
    color: isAnswerKey ? MUTED : VERDICT_COLOR[question.verdict],
    margin: [0, 1, 0, 8],
  });

  return blocks;
}

function listBlock(title: string, items: string[], ordered: boolean): Block[] {
  if (items.length === 0) return [];
  return [
    { text: title.toUpperCase(), style: "blockTitle" },
    ordered
      ? { ol: items.map((item) => item), style: "answer", margin: [0, 2, 0, 0] }
      : { ul: items.map((item) => item), style: "answer", margin: [0, 2, 0, 0] },
  ];
}

function buildContent(
  correction: ExamCorrection,
  dict: Dictionary,
): Block[] {
  const c = dict.corriger;
  const isAnswerKey = correction.mode === "answer-key";

  const content: Block[] = [
    { text: (correction.examTitle || c.docTitle).toUpperCase(), style: "title" },
    { text: c.docTitle, alignment: "center", fontSize: 9, color: MUTED, margin: [0, 2, 0, 0] },
    rule(1.2, INK),
  ];

  const meta: { label: string; value: string }[] = [
    { label: c.metaLevel, value: localizeLevel(correction.level, dict) },
    { label: c.metaSubject, value: localizeSubject(correction.subject, dict) },
  ];
  if (correction.theme?.trim()) {
    meta.push({ label: c.metaTheme, value: correction.theme.trim() });
  }
  meta.push(
    { label: c.metaDate, value: correction.dateLabel },
    {
      label: c.metaLength,
      value: localizePageCount(correction.pageCountLabel, dict),
    },
  );
  if (!isAnswerKey) {
    meta.push({
      label: c.scoreAria,
      value: `${correction.score} / ${correction.maxScore}${
        correction.appreciation ? `  —  ${correction.appreciation}` : ""
      }`,
    });
  }
  content.push(metaGrid(meta));
  content.push(rule(0.5, LINE));

  if (correction.summary) {
    content.push({ text: correction.summary, style: "summary" });
  }

  content.push({
    text: (isAnswerKey ? c.answerKeyByQuestion : c.detailByQuestion).toUpperCase(),
    style: "partTitle",
  });
  correction.questions.forEach((question, index) => {
    content.push(...questionBlocks(question, index + 1, dict, isAnswerKey));
  });

  if (!isAnswerKey) {
    content.push(...listBlock(c.strengths, correction.strengths, false));
    content.push(...listBlock(c.improvements, correction.improvements, false));
  }
  content.push(
    ...listBlock(
      isAnswerKey ? c.methodAdvice : c.advice,
      correction.advice,
      true,
    ),
  );

  return content;
}

function buildCorrectionDoc(
  correction: ExamCorrection,
  dict: Dictionary,
  locale: PdfLocale,
): Block {
  const isAnswerKey = correction.mode === "answer-key";
  const generatedLine = (
    isAnswerKey ? dict.corriger.footerAnswerKey : dict.corriger.footer
  )(
    correction.correctedBy,
    formatActivityDate(correction.correctedAt, locale),
    correction.maxScore,
  );

  return {
    info: {
      title: `${dict.corriger.docTitle} — ${correction.examTitle}`,
      author: "EduIA",
      subject: correction.theme?.trim() || localizeSubject(correction.subject, dict),
    },
    pageSize: "A4",
    pageMargins: PDF_PAGE_MARGINS,
    content: buildContent(correction, dict),
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: generatedLine, alignment: "left", fontSize: 7.5, color: MUTED },
        {
          text: `${currentPage} / ${pageCount}`,
          alignment: "right",
          fontSize: 7.5,
          color: MUTED,
        },
      ],
      margin: [48, 20, 48, 0],
    }),
    styles: {
      title: { fontSize: 16, bold: true, alignment: "center", color: INK },
      partTitle: {
        fontSize: 11,
        bold: true,
        color: PRIMARY,
        margin: [0, 16, 0, 6],
      },
      blockTitle: {
        fontSize: 11,
        bold: true,
        color: PRIMARY,
        margin: [0, 14, 0, 5],
      },
      summary: {
        fontSize: 10,
        italics: true,
        lineHeight: 1.35,
        color: "#33384a",
        margin: [0, 4, 0, 2],
      },
      question: {
        fontSize: 10,
        bold: true,
        lineHeight: 1.35,
        color: INK,
        margin: [0, 8, 0, 3],
      },
      answer: {
        fontSize: 9.5,
        lineHeight: 1.35,
        color: "#33384a",
        margin: [0, 0, 0, 3],
      },
    },
    defaultStyle: { font: "Roboto" },
  };
}

/** Génère et **télécharge** le PDF du rapport de correction affiché. */
export async function downloadCorrectionPdf(
  correction: ExamCorrection,
  dict: Dictionary,
  locale: PdfLocale,
  fileName: string,
): Promise<void> {
  await downloadPdf(buildCorrectionDoc(correction, dict, locale), fileName);
}

/** Même PDF, renvoyé comme `File` pour le partage natif (`navigator.share`). */
export async function correctionPdfFile(
  correction: ExamCorrection,
  dict: Dictionary,
  locale: PdfLocale,
  fileName: string,
): Promise<File> {
  return pdfFile(buildCorrectionDoc(correction, dict, locale), fileName);
}
