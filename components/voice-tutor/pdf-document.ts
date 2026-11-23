"use client";

import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  VOICE_TUTOR_MAX_OCR_PAGES,
  VOICE_TUTOR_MAX_PAGE_CHARS,
} from "@/lib/config/voice-tutor";

/**
 * PDF du Professeur vocal, entièrement lu dans le navigateur avec PDF.js :
 * affichage des pages et extraction de leur texte (transmis au professeur
 * avec chaque question). Le fichier lui-même n'est jamais envoyé au serveur ;
 * seules les pages scannées (sans texte) passent, en image, par la lecture
 * d'image déjà utilisée pour les photos de cours (`POST /api/ai/ocr`).
 *
 * Build « legacy » : compatible avec les navigateurs mobiles plus anciens.
 */
type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

/**
 * PDF.js lit le texte des pages avec `for await` sur un `ReadableStream`
 * (`getTextContent`), que son build « legacy » ne complète pas. Safari
 * (iPhone, iPad) jusqu'à la version 18 et les navigateurs Android basés sur
 * un Chromium antérieur à 124 (Samsung Internet, anciens Chrome) n'ont pas
 * cette fonction : la lecture du texte échouait aussitôt (« PDF illisible »)
 * et le micro restait grisé. On l'ajoute ici quand elle manque, comme le
 * prévoit la norme (lecteur verrouillé, libéré à la fin ou à l'abandon).
 */
function ensureReadableStreamIteration(): void {
  if (typeof ReadableStream === "undefined") return;
  const proto = ReadableStream.prototype as ReadableStream<unknown> & {
    [Symbol.asyncIterator]?: unknown;
    values?: unknown;
  };
  if (typeof proto[Symbol.asyncIterator] === "function") return;

  async function* values(
    this: ReadableStream<unknown>,
    options?: { preventCancel?: boolean },
  ): AsyncGenerator<unknown, void, undefined> {
    const reader = this.getReader();
    let finished = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          finished = true;
          return;
        }
        yield value;
      }
    } finally {
      // Boucle quittée avant la fin (`break`, erreur) : le flux est annulé.
      if (!finished && !options?.preventCancel) await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }

  Object.defineProperty(proto, "values", { value: values, writable: true, configurable: true });
  Object.defineProperty(proto, Symbol.asyncIterator, {
    value: values,
    writable: true,
    configurable: true,
  });
}

let pdfjsPromise: Promise<PdfJs> | null = null;

export function loadPdfJs(): Promise<PdfJs> {
  ensureReadableStreamIteration();
  pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
    if (!pdfjs.GlobalWorkerOptions.workerPort) {
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(
        new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url),
        { type: "module" },
      );
    }
    return pdfjs;
  });
  return pdfjsPromise;
}

export type PdfOpenFailure = "invalid" | "password";

export class PdfOpenError extends Error {
  reason: PdfOpenFailure;
  constructor(reason: PdfOpenFailure) {
    super(reason);
    this.name = "PdfOpenError";
    this.reason = reason;
  }
}

export async function openPdf(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({
    data,
    // Décodeurs d'images en JavaScript (copiés dans `public/pdfjs/wasm/`) : la
    // CSP n'autorise pas la compilation WebAssembly.
    useWasm: false,
    wasmUrl: "/pdfjs/wasm/",
    enableXfa: false,
  });
  // Mot de passe demandé : on abandonne plutôt que d'afficher une invite.
  task.onPassword = () => {
    void task.destroy();
  };
  try {
    return await task.promise;
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    if (name === "PasswordException" || task.destroyed) {
      throw new PdfOpenError("password");
    }
    throw new PdfOpenError("invalid");
  }
}

/** Texte d'une page, lignes conservées, espaces superflus retirés. */
export async function readPageText(page: PDFPageProxy): Promise<string> {
  const content = await page.getTextContent();
  let text = "";
  for (const item of content.items) {
    if (!("str" in item)) continue;
    text += item.str;
    if (item.hasEOL) text += "\n";
  }
  return text
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, VOICE_TUTOR_MAX_PAGE_CHARS);
}

/** En dessous, la page est considérée comme scannée (image sans texte). */
const MIN_PAGE_CHARS = 25;

export function isScannedPageText(text: string): boolean {
  return text.replace(/[^\p{L}\p{N}]/gu, "").length < MIN_PAGE_CHARS;
}

export async function extractPagesText(
  doc: PDFDocumentProxy,
  onProgress: (done: number) => void,
  signal: AbortSignal,
): Promise<string[]> {
  const texts: string[] = [];
  for (let number = 1; number <= doc.numPages; number++) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const page = await doc.getPage(number);
    texts.push(await readPageText(page));
    page.cleanup();
    onProgress(number);
  }
  return texts;
}

/** Image JPEG d'une page (côté le plus long ≈ 1 800 px), pour la lecture d'image. */
async function renderPageImage(page: PDFPageProxy): Promise<Blob> {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, 1800 / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvas, viewport }).promise;
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error("render failed");
  return blob;
}

/**
 * Lit le texte des pages scannées (au plus `VOICE_TUTOR_MAX_OCR_PAGES`), deux
 * à la fois. Une page illisible reste vide plutôt que de bloquer le cours.
 * Si la limite de pages lues du jour est atteinte, la lecture s'arrête et
 * `limitMessage` porte le message du serveur, à montrer à l'élève.
 */
export async function readScannedPages(
  doc: PDFDocumentProxy,
  pageNumbers: number[],
  onProgress: (done: number, total: number) => void,
  signal: AbortSignal,
): Promise<{ texts: Map<number, string>; limitMessage: string | null }> {
  const targets = pageNumbers.slice(0, VOICE_TUTOR_MAX_OCR_PAGES);
  const results = new Map<number, string>();
  let limitMessage: string | null = null;
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < targets.length && limitMessage === null) {
      if (signal.aborted) return;
      const number = targets[next++];
      try {
        const page = await doc.getPage(number);
        const image = await renderPageImage(page);
        page.cleanup();
        const form = new FormData();
        form.append("image", image, `page-${number}.jpg`);
        const response = await fetch("/api/ai/ocr", { method: "POST", body: form, signal });
        const data: { text?: string; code?: string; error?: string } | null = await response
          .json()
          .catch(() => null);
        if (response.ok && data?.text) {
          results.set(number, data.text.slice(0, VOICE_TUTOR_MAX_PAGE_CHARS));
        } else if (response.status === 429 && data?.code === "DAILY_LIMIT") {
          limitMessage = data.error ?? "";
          return;
        }
      } catch {
        // Page ignorée (réseau, rendu) : le reste du cours reste utilisable.
      }
      onProgress(++done, targets.length);
    }
  }

  await Promise.all([worker(), worker()]);
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  return { texts: results, limitMessage };
}
