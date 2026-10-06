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
 * Génère un **vrai fichier PDF** structuré (pagination automatique) de la
 * correction affichée — même plan que `CorrectionReportPanel` :
 *  - en-tête : CORRECTION DE L'ÉPREUVE, titre, matière, niveau, thème, barème,
 *    origine de l'épreuve, date (+ note obtenue pour une copie notée) ;
 *  - QUESTION par QUESTION : énoncé, réponse de l'élève (copie notée), réponse
 *    correcte, démarche détaillée (formules, calculs…), explication, points ;
 *  - TOTAL, points à retenir, points forts / à travailler, conseils.
 *
 * `pdfmake` est chargé à la demande via `lib/summary/pdf-kit` (partagé avec
 * `summary-pdf.ts` / `exam-pdf.ts`) : il n'entre jamais dans le bundle initial de
 * `/corriger`.
 */

const BODY = "#33384a";
const SUCCESS = "#15803d";
const SUCCESS_FILL = "#f0faf3";
const WARNING = "#b45309";

const VERDICT_COLOR: Record<CorrectionQuestion["verdict"], string> = {
  correct: SUCCESS,
  partial: WARNING,
  incorrect: "#b91c1c",
};

/**
 * La police Roboto embarquée par pdfmake n'a pas les flèches ni les symboles
 * d'ensembles : ils s'afficheraient en carrés vides. On les remplace par un
 * équivalent lisible (exposants, √, ≤, ×, π, Δ… sont, eux, bien présents).
 */
const PDF_SYMBOLS: Record<PdfLocale, [RegExp, string][]> = {
  fr: [
    [/[⟹⇒]/g, "=>"],
    [/⇔/g, "<=>"],
    [/↔/g, "<->"],
    [/→/g, "->"],
    [/←/g, "<-"],
    [/∉/g, " n'appartient pas à "],
    [/∈/g, " appartient à "],
    [/⊂/g, " inclus dans "],
    [/∪/g, " union "],
    [/∩/g, " inter "],
    [/∅/g, "Ø"],
    [/∀/g, "pour tout "],
    [/∃/g, "il existe "],
    [/∛/g, "racine cubique de "],
    [/✓/g, "(juste)"],
    [/✗/g, "(faux)"],
  ],
  en: [
    [/[⟹⇒]/g, "=>"],
    [/⇔/g, "<=>"],
    [/↔/g, "<->"],
    [/→/g, "->"],
    [/←/g, "<-"],
    [/∉/g, " not in "],
    [/∈/g, " in "],
    [/⊂/g, " subset of "],
    [/∪/g, " union "],
    [/∩/g, " intersect "],
    [/∅/g, "Ø"],
    [/∀/g, "for all "],
    [/∃/g, "there exists "],
    [/∛/g, "cube root of "],
    [/✓/g, "(correct)"],
    [/✗/g, "(wrong)"],
  ],
};
const PDF_SETS: [RegExp, string][] = [
  [/ℝ/g, "R"],
  [/ℕ/g, "N"],
  [/ℤ/g, "Z"],
  [/ℚ/g, "Q"],
];

function makeSafe(locale: PdfLocale) {
  return (text: string) =>
    [...PDF_SYMBOLS[locale], ...PDF_SETS]
      .reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text)
      .replace(/ {2,}/g, " ");
}

function metaGrid(items: { label: string; value: string }[], sep: string): Block {
  const rows: Block[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([metaCell(items[i], sep), metaCell(items[i + 1], sep)]);
  }
  return {
    table: { widths: ["*", "*"], body: rows },
    layout: "noBorders",
    margin: [0, 4, 0, 0],
  };
}

function metaCell(item: { label: string; value: string } | undefined, sep: string): Block {
  if (!item) return { text: "" };
  return {
    text: [
      { text: `${item.label}${sep}`, bold: true, color: INK },
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

function label(text: string, color = MUTED): Block {
  return { text: text.toUpperCase(), fontSize: 7.5, bold: true, color, characterSpacing: 0.4, margin: [0, 5, 0, 1.5] };
}

interface Ctx {
  dict: Dictionary;
  isAnswerKey: boolean;
  safe: (text: string) => string;
  sep: string;
}

function questionBlocks(question: CorrectionQuestion, n: number, ctx: Ctx): Block[] {
  const { dict, isAnswerKey, safe } = ctx;
  const c = dict.corriger;

  const points = isAnswerKey
    ? c.ptMax(question.pointsMax)
    : `${dict.activity.verdicts[question.verdict]}  ·  ${c.ptShort(
        question.pointsEarned,
        question.pointsMax,
      )}`;

  const blocks: Block[] = [
    {
      // En-tête + énoncé jamais séparés par un saut de page.
      unbreakable: true,
      stack: [
        {
          columns: [
            {
              width: "*",
              text: [
                { text: c.questionLabel(n).toUpperCase(), bold: true, color: INK },
                ...(question.ref ? [{ text: `  ·  ${safe(question.ref)}`, color: MUTED }] : []),
              ],
              fontSize: 10.5,
            },
            {
              width: "auto",
              text: points,
              noWrap: true,
              fontSize: 8.5,
              bold: true,
              color: isAnswerKey ? MUTED : VERDICT_COLOR[question.verdict],
              margin: [8, 1.5, 0, 0],
            },
          ],
          margin: [0, 12, 0, 0],
        },
        label(c.statementLabel),
        { text: safe(question.prompt), style: "statement" },
      ],
    },
  ];

  if (!isAnswerKey) {
    blocks.push(label(c.yourAnswer), {
      text: safe(question.studentAnswer || "—"),
      style: "body",
    });
  }

  blocks.push({
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack: [
              { text: c.expectedAnswer.toUpperCase(), fontSize: 7.5, bold: true, color: SUCCESS, characterSpacing: 0.4 },
              { text: safe(question.expectedAnswer), fontSize: 9.5, bold: true, color: INK, lineHeight: 1.3, margin: [0, 2, 0, 0] },
            ],
            fillColor: SUCCESS_FILL,
            margin: [7, 5, 7, 5],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      hLineColor: () => "#bfe5cb",
      vLineColor: () => "#bfe5cb",
    },
    margin: [0, 6, 0, 0],
  });

  const steps = question.steps ?? [];
  if (steps.length > 0) {
    blocks.push(label(c.stepsLabel), {
      stack: steps.map((step) => ({
        // Intitulé et contenu d'une étape jamais séparés par un saut de page.
        unbreakable: true,
        stack: [
          { text: safe(step.label), fontSize: 8.5, bold: true, color: PRIMARY },
          { text: safe(step.content), style: "body", margin: [0, 1, 0, 0] },
        ],
        margin: [0, 2, 0, 3],
      })),
      margin: [10, 0, 0, 0],
    });
  }

  if (question.feedback) {
    blocks.push(label(c.explanationLabel), { text: safe(question.feedback), style: "body" });
  }

  blocks.push(rule(0.5, LINE));
  return blocks;
}

function listBlock(
  title: string,
  items: string[],
  ordered: boolean,
  safe: (text: string) => string,
): Block[] {
  if (items.length === 0) return [];
  const list = items.map(safe);
  return [
    { text: title.toUpperCase(), style: "blockTitle" },
    ordered
      ? { ol: list, style: "body", margin: [0, 2, 0, 0] }
      : { ul: list, style: "body", margin: [0, 2, 0, 0] },
  ];
}

function buildContent(correction: ExamCorrection, dict: Dictionary, locale: PdfLocale): Block[] {
  const c = dict.corriger;
  const isAnswerKey = correction.mode === "answer-key";
  const safe = makeSafe(locale);
  const sep = locale === "en" ? ": " : " : ";
  const number = (value: number) =>
    value.toLocaleString(locale === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 2 });
  const ctx: Ctx = { dict, isAnswerKey, safe, sep };

  const content: Block[] = [
    { text: c.docTitle.toUpperCase(), style: "title" },
    {
      text: safe(correction.examTitle),
      alignment: "center",
      fontSize: 10,
      bold: true,
      color: MUTED,
      margin: [0, 3, 0, 0],
    },
    rule(1.2, INK),
  ];

  const meta: { label: string; value: string }[] = [
    { label: c.metaSubject, value: localizeSubject(correction.subject, dict) },
    { label: c.metaLevel, value: correction.level ? localizeLevel(correction.level, dict) : "" },
    { label: c.metaTheme, value: safe(correction.theme ?? "") },
    {
      label: c.metaScale,
      value:
        correction.pointsSource === "exam"
          ? c.scaleFromExam(number(correction.maxScore))
          : correction.pointsSource === "proposed"
            ? c.scaleProposed(number(correction.maxScore))
            : "",
    },
    {
      label: c.metaSource,
      value:
        correction.examSource === "external"
          ? c.sourceExternal
          : correction.examSource === "eduia"
            ? c.sourceEduiaLabel
            : "",
    },
    { label: c.metaDate, value: correction.dateLabel },
    { label: c.metaLength, value: localizePageCount(correction.pageCountLabel, dict) },
  ];
  if (!isAnswerKey) {
    meta.push({
      label: c.scoreAria,
      value: `${number(correction.score)} / ${number(correction.maxScore)}${
        correction.appreciation ? `  —  ${safe(correction.appreciation)}` : ""
      }`,
    });
  }
  content.push(metaGrid(meta.filter((item) => item.value.trim().length > 0), sep));
  content.push(rule(0.5, LINE));

  if (correction.notice) {
    content.push({ text: safe(correction.notice), fontSize: 9, italics: true, color: WARNING, margin: [0, 0, 0, 6] });
  }
  if (correction.summary) {
    content.push({ text: safe(correction.summary), style: "summary" });
  }

  content.push({
    text: (isAnswerKey ? c.answerKeyByQuestion : c.detailByQuestion).toUpperCase(),
    style: "partTitle",
  });
  correction.questions.forEach((question, index) => {
    content.push(...questionBlocks(question, index + 1, ctx));
  });

  content.push({
    table: {
      widths: ["*", "auto"],
      body: [
        [
          {
            text: (isAnswerKey ? c.totalAnswerKey : c.totalLabel).toUpperCase(),
            bold: true,
            fontSize: 11,
            color: INK,
            margin: [6, 5, 0, 5],
          },
          {
            text: isAnswerKey
              ? c.ptMax(correction.maxScore)
              : `${number(correction.score)} / ${number(correction.maxScore)}`,
            bold: true,
            fontSize: 13,
            color: INK,
            margin: [0, 3, 6, 3],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 1.2,
      vLineWidth: (i: number, node: { table: { widths: unknown[] } }) =>
        i === 0 || i === node.table.widths.length ? 1.2 : 0,
      hLineColor: () => INK,
      vLineColor: () => INK,
    },
    unbreakable: true,
    margin: [0, 10, 0, 0],
  });

  content.push(...listBlock(c.keyPoints, correction.keyPoints ?? [], false, safe));
  if (!isAnswerKey) {
    content.push(...listBlock(c.strengths, correction.strengths, false, safe));
    content.push(...listBlock(c.improvements, correction.improvements, false, safe));
  }
  content.push(
    ...listBlock(isAnswerKey ? c.methodAdvice : c.advice, correction.advice, true, safe),
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
    content: buildContent(correction, dict, locale),
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
        margin: [0, 14, 0, 0],
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
        color: BODY,
        margin: [0, 4, 0, 2],
      },
      statement: {
        fontSize: 10,
        lineHeight: 1.35,
        color: INK,
      },
      body: {
        fontSize: 9.5,
        lineHeight: 1.35,
        color: BODY,
      },
    },
    defaultStyle: { font: "Roboto" },
  };
}

/** Génère et **télécharge** le PDF de la correction affichée. */
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
