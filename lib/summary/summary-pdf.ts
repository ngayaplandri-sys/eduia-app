import type { CourseSummary, SummaryBullet } from "@/types";
import { buildSummaryOutline } from "./outline";
import { formatActivityDate } from "@/lib/utils/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  localizeLevel,
  localizePageCount,
  localizeSubject,
  localizeSummaryStyle,
} from "@/lib/i18n/labels";
import {
  PDF_INK as INK,
  PDF_MUTED as MUTED,
  PDF_PRIMARY as PRIMARY,
  PDF_PAGE_MARGINS,
  downloadPdf,
  pdfFile,
  type PdfBlock as Block,
  type PdfRun as Run,
} from "./pdf-kit";

type PdfLocale = "fr" | "en";

/**
 * Génère et télécharge un **vrai fichier PDF** (structuré, pagination automatique)
 * du résumé de cours affiché — même contenu et même hiérarchie que
 * `SummaryResultPanel` : titre, chapitre/thème, sections, paragraphes, listes à
 * puces, listes numérotées, blocs « Notions clés / Définitions / Points clés ».
 *
 * `pdfmake` est chargé à la demande via `lib/summary/pdf-kit` (partagé avec
 * `exam-pdf.ts`) : il n'entre jamais dans le bundle initial de `/resumer`.
 */

function metaLine(label: string, value: string): Block {
  return {
    text: [
      { text: `${label} : `, bold: true, color: INK },
      { text: value, color: MUTED },
    ],
    fontSize: 9,
    margin: [0, 1, 0, 1],
  };
}

/** Explication sous un titre : paragraphes puis puces (préfixe en gras). */
function pushOutlineContent(
  content: Block[],
  paragraphs: string[],
  bullets: SummaryBullet[],
): void {
  for (const paragraph of paragraphs) {
    content.push({ text: paragraph, style: "para" });
  }

  if (bullets.length > 0) {
    content.push({
      ul: bullets.map((bullet): { text: Run[] } | string => {
        if (bullet.lead) {
          return { text: [{ text: `${bullet.lead} `, bold: true }, bullet.text] };
        }
        return bullet.text;
      }),
      style: "para",
      margin: [0, 2, 0, 6],
    });
  }
}

function buildContent(summary: CourseSummary, dict: Dictionary): Block[] {
  const t = dict.resumer;
  const content: Block[] = [
    { text: summary.title.toUpperCase(), style: "title" },
    {
      canvas: [
        { type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.2, lineColor: INK },
      ],
      margin: [0, 5, 0, 10],
    },
  ];

  const meta: Block[] = [
    metaLine(t.metaLevel, localizeLevel(summary.level, dict)),
    metaLine(t.metaSubject, localizeSubject(summary.subject, dict)),
    metaLine(t.metaStyle, localizeSummaryStyle(summary.styleLabel, dict)),
    metaLine(t.metaLength, localizePageCount(summary.pageCountLabel, dict)),
  ];
  if (summary.chapter?.trim())
    meta.push(metaLine(t.metaChapter, summary.chapter.trim()));
  if (summary.theme?.trim()) meta.push(metaLine(t.metaTheme, summary.theme.trim()));
  if (summary.pagesSummarized > 0) {
    meta.push(metaLine(t.metaCoursePages, String(summary.pagesSummarized)));
  }
  content.push({ stack: meta, margin: [0, 0, 0, 6] });
  content.push({
    canvas: [
      { type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#d9dbe3" },
    ],
    margin: [0, 4, 0, 12],
  });

  // ── Plan numéroté : grandes parties (1, 2…) et sous-parties (1.1, 1.2…),
  // titres centrés, explications alignées à gauche ──
  for (const part of buildSummaryOutline(summary.sections)) {
    content.push({
      stack: [
        { text: `${part.number}. ${part.heading.toUpperCase()}`, style: "heading" },
        {
          // Filet court centré sous le titre (pdfmake ne centre pas un canvas seul).
          columns: [
            { width: "*", text: "" },
            {
              width: 40,
              canvas: [
                { type: "line", x1: 0, y1: 0, x2: 40, y2: 0, lineWidth: 1.5, lineColor: PRIMARY },
              ],
            },
            { width: "*", text: "" },
          ],
          margin: [0, 4, 0, 8],
        },
      ],
      unbreakable: true,
      headlineLevel: 1,
    });
    pushOutlineContent(content, part.paragraphs, part.bullets);

    for (const sub of part.subsections) {
      content.push({
        text: [
          { text: `${sub.number}  `, color: PRIMARY },
          { text: sub.heading },
        ],
        style: "subheading",
        headlineLevel: 2,
      });
      pushOutlineContent(content, sub.paragraphs, sub.bullets);
    }
  }

  // ── Notions clés ──
  if (summary.keyConcepts.length > 0) {
    content.push({ text: t.blockKeyConcepts, style: "blockTitle" });
    content.push({ text: summary.keyConcepts.join("  ·  "), style: "para" });
  }

  // ── Définitions importantes ──
  if (summary.definitions.length > 0) {
    content.push({ text: t.blockDefinitions, style: "blockTitle" });
    for (const entry of summary.definitions) {
      content.push({
        text: [
          { text: `${entry.term} : `, bold: true, color: INK },
          entry.definition,
        ],
        style: "para",
        margin: [0, 0, 0, 4],
      });
    }
  }

  // ── Points clés à retenir (liste numérotée) ──
  if (summary.keyPoints.length > 0) {
    content.push({ text: t.blockKeyPoints, style: "blockTitle" });
    content.push({
      ol: summary.keyPoints.map((point) => point),
      style: "para",
      margin: [0, 2, 0, 0],
    });
  }

  return content;
}

function buildSummaryDoc(
  summary: CourseSummary,
  dict: Dictionary,
  locale: PdfLocale,
): Block {
  const generatedLine = dict.resumer.footer(
    summary.generatedBy,
    formatActivityDate(summary.generatedAt, locale),
  );

  return {
    info: {
      title: summary.title,
      author: "EduIA",
      subject: [summary.chapter?.trim(), summary.theme?.trim()]
        .filter(Boolean)
        .join(" — "),
    },
    pageSize: "A4",
    pageMargins: PDF_PAGE_MARGINS,
    content: buildContent(summary, dict),
    // Jamais de titre de partie / sous-partie orphelin en bas de page : s'il
    // commence dans le dernier ~1/8 de la page, il passe à la page suivante
    // avec son explication.
    pageBreakBefore: (node: {
      headlineLevel?: number;
      startPosition?: { verticalRatio?: number };
    }) =>
      Boolean(node.headlineLevel) &&
      (node.startPosition?.verticalRatio ?? 0) >
        (node.headlineLevel === 1 ? 0.86 : 0.9),
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
      heading: {
        fontSize: 12.5,
        bold: true,
        color: INK,
        alignment: "center",
        characterSpacing: 0.4,
        margin: [24, 16, 24, 0],
      },
      subheading: {
        fontSize: 11,
        bold: true,
        color: INK,
        alignment: "center",
        margin: [36, 10, 36, 5],
      },
      blockTitle: { fontSize: 11, bold: true, color: PRIMARY, margin: [0, 14, 0, 5] },
      para: { fontSize: 10, lineHeight: 1.35, color: "#33384a", margin: [0, 0, 0, 5] },
    },
    defaultStyle: { font: "Roboto" },
  };
}

/** Génère et **télécharge** le PDF du résumé affiché. */
export async function downloadSummaryPdf(
  summary: CourseSummary,
  dict: Dictionary,
  locale: PdfLocale,
  fileName: string,
): Promise<void> {
  await downloadPdf(buildSummaryDoc(summary, dict, locale), fileName);
}

/** Même PDF, renvoyé comme `File` pour le partage natif (`navigator.share`). */
export async function summaryPdfFile(
  summary: CourseSummary,
  dict: Dictionary,
  locale: PdfLocale,
  fileName: string,
): Promise<File> {
  return pdfFile(buildSummaryDoc(summary, dict, locale), fileName);
}
