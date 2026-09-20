/**
 * Socle commun de génération PDF (`pdfmake`) pour les documents EduIA :
 * « Résumer mes cours » (`summary-pdf.ts`) et « Générer une épreuve »
 * (`exam-pdf.ts`) — même chargement à la demande, mêmes couleurs, même police.
 *
 * `pdfmake` (~2 Mo, polices Roboto incluses — accents FR/EN OK) est chargé
 * **uniquement au premier téléchargement** (import dynamique) : il n'entre
 * jamais dans le bundle initial des pages.
 */

export const PDF_PRIMARY = "#6d28d9";
export const PDF_INK = "#1f2333";
export const PDF_MUTED = "#5b6170";
export const PDF_LINE = "#d9dbe3";

/** Largeur utile d'une page A4 avec les marges par défaut ci-dessous. */
export const PDF_CONTENT_WIDTH = 515;

export type PdfRun = string | { text: string; bold?: boolean; italics?: boolean };
export type PdfBlock = Record<string, unknown>;

type PdfDoc = {
  download: (fileName: string, cb?: () => void) => void;
  getBlob: (cb: (blob: Blob) => void) => void;
};
type PdfMake = {
  createPdf: (
    def: PdfBlock,
    tableLayouts?: unknown,
    fonts?: unknown,
    vfs?: Record<string, string>,
  ) => PdfDoc;
  vfs?: Record<string, string>;
};

let pdfMakePromise: Promise<{ createPdf: (def: PdfBlock) => PdfDoc }> | null =
  null;

export async function loadPdfMake() {
  if (!pdfMakePromise) {
    pdfMakePromise = (async () => {
      const [core, fonts] = await Promise.all([
        import("pdfmake/build/pdfmake"),
        import("pdfmake/build/vfs_fonts"),
      ]);
      const pdfMake = ((core as { default?: unknown }).default ??
        core) as PdfMake;
      const vfs = ((fonts as { default?: unknown }).default ?? fonts) as Record<
        string,
        string
      >;
      // Renseigne les deux voies possibles (module mutable + 4ᵉ argument).
      try {
        pdfMake.vfs = vfs;
      } catch {
        /* module en lecture seule : on passera vfs à createPdf */
      }
      return {
        createPdf: (def: PdfBlock) =>
          pdfMake.createPdf(def, undefined, undefined, vfs),
      };
    })();
    pdfMakePromise.catch(() => {
      pdfMakePromise = null;
    });
  }
  return pdfMakePromise;
}

/** Marges A4 partagées : `[gauche, haut, droite, bas]`. */
export const PDF_PAGE_MARGINS: [number, number, number, number] = [48, 54, 48, 60];

/** Déclenche le téléchargement du PDF et résout quand le fichier est prêt. */
export async function downloadPdf(
  docDefinition: PdfBlock,
  fileName: string,
): Promise<void> {
  const { createPdf } = await loadPdfMake();
  await new Promise<void>((resolve) => {
    createPdf(docDefinition).download(fileName, () => resolve());
  });
}

/**
 * Construit le PDF **en mémoire** et le renvoie comme `File`
 * (`type: "application/pdf"`) — pour le partage natif (`navigator.share({ files })`).
 */
export async function pdfFile(
  docDefinition: PdfBlock,
  fileName: string,
): Promise<File> {
  const { createPdf } = await loadPdfMake();
  const blob = await new Promise<Blob>((resolve) => {
    createPdf(docDefinition).getBlob((b) => resolve(b));
  });
  return new File([blob], fileName, { type: "application/pdf" });
}
