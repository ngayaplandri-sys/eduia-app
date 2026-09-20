"use client";

/**
 * OCR d'image — extraction du texte d'une photo ou d'une capture de cours.
 *
 * Tout se déroule dans le navigateur : Tesseract.js + les modèles servis depuis
 * `/public/vendor/tesseract`. Aucune image n'est envoyée à un serveur tant que
 * l'IA n'est pas branchée.
 *
 * ┌─ POINT DE BASCULE ───────────────────────────────────────────────────────┐
 * │ `recognizeImage()` est l'unique interface consommée par l'UI             │
 * │ (`components/common/file-dropzone.tsx`).                                 │
 * │ Pour passer à un OCR côté serveur ou à un modèle de vision (OpenAI),     │
 * │ il suffit de réécrire le corps de cette fonction : la signature et les   │
 * │ états (progression / erreur / succès) restent identiques.                │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

const VENDOR = "/vendor/tesseract";
const LANGS = "fra+eng";
/** OEM 1 = LSTM uniquement (modèles `*-lstm` de tesseract.js-core). */
const OEM_LSTM_ONLY = 1;

export interface OcrProgress {
  /** Avancement global, de 0 à 1. */
  ratio: number;
  /** Libellé de l'étape en cours, en français. */
  step: string;
}

export interface OcrResult {
  /** Texte extrait, nettoyé. */
  text: string;
  /** Indice de confiance moyen renvoyé par Tesseract (0–100). */
  confidence: number;
}

interface OcrWorker {
  recognize(
    image: Blob,
  ): Promise<{ data: { text?: string; confidence?: number } }>;
}

type CreateWorkerFn = (
  langs: string,
  oem: number,
  options: Record<string, unknown>,
) => Promise<OcrWorker>;

type TesseractNamespace = {
  createWorker?: CreateWorkerFn;
  default?: { createWorker?: CreateWorkerFn };
};

/**
 * Fenêtres d'avancement par étape Tesseract → barre de progression fluide et
 * (globalement) monotone. Après le 1ᵉʳ passage, moteur et modèle sont en cache :
 * on saute directement à « recognizing text ».
 */
const PHASES: Record<string, { lo: number; hi: number; step: string }> = {
  "loading tesseract core": {
    lo: 0,
    hi: 0.25,
    step: "Chargement du moteur d'analyse…",
  },
  "initializing tesseract": {
    lo: 0.25,
    hi: 0.33,
    step: "Initialisation du moteur…",
  },
  "loading language traineddata": {
    lo: 0.33,
    hi: 0.55,
    step: "Chargement du modèle de langue…",
  },
  "initializing api": {
    lo: 0.55,
    hi: 0.62,
    step: "Préparation de la lecture…",
  },
  "recognizing text": {
    lo: 0.62,
    hi: 1,
    step: "Lecture du texte de l'image…",
  },
};

let workerPromise: Promise<OcrWorker> | null = null;
let activeProgress: ((p: OcrProgress) => void) | null = null;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

async function loadCreateWorker(): Promise<CreateWorkerFn> {
  const ns = (await import("tesseract.js")) as unknown as TesseractNamespace;
  const createWorker = ns.createWorker ?? ns.default?.createWorker;
  if (typeof createWorker !== "function") {
    throw new Error("tesseract.js : createWorker introuvable");
  }
  return createWorker;
}

async function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const createWorker = await loadCreateWorker();
      return createWorker(LANGS, OEM_LSTM_ONLY, {
        workerPath: `${VENDOR}/worker.min.js`,
        corePath: `${VENDOR}/core/tesseract-core-simd-lstm.wasm.js`,
        langPath: `${VENDOR}/lang`,
        gzip: false,
        logger: (message: { status?: string; progress?: number }) => {
          if (!activeProgress || !message.status) return;
          const phase = PHASES[message.status];
          if (!phase) return;
          const local = clamp01(message.progress ?? 0);
          activeProgress({
            ratio: clamp01(phase.lo + (phase.hi - phase.lo) * local),
            step: phase.step,
          });
        },
      });
    })();

    // En cas d'échec (asset manquant, navigateur incompatible…), on repart de
    // zéro au prochain appel plutôt que de rester bloqué sur la promesse rejetée.
    workerPromise.catch(() => {
      workerPromise = null;
    });
  }
  return workerPromise;
}

/** Réduit les très grandes images avant l'OCR (vitesse + mémoire). */
async function downscale(source: Blob): Promise<Blob> {
  if (
    typeof createImageBitmap !== "function" ||
    typeof document === "undefined"
  ) {
    return source;
  }
  try {
    const bitmap = await createImageBitmap(source);
    const maxEdge = 2200;
    const scale = Math.min(
      1,
      maxEdge / Math.max(bitmap.width, bitmap.height),
    );
    if (scale === 1) {
      bitmap.close?.();
      return source;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close?.();
      return source;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    return blob ?? source;
  } catch {
    return source;
  }
}

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Les appels sont sérialisés : un seul worker Tesseract, une reconnaissance
// à la fois (les pages « Corriger » ont deux zones d'import).
let chain: Promise<unknown> = Promise.resolve();

/**
 * Analyse une image et renvoie le texte qu'elle contient.
 * @throws si le moteur ne peut pas être chargé (asset manquant, navigateur non
 *   compatible WebAssembly SIMD…). L'appelant affiche alors l'état d'erreur.
 */
export function recognizeImage(
  image: Blob,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> {
  const task = async (): Promise<OcrResult> => {
    activeProgress = onProgress ?? null;
    try {
      const worker = await getWorker();
      const prepared = await downscale(image);
      const { data } = await worker.recognize(prepared);
      return {
        text: cleanText(data.text ?? ""),
        confidence: Math.round(data.confidence ?? 0),
      };
    } finally {
      activeProgress = null;
    }
  };

  const run = chain.then(task, task);
  chain = run.catch(() => {});
  return run;
}
