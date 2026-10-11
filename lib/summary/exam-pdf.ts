import type { ExamLanguage, GeneratedExam } from "@/types";
import { formatActivityDate } from "@/lib/utils/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { localizeExamType, localizeLevel, localizeSubject } from "@/lib/i18n/labels";
import {
  PDF_INK as INK,
  PDF_LINE as LINE,
  PDF_MUTED as MUTED,
  PDF_PRIMARY as PRIMARY,
  PDF_PAGE_MARGINS,
  downloadPdf,
  pdfFile,
  type PdfBlock as Block,
} from "./pdf-kit";
import {
  examDocLabels,
  examLanguage,
  layoutExam,
  localizeExamTypeFor,
  subQuestionLetter,
  type ExamDocLabels,
  type LaidOutDocument,
  type LaidOutPart,
  type LaidOutQuestion,
} from "./exam-layout";

/**
 * Génère et télécharge un **vrai fichier PDF** (copie vierge, pagination
 * automatique) de l'épreuve générée — même contenu et même hiérarchie que
 * `ExamResultPanel` : en-tête encadré (établissement, titre, matière, classe,
 * chapitre, durée, barème, date, nom et prénom), consignes générales, parties
 * « PARTIE A — … » avec leurs points, documents à analyser, questions « A.1 »
 * avec leurs points (QCM à cocher, Vrai/Faux, sous-questions a), b)…), espaces
 * de réponse, puis « Total : ___ / 20 », appréciation et signature.
 *
 * `pdfmake` est chargé à la demande via `lib/summary/pdf-kit` (partagé avec
 * `summary-pdf.ts`) : il n'entre jamais dans le bundle initial de `/generer`.
 */

/** Largeur utile d'une page A4 avec les marges `PDF_PAGE_MARGINS`. */
const BODY_WIDTH = 499;
/** Retrait du corps d'une question (sous la colonne du numéro « A.1 »). */
const QUESTION_INDENT = 34;
/** Interligne d'une ligne d'espace réponse. */
const ANSWER_LINE_GAP = 19;

/** Case à cocher vierge (copie non remplie). */
const BOX = "(   )";

const BODY_TEXT = "#33384a";

/**
 * Lignes pointillées d'espace réponse, par paquets de 3 : un canvas ne se coupe
 * pas d'une page à l'autre, de longs espaces (composition, problème) peuvent
 * ainsi continuer sur la page suivante au lieu d'y être rejetés en bloc.
 */
function dottedLines(count: number, width: number): Block {
  const chunks: Block[] = [];
  for (let start = 0; start < count; start += 3) {
    const size = Math.min(3, count - start);
    chunks.push({
      canvas: Array.from({ length: size }, (_, i) => ({
        type: "line",
        x1: 0,
        y1: (i + 1) * ANSWER_LINE_GAP,
        x2: width,
        y2: (i + 1) * ANSWER_LINE_GAP,
        lineWidth: 0.5,
        lineColor: "#9aa0ad",
        dash: { length: 1.2, space: 2.2 },
      })),
    });
  }
  return { stack: chunks, margin: [0, 0, 0, 4] };
}

/** Cadre à une cellule (en-tête, consignes, documents, appréciation). */
function boxed(stack: Block[], options: { fill?: string; lineWidth?: number } = {}): Block {
  const lineWidth = options.lineWidth ?? 0.6;
  return {
    table: { widths: ["*"], body: [[{ stack, fillColor: options.fill }]] },
    layout: {
      hLineWidth: () => lineWidth,
      vLineWidth: () => lineWidth,
      hLineColor: () => (lineWidth > 0.8 ? INK : LINE),
      vLineColor: () => (lineWidth > 0.8 ? INK : LINE),
      paddingLeft: () => 10,
      paddingRight: () => 10,
      paddingTop: () => 7,
      paddingBottom: () => 7,
    },
  };
}

function metaCell(label: string, value: string): Block {
  return {
    text: [
      { text: `${label} : `, bold: true, color: INK },
      { text: value, color: BODY_TEXT },
    ],
    fontSize: 9.5,
    margin: [0, 1.5, 0, 1.5],
  };
}

function headerBlock(
  exam: GeneratedExam,
  labels: ExamDocLabels,
  values: { subject: string; level: string; examType: string },
): Block {
  const meta: [string, string][] = [
    [labels.subject, values.subject],
    [labels.level, values.level],
  ];
  if (exam.theme?.trim()) meta.push([labels.theme, exam.theme.trim()]);
  meta.push(
    [labels.duration, exam.durationLabel],
    [labels.scale, labels.points(exam.totalPoints)],
    [labels.date, exam.dateLabel],
  );
  const metaRows: Block[][] = [];
  for (let i = 0; i < meta.length; i += 2) {
    metaRows.push([
      metaCell(...meta[i]),
      meta[i + 1] ? metaCell(...meta[i + 1]) : { text: "" },
    ]);
  }

  const rows: Block[][] = [];
  if (exam.institution) {
    rows.push([
      {
        text: exam.institution.toUpperCase(),
        alignment: "center",
        bold: true,
        fontSize: 10,
        characterSpacing: 0.6,
        color: INK,
      },
    ]);
  }
  rows.push(
    [
      {
        stack: [
          { text: exam.title.toUpperCase(), style: "title" },
          {
            text: values.examType,
            alignment: "center",
            fontSize: 9.5,
            color: MUTED,
            margin: [0, 2, 0, 0],
          },
        ],
      },
    ],
    [
      {
        table: { widths: ["*", "*"], body: metaRows },
        layout: "noBorders",
      },
    ],
    [
      {
        columns: [
          { text: `${labels.name} :`, bold: true, fontSize: 9.5, color: INK, width: "auto" },
          {
            canvas: [
              { type: "line", x1: 4, y1: 10, x2: 380, y2: 10, lineWidth: 0.6, lineColor: MUTED },
            ],
          },
        ],
        margin: [0, 3, 0, 3],
      },
    ],
  );

  return {
    table: { widths: ["*"], body: rows },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1.4,
      hLineColor: () => INK,
      vLineColor: () => INK,
      paddingLeft: () => 10,
      paddingRight: () => 10,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 12],
  };
}

function documentBlock(doc: LaidOutDocument, labels: ExamDocLabels): Block {
  const stack: Block[] = [
    {
      text: [
        { text: `${labels.document} ${doc.number}`, bold: true },
        ...(doc.title ? [{ text: ` — ${doc.title}`, bold: true }] : []),
      ],
      fontSize: 10,
      color: INK,
      margin: [0, 0, 0, 4],
    },
  ];
  if (doc.content) {
    stack.push({ text: doc.content, fontSize: 9.5, lineHeight: 1.3, color: BODY_TEXT });
  }
  if (doc.table) {
    const width = Math.max(1, doc.table.columns.length);
    stack.push({
      table: {
        headerRows: 1,
        widths: Array.from({ length: width }, () => "*"),
        body: [
          doc.table.columns.map((column) => ({
            text: column,
            bold: true,
            fontSize: 9,
            color: INK,
            fillColor: "#eef0f4",
          })),
          ...doc.table.rows.map((row) =>
            Array.from({ length: width }, (_, i) => ({
              text: row[i] ?? "",
              fontSize: 9,
              color: BODY_TEXT,
            })),
          ),
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#b9bdc8",
        vLineColor: () => "#b9bdc8",
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin: [0, 5, 0, 0],
    });
  }
  if (doc.source) {
    stack.push({
      text: `${labels.source} : ${doc.source}`,
      italics: true,
      fontSize: 8.5,
      color: MUTED,
      margin: [0, 4, 0, 0],
    });
  }
  // Un document de taille raisonnable reste d'un seul tenant (pas de tableau
  // coupé entre deux pages) ; un très long texte peut, lui, se poursuivre.
  const compact =
    (doc.content?.length ?? 0) < 1600 && (doc.table?.rows.length ?? 0) <= 18;
  return {
    ...boxed(stack, { fill: "#f6f7f9" }),
    margin: [0, 2, 0, 10],
    ...(compact ? { unbreakable: true } : {}),
  };
}

function questionBlocks(item: LaidOutQuestion, labels: ExamDocLabels): Block[] {
  const { question } = item;
  const bodyWidth = BODY_WIDTH - QUESTION_INDENT;
  const blocks: Block[] = [
    {
      columns: [
        { text: item.label, width: QUESTION_INDENT, bold: true, fontSize: 10, color: PRIMARY },
        { text: item.prompt, width: "*", fontSize: 10, lineHeight: 1.3, color: INK },
        {
          text: labels.points(question.points),
          width: 52,
          alignment: "right",
          fontSize: 9,
          bold: true,
          color: PRIMARY,
        },
      ],
      columnGap: 6,
      margin: [0, 8, 0, 2],
      headlineLevel: 2,
    },
  ];

  const body: Block[] = [];
  for (const choice of question.choices ?? []) {
    body.push({
      text: `${BOX}   ${choice.letter}. ${choice.text}`,
      fontSize: 9.5,
      lineHeight: 1.25,
      color: BODY_TEXT,
      margin: [0, 1.5, 0, 1.5],
    });
  }
  if (question.kind === "truefalse" && question.statements) {
    body.push({
      table: {
        widths: ["*", 40, 40],
        body: [
          [
            { text: labels.tfStatements, bold: true, fontSize: 9, color: MUTED },
            { text: labels.tfTrue, bold: true, fontSize: 9, color: MUTED, alignment: "center" },
            { text: labels.tfFalse, bold: true, fontSize: 9, color: MUTED, alignment: "center" },
          ],
          ...question.statements.map((statement, i) => [
            { text: `${i + 1}. ${statement.text}`, fontSize: 9.5, color: BODY_TEXT },
            { text: BOX, alignment: "center", fontSize: 9.5 },
            { text: BOX, alignment: "center", fontSize: 9.5 },
          ]),
        ],
      },
      layout: {
        hLineWidth: (i: number) => (i === 0 || i === 1 ? 0.7 : 0.4),
        vLineWidth: () => 0,
        hLineColor: () => LINE,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin: [0, 2, 0, 2],
    });
  }
  item.subQuestions.forEach((sub, i) => {
    body.push({
      columns: [
        { text: `${subQuestionLetter(i)})`, width: 14, bold: true, fontSize: 9.5, color: MUTED },
        { text: sub, width: "*", fontSize: 9.5, lineHeight: 1.25, color: BODY_TEXT },
      ],
      margin: [0, 2, 0, 1],
    });
  });
  if (item.answerLines > 0) {
    body.push(dottedLines(item.answerLines, bodyWidth));
  }

  if (body.length > 0) {
    blocks.push({ stack: body, margin: [QUESTION_INDENT + 6, 0, 0, 0] });
  }
  return blocks;
}

function partBlocks(part: LaidOutPart, labels: ExamDocLabels): Block[] {
  const blocks: Block[] = [
    {
      stack: [
        {
          columns: [
            {
              stack: [
                {
                  text: `${labels.part} ${part.letter}`,
                  fontSize: 8.5,
                  bold: true,
                  characterSpacing: 1.2,
                  color: PRIMARY,
                },
                {
                  text: part.title.toUpperCase(),
                  fontSize: 12,
                  bold: true,
                  color: INK,
                  margin: [0, 1, 0, 0],
                },
              ],
              width: "*",
            },
            {
              text: labels.points(part.points),
              width: 70,
              alignment: "right",
              fontSize: 10,
              bold: true,
              color: INK,
              margin: [0, 10, 0, 0],
            },
          ],
        },
        {
          canvas: [
            { type: "line", x1: 0, y1: 0, x2: BODY_WIDTH, y2: 0, lineWidth: 1.4, lineColor: INK },
          ],
          margin: [0, 4, 0, 0],
        },
      ],
      margin: [0, 18, 0, 4],
      unbreakable: true,
      headlineLevel: 1,
    },
  ];
  if (part.instructions) {
    blocks.push({
      text: part.instructions,
      italics: true,
      fontSize: 9,
      color: MUTED,
      margin: [0, 2, 0, 6],
    });
  }
  for (const doc of part.documents) blocks.push(documentBlock(doc, labels));
  for (const item of part.questions) blocks.push(...questionBlocks(item, labels));
  return blocks;
}

function endBlocks(exam: GeneratedExam, labels: ExamDocLabels): Block[] {
  return [
    {
      stack: [
        {
          canvas: [
            { type: "line", x1: 0, y1: 0, x2: BODY_WIDTH, y2: 0, lineWidth: 1.4, lineColor: INK },
          ],
          margin: [0, 0, 0, 10],
        },
        {
          text: `${labels.total} :  ________ / ${exam.totalPoints}`,
          alignment: "right",
          fontSize: 12,
          bold: true,
          color: INK,
          margin: [0, 0, 0, 10],
        },
        {
          columns: [
            {
              width: "*",
              ...boxed([
                { text: labels.appreciation, bold: true, fontSize: 9.5, color: INK },
                dottedLines(2, 290),
              ]),
            },
            {
              width: 150,
              ...boxed([
                { text: labels.signature, bold: true, fontSize: 9.5, color: INK },
                { text: " ", margin: [0, 0, 0, 34] },
              ]),
            },
          ],
          columnGap: 10,
        },
        {
          text: labels.goodWork,
          alignment: "center",
          fontSize: 9.5,
          bold: true,
          color: MUTED,
          margin: [0, 14, 0, 0],
        },
      ],
      unbreakable: true,
      margin: [0, 22, 0, 0],
    },
  ];
}

function buildContent(
  exam: GeneratedExam,
  dict: Dictionary,
  labels: ExamDocLabels,
): Block[] {
  // Épreuves anciennes (sans langue enregistrée) : valeurs localisées comme avant.
  const legacy = !exam.language;
  const values = {
    subject: legacy ? localizeSubject(exam.subject, dict) : exam.subject,
    level: legacy ? localizeLevel(exam.level, dict) : exam.level,
    examType: legacy
      ? localizeExamType(exam.examType, dict)
      : localizeExamTypeFor(exam.examType, labels),
  };

  const content: Block[] = [headerBlock(exam, labels, values)];

  if (exam.generalInstructions?.length) {
    content.push({
      ...boxed(
        [
          {
            text: labels.generalInstructions.toUpperCase(),
            bold: true,
            fontSize: 9,
            characterSpacing: 0.6,
            color: INK,
            margin: [0, 0, 0, 3],
          },
          {
            // Copie : pdfmake réécrit les éléments de liste EN PLACE (chaînes →
            // objets `{ text, _margin, … }`). Passer le tableau de l'épreuve
            // affichée le corromprait, et React planterait au rendu suivant.
            ul: [...exam.generalInstructions],
            fontSize: 9.5,
            lineHeight: 1.25,
            color: BODY_TEXT,
          },
        ],
        { fill: "#f6f7f9" },
      ),
      margin: [0, 0, 0, 4],
    });
  }

  for (const part of layoutExam(exam)) content.push(...partBlocks(part, labels));
  content.push(...endBlocks(exam, labels));
  return content;
}

function buildExamDoc(
  exam: GeneratedExam,
  dict: Dictionary,
  locale: ExamLanguage,
): Block {
  const language = examLanguage(exam, locale);
  const labels = examDocLabels(language);
  // Pied de page dans la langue de l'épreuve, comme le reste du document.
  const generatedLine = labels.generatedBy(
    exam.generatedBy,
    formatActivityDate(exam.generatedAt, language),
  );

  return {
    info: {
      title: exam.title,
      author: "EduIA",
      subject: exam.theme?.trim() || exam.subject,
    },
    pageSize: "A4",
    pageMargins: PDF_PAGE_MARGINS,
    content: buildContent(exam, dict, labels),
    // Jamais de titre de partie (ni de question) orphelin en bas de page.
    pageBreakBefore: (node: {
      headlineLevel?: number;
      startPosition?: { verticalRatio?: number };
    }) =>
      Boolean(node.headlineLevel) &&
      (node.startPosition?.verticalRatio ?? 0) >
        (node.headlineLevel === 1 ? 0.84 : 0.92),
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
      title: { fontSize: 15, bold: true, alignment: "center", color: INK },
    },
    defaultStyle: { font: "Roboto" },
  };
}

/** Génère et **télécharge** le PDF de l'épreuve affichée. */
export async function downloadExamPdf(
  exam: GeneratedExam,
  dict: Dictionary,
  locale: ExamLanguage,
  fileName: string,
): Promise<void> {
  await downloadPdf(buildExamDoc(exam, dict, locale), fileName);
}

/** Même PDF, renvoyé comme `File` pour le partage natif (`navigator.share`). */
export async function examPdfFile(
  exam: GeneratedExam,
  dict: Dictionary,
  locale: ExamLanguage,
  fileName: string,
): Promise<File> {
  return pdfFile(buildExamDoc(exam, dict, locale), fileName);
}
