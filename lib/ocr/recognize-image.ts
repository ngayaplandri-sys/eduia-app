"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * Lecture d'une photo de cours (cahier manuscrit, feuille imprimée, capture
 * d'écran) par le modèle de vision OpenAI, via `POST /api/ai/ocr`.
 *
 * Remplace l'ancien OCR Tesseract.js exécuté dans le navigateur : conçu pour
 * du texte imprimé, il échouait sur l'écriture manuscrite (confiance trop
 * basse → photo ignorée sans explication).
 *
 * Unique interface consommée par l'UI (`FileDropzone`, `MultiFileDropzone`) :
 * renvoie le texte transcrit, ou lève une `OcrError` portant un motif précis
 * (photo floue, sombre, reflet, format…) à afficher à l'élève.
 */

export type OcrStep = "preparing" | "uploading" | "reading";

export interface OcrProgress {
  /** Avancement global, de 0 à 1. */
  ratio: number;
  step: OcrStep;
}

export interface OcrResult {
  /** Texte transcrit, prêt à être envoyé à la génération. */
  text: string;
  /** `partial` : texte exploitable mais certains passages sont marqués [illisible]. */
  quality: "good" | "partial";
}

export type OcrFailure =
  | "blurry"
  | "too_dark"
  | "glare"
  | "cropped"
  | "no_text"
  | "illegible_handwriting"
  | "unsupported"
  | "too_large"
  | "failed";

export class OcrError extends Error {
  reason: OcrFailure;
  /** Message déjà traduit renvoyé par le serveur (quota, délai dépassé…), prioritaire. */
  serverMessage: string | null;

  constructor(reason: OcrFailure, serverMessage: string | null = null) {
    super(serverMessage ?? reason);
    this.name = "OcrError";
    this.reason = reason;
    this.serverMessage = serverMessage;
  }
}

/** Taille maximale d'une photo acceptée avant redimensionnement. */
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

/**
 * Plus grand côté envoyé au modèle : au-delà, la vision OpenAI redimensionne
 * de toute façon (mode `high`), l'envoi serait juste plus lent.
 */
const MAX_EDGE = 2048;

const UPLOADABLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Redimensionne la photo et la ré-encode en JPEG (aussi utilisée pour les pages
 * d'épreuve envoyées telles quelles à la correction). `createImageBitmap` applique
 * l'orientation EXIF (photo prise en portrait au téléphone) et décode les
 * formats que le navigateur sait lire (dont HEIC sur Safari) : le modèle reçoit
 * toujours une image droite, légère, dans un format qu'il accepte.
 */
export async function prepareImage(source: File): Promise<Blob> {
  if (typeof createImageBitmap === "function" && typeof document !== "undefined") {
    try {
      const bitmap = await createImageBitmap(source);
      const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", 0.9);
        });
        if (blob) return blob;
      } else {
        bitmap.close?.();
      }
    } catch {
      // Format non décodable par ce navigateur : on tente l'envoi tel quel.
    }
  }

  if (UPLOADABLE_TYPES.has(source.type.toLowerCase())) return source;
  throw new OcrError("unsupported");
}

const SERVER_ISSUES: ReadonlySet<string> = new Set([
  "blurry",
  "too_dark",
  "glare",
  "cropped",
  "no_text",
  "illegible_handwriting",
]);

/**
 * Transcrit le texte d'une photo de cours.
 * @throws {OcrError} avec un motif précis si la photo est illisible, trop
 *   lourde, dans un format non pris en charge, ou si l'analyse a échoué.
 */
export async function recognizeImage(
  image: File,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> {
  if (image.size > MAX_IMAGE_BYTES) throw new OcrError("too_large");

  onProgress?.({ ratio: 0.05, step: "preparing" });
  const prepared = await prepareImage(image);

  const body = new FormData();
  body.append("image", prepared, "page.jpg");
  onProgress?.({ ratio: 0.2, step: "uploading" });

  // La réponse du modèle n'expose pas d'avancement réel : la barre progresse
  // doucement vers 90 % pendant la lecture, puis se complète à la réponse.
  let ratio = 0.3;
  const timer = window.setInterval(() => {
    ratio += (0.9 - ratio) * 0.08;
    onProgress?.({ ratio, step: "reading" });
  }, 400);

  let response: Response;
  try {
    response = await fetch("/api/ai/ocr", { method: "POST", body });
  } catch {
    throw new OcrError("failed");
  } finally {
    window.clearInterval(timer);
  }

  const data = (await response.json().catch(() => null)) as {
    text?: string;
    quality?: "good" | "partial";
    code?: string;
    issue?: string;
    error?: string;
  } | null;

  if (response.ok && typeof data?.text === "string") {
    onProgress?.({ ratio: 1, step: "reading" });
    return { text: data.text, quality: data.quality === "partial" ? "partial" : "good" };
  }

  if (data?.code === "UNREADABLE") {
    throw new OcrError(
      data.issue && SERVER_ISSUES.has(data.issue) ? (data.issue as OcrFailure) : "no_text",
    );
  }
  if (data?.code === "UNSUPPORTED_IMAGE") throw new OcrError("unsupported");
  if (data?.code === "IMAGE_TOO_LARGE") throw new OcrError("too_large");
  throw new OcrError("failed", data?.error ?? null);
}

/** Motif d'échec en toutes lettres (commence par une minuscule, à composer). */
export function describeOcrFailure(
  error: unknown,
  t: Dictionary["dropzone"],
): string {
  const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  if (!(error instanceof OcrError)) return lowerFirst(t.analysisFailed);
  if (error.serverMessage) return lowerFirst(error.serverMessage);

  switch (error.reason) {
    case "blurry":
      return t.ocrBlurry;
    case "too_dark":
      return t.ocrTooDark;
    case "glare":
      return t.ocrGlare;
    case "cropped":
      return t.ocrCropped;
    case "illegible_handwriting":
      return t.ocrIllegibleHandwriting;
    case "unsupported":
      return t.ocrUnsupported;
    case "no_text":
      return lowerFirst(t.noReadableText);
    case "too_large":
      return lowerFirst(t.imageTooHeavy);
    case "failed":
      return lowerFirst(t.analysisFailed);
  }
}

/** Libellé traduit de l'étape en cours. */
export function describeOcrStep(step: OcrStep, t: Dictionary["dropzone"]): string {
  if (step === "uploading") return t.ocrUploading;
  if (step === "reading") return t.ocrReading;
  return t.preparingAnalysis;
}
