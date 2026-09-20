import type { ExamPart, ExamQuestion, GeneratedExam } from "@/types";
import { formatActivityDate } from "@/lib/utils/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  localizeExamType,
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
 * Génère et télécharge un **vrai fichier PDF** (copie vierge, pagination
 * automatique) de l'épreuve générée — même contenu et même hiérarchie que
 * `ExamResultPanel` : titre, grille d'informations, parties (« PARTIE 1 : QCM »),
 * questions numérotées (QCM à cocher, questions ouvertes + sous-questions,
 * tableau Vrai / Faux), pied « Bon travail ! » + barème.
 *
 * `pdfmake` est chargé à la demande via `lib/summary/pdf-kit` (partagé avec
 * `summary-pdf.ts`) : il n'entre jamais dans le bundle initial de `/generer`.
 */

/** Case à cocher vierge (copie non remplie). */
const BOX = "(   )";

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

function questionBlocks(
  question: ExamQuestion,
  n: number,
  dict: Dictionary,
): Block[] {
  const g = dict.generer;

  if (question.kind === "qcm") {
    const blocks: Block[] = [
      { text: `${n}.  ${question.prompt}`, style: "question" },
    ];
    for (const choice of question.choices ?? []) {
      blocks.push({
        text: `${BOX}   ${choice.letter}. ${choice.text}`,
        style: "choice",
      });
    }
    return blocks;
  }

  // Question ouverte
  const blocks: Block[] = [
    {
      columns: [
        { text: `${n}.  ${question.prompt}`, style: "question" },
        {
          text: g.points(question.points),
          alignment: "right",
          width: 70,
          fontSize: 9,
          bold: true,
          color: PRIMARY,
        },
      ],
      columnGap: 8,
    },
  ];
  if (question.subQuestions && question.subQuestions.length > 0) {
    blocks.push({
      ol: question.subQuestions.map((sub) => sub),
      style: "subQuestion",
      margin: [14, 2, 0, 0],
    });
  }
  return blocks;
}

function trueFalseTable(question: ExamQuestion, dict: Dictionary): Block {
  const g = dict.generer;
  const header = [
    { text: g.tfStatements, bold: true, fontSize: 9, color: MUTED },
    { text: g.tfTrue, bold: true, fontSize: 9, color: MUTED, alignment: "center" },
    { text: g.tfFalse, bold: true, fontSize: 9, color: MUTED, alignment: "center" },
  ];
  const body = [
    header,
    ...(question.statements ?? []).map((statement, i) => [
      { text: `${i + 1}. ${statement.text}`, fontSize: 10, color: "#33384a" },
      { text: BOX, alignment: "center", fontSize: 10 },
      { text: BOX, alignment: "center", fontSize: 10 },
    ]),
  ];
  return {
    table: { widths: ["*", 42, 42], body },
    layout: {
      hLineWidth: (i: number) => (i === 0 || i === 1 ? 0.7 : 0.4),
      vLineWidth: () => 0,
      hLineColor: () => LINE,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
    margin: [0, 2, 0, 4],
  };
}

function partBlocks(part: ExamPart, dict: Dictionary): Block[] {
  const g = dict.generer;
  const blocks: Block[] = [
    {
      text: `${part.title.toUpperCase()}  ${g.points(part.points)}`,
      style: "partTitle",
    },
  ];
  if (part.instructions) {
    blocks.push({ text: part.instructions, style: "instructions" });
  }

  part.questions.forEach((question, i) => {
    if (question.kind === "truefalse") {
      blocks.push(trueFalseTable(question, dict));
      return;
    }
    // Numérotation par partie, en sautant les blocs Vrai/Faux (comme le panneau).
    const n =
      part.questions.slice(0, i).filter((q) => q.kind !== "truefalse").length + 1;
    blocks.push(...questionBlocks(question, n, dict));
  });

  return blocks;
}

function buildContent(exam: GeneratedExam, dict: Dictionary): Block[] {
  const t = dict.generer;

  const content: Block[] = [
    { text: exam.title.toUpperCase(), style: "title" },
    {
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: PDF_CONTENT_WIDTH,
          y2: 0,
          lineWidth: 1.2,
          lineColor: INK,
        },
      ],
      margin: [0, 5, 0, 8],
    },
  ];

  const meta: { label: string; value: string }[] = [
    { label: t.metaLevel, value: localizeLevel(exam.level, dict) },
    { label: t.metaDuration, value: exam.durationLabel },
    { label: t.metaSubject, value: localizeSubject(exam.subject, dict) },
    { label: t.metaQuestionCount, value: String(exam.questionCount) },
  ];
  if (exam.theme?.trim()) {
    meta.push({ label: t.metaTheme, value: exam.theme.trim() });
  }
  meta.push(
    { label: t.metaLength, value: localizePageCount(exam.pageCountLabel, dict) },
    { label: t.metaExamType, value: localizeExamType(exam.examType, dict) },
    { label: t.metaDate, value: exam.dateLabel },
    { label: t.metaName, value: "______________________________" },
  );
  content.push(metaGrid(meta));

  content.push({
    canvas: [
      {
        type: "line",
        x1: 0,
        y1: 0,
        x2: PDF_CONTENT_WIDTH,
        y2: 0,
        lineWidth: 0.5,
        lineColor: LINE,
      },
    ],
    margin: [0, 8, 0, 6],
  });

  for (const part of exam.parts) {
    content.push(...partBlocks(part, dict));
  }

  content.push({
    text: `${t.footerGoodWork}   ·   ${t.footerScale(exam.totalPoints)}`,
    alignment: "center",
    fontSize: 9,
    bold: true,
    color: MUTED,
    margin: [0, 16, 0, 0],
  });

  return content;
}

function buildExamDoc(
  exam: GeneratedExam,
  dict: Dictionary,
  locale: PdfLocale,
): Block {
  const generatedLine = dict.generer.footerBy(
    exam.generatedBy,
    formatActivityDate(exam.generatedAt, locale),
  );

  return {
    info: {
      title: exam.title,
      author: "EduIA",
      subject: exam.theme?.trim() || localizeSubject(exam.subject, dict),
    },
    pageSize: "A4",
    pageMargins: PDF_PAGE_MARGINS,
    content: buildContent(exam, dict),
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
        margin: [0, 16, 0, 3],
      },
      instructions: {
        fontSize: 9,
        italics: true,
        color: MUTED,
        margin: [0, 0, 0, 4],
      },
      question: {
        fontSize: 10,
        lineHeight: 1.35,
        color: "#33384a",
        margin: [0, 6, 0, 2],
      },
      choice: {
        fontSize: 9.5,
        lineHeight: 1.3,
        color: "#33384a",
        margin: [14, 1, 0, 1],
      },
      subQuestion: { fontSize: 9.5, lineHeight: 1.3, color: "#33384a" },
    },
    defaultStyle: { font: "Roboto" },
  };
}

/** Génère et **télécharge** le PDF de l'épreuve affichée. */
export async function downloadExamPdf(
  exam: GeneratedExam,
  dict: Dictionary,
  locale: PdfLocale,
  fileName: string,
): Promise<void> {
  await downloadPdf(buildExamDoc(exam, dict, locale), fileName);
}

/** Même PDF, renvoyé comme `File` pour le partage natif (`navigator.share`). */
export async function examPdfFile(
  exam: GeneratedExam,
  dict: Dictionary,
  locale: PdfLocale,
  fileName: string,
): Promise<File> {
  return pdfFile(buildExamDoc(exam, dict, locale), fileName);
}
