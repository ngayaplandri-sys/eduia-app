"use client";

import * as React from "react";
import {
  CloudUpload,
  FileText,
  Trash2,
  CircleCheck,
  RefreshCw,
  ScanText,
  LoaderCircle,
  TriangleAlert,
  RotateCcw,
  X,
} from "lucide-react";
import { formatBytes } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import type { OcrProgress } from "@/lib/ocr/recognize-image";

export type DropzoneFileKind = "pdf" | "docx" | "txt" | "image" | "other";

export interface DropzoneFile {
  name: string;
  size: string;
  /** Catégorie déduite du type MIME / de l'extension. */
  kind?: DropzoneFileKind;
  /**
   * Texte exploitable par l'IA :
   * - `image` → texte extrait par OCR ;
   * - `txt`  → contenu lu directement ;
   * - `pdf` / `docx` → `null` (extraction faite côté serveur à partir de `raw`).
   */
  text?: string | null;
  /**
   * Fichier brut, conservé pour les formats dont l'extraction se fait côté
   * serveur (PDF, Word). `undefined` pour TXT / image (déjà transformés en texte).
   */
  raw?: File;
}

/** Taille maximale d'une image analysable par OCR. */
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
/** En dessous de ce nombre de lettres/chiffres, l'OCR n'a rien d'exploitable. */
const MIN_USEFUL_CHARS = 8;
/** En dessous de cette confiance moyenne, on considère l'image illisible. */
const MIN_CONFIDENCE = 40;

interface FileDropzoneProps {
  label: string;
  hint: string;
  /** Attribut `accept` de l'input (ex. ".pdf,.docx,.txt,.jpg,.png"). */
  accept: string;
  /** Ligne d'aide sur les formats (ex. « PDF, Word, image · 25 Mo max »). */
  formatsLabel: string;
  file: DropzoneFile | null;
  onSelect: (file: DropzoneFile) => void;
  onClear: () => void;
  browseLabel?: string;
  /** Affiche un bouton « Remplacer » sur la fiche du fichier importé. */
  replaceable?: boolean;
  /** Notifie le parent quand un OCR est en cours (pour désactiver la génération). */
  onExtractingChange?: (busy: boolean) => void;
  id?: string;
}

type Phase =
  | { status: "idle" }
  | { status: "reading"; fileName: string; ratio: number; step: string }
  | { status: "error"; message: string; retry: File | null };

function detectKind(file: File): DropzoneFileKind {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type.startsWith("image/") || /\.(jpe?g|png|webp)$/.test(name)) {
    return "image";
  }
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    name.endsWith(".docx") ||
    name.endsWith(".doc") ||
    type.includes("wordprocessingml") ||
    type === "application/msword"
  ) {
    return "docx";
  }
  if (type.startsWith("text/") || name.endsWith(".txt")) return "txt";
  return "other";
}

/**
 * Zone de dépôt de fichier réutilisable (glisser-déposer + parcourir).
 *
 * Accepte les documents (PDF / Word / TXT) et les images (JPG, PNG, WEBP).
 * Pour une image, le texte est extrait automatiquement par OCR
 * (`lib/ocr/recognize-image`) puis transmis comme n'importe quel document —
 * avec états de chargement, d'erreur et de réussite.
 */
export function FileDropzone({
  label,
  hint,
  accept,
  formatsLabel,
  file,
  onSelect,
  onClear,
  browseLabel,
  replaceable = false,
  onExtractingChange,
  id,
}: FileDropzoneProps) {
  const { dict, locale } = useI18n();
  const t = dict.dropzone;
  const browse = browseLabel ?? t.browse;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>({ status: "idle" });

  async function runOcr(picked: File) {
    const base: DropzoneFile = {
      name: picked.name,
      size: formatBytes(picked.size, locale),
      kind: "image",
    };

    if (picked.size > MAX_IMAGE_BYTES) {
      setPhase({
        status: "error",
        message: t.imageTooHeavy,
        retry: null,
      });
      return;
    }

    setPhase({
      status: "reading",
      fileName: picked.name,
      ratio: 0,
      step: t.preparingAnalysis,
    });
    onExtractingChange?.(true);

    try {
      const { recognizeImage } = await import("@/lib/ocr/recognize-image");
      const { text, confidence } = await recognizeImage(
        picked,
        (progress: OcrProgress) => {
          setPhase((current) =>
            current.status === "reading"
              ? { ...current, ratio: progress.ratio, step: progress.step }
              : current,
          );
        },
      );

      const meaningfulChars = text.replace(/[^\p{L}\p{N}]/gu, "").length;
      if (meaningfulChars < MIN_USEFUL_CHARS || confidence < MIN_CONFIDENCE) {
        setPhase({
          status: "error",
          message: t.noReadableText,
          retry: picked,
        });
        return;
      }

      setPhase({ status: "idle" });
      onSelect({ ...base, text });
    } catch {
      setPhase({
        status: "error",
        message: t.analysisFailed,
        retry: picked,
      });
    } finally {
      onExtractingChange?.(false);
    }
  }

  async function pick(picked: File | undefined) {
    if (!picked) return;
    const kind = detectKind(picked);
    const base: DropzoneFile = {
      name: picked.name,
      size: formatBytes(picked.size, locale),
      kind,
    };

    if (kind === "image") {
      await runOcr(picked);
      return;
    }

    if (kind === "txt") {
      let text: string | null = null;
      try {
        text = await picked.text();
      } catch {
        text = null;
      }
      setPhase({ status: "idle" });
      onSelect({ ...base, text });
      return;
    }

    // PDF / DOCX / autre : le texte est extrait côté serveur à partir du fichier
    // brut, transmis tel quel avec la requête de génération.
    setPhase({ status: "idle" });
    onSelect({ ...base, text: null, raw: picked });
  }

  function handleInput(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    pick(picked);
  }

  function onDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files?.[0]);
  }

  // ── Analyse en cours ───────────────────────────────────────────────────────
  if (phase.status === "reading") {
    const percent = Math.round(phase.ratio * 100);
    return (
      <div className="rounded-xl border border-line bg-canvas/40 p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-snug text-ink-900">
              {phase.fileName}
            </p>
            <p className="mt-0.5 truncate text-meta text-ink-400">{phase.step}</p>
          </div>
          <span className="shrink-0 text-meta font-semibold tabular-nums text-primary-600">
            {percent} %
          </span>
        </div>
        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t.analysisAria}
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(6, percent)}%` }}
          />
        </div>
      </div>
    );
  }

  // ── Erreur d'analyse ───────────────────────────────────────────────────────
  if (phase.status === "error") {
    return (
      <div className="rounded-xl border border-danger-100 bg-danger-50/70 p-3.5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-danger-100 text-danger-600">
            <TriangleAlert className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-ink-900">
              {t.readImpossible}
            </p>
            <p className="mt-0.5 text-fine leading-snug text-ink-500">
              {phase.message}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {phase.retry ? (
                <button
                  type="button"
                  onClick={() => {
                    pick(phase.retry ?? undefined);
                  }}
                  className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-primary-600 hover:text-primary-700"
                >
                  <RotateCcw className="size-3" aria-hidden />
                  {t.retry}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setPhase({ status: "idle" });
                  inputRef.current?.click();
                }}
                className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-ink-500 hover:text-ink-900"
              >
                {t.chooseAnother}
              </button>
            </div>
          </div>
          <button
            type="button"
            aria-label={t.close}
            onClick={() => setPhase({ status: "idle" })}
            className="shrink-0 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-danger-100 hover:text-danger-600 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={handleInput}
        />
      </div>
    );
  }

  // ── Fichier importé ────────────────────────────────────────────────────────
  if (file) {
    const isImage = file.kind === "image";
    const charCount =
      typeof file.text === "string" && file.text.length > 0
        ? file.text.length
        : null;

    return (
      <div className="flex items-start gap-3 rounded-xl border border-line bg-canvas/40 p-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            isImage
              ? "bg-success-100 text-success-600"
              : "bg-danger-100 text-danger-500",
          )}
        >
          {isImage ? (
            <ScanText className="size-4" aria-hidden />
          ) : (
            <FileText className="size-4" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-snug text-ink-900">
            {file.name}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-meta text-ink-400">
            {file.size}
            <span className="text-line" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-0.5 font-medium text-success-600">
              <CircleCheck className="size-3.5" aria-hidden />
              {isImage ? t.textExtracted : t.imported}
            </span>
          </p>
          {isImage && charCount !== null ? (
            <p className="mt-0.5 text-meta text-ink-400">
              {t.ocrCharsRead(
                charCount.toLocaleString(locale === "en" ? "en-GB" : "fr-FR"),
              )}
            </p>
          ) : null}
          {replaceable ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-1.5 inline-flex items-center gap-1 text-[0.75rem] font-semibold text-primary-600 hover:text-primary-700"
            >
              <RefreshCw className="size-3" aria-hidden />
              {t.replace}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={t.removeFile}
          onClick={onClear}
          className="shrink-0 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={handleInput}
        />
      </div>
    );
  }

  // ── Zone de dépôt ──────────────────────────────────────────────────────────
  return (
    <label
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDrop={onDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
        dragging
          ? "border-primary-400 bg-primary-50"
          : "border-primary-200 bg-primary-50/60 hover:border-primary-300 hover:bg-primary-50",
      )}
    >
      <span className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
        <CloudUpload className="size-6" aria-hidden />
      </span>
      <span className="text-sm font-bold text-ink-900">{label}</span>
      <span className="text-fine text-ink-500">{hint}</span>
      <span className="mt-3 inline-flex h-9 items-center rounded-md border border-line bg-surface px-3 text-fine font-semibold text-ink-700">
        {browse}
      </span>
      <span className="mt-2 text-meta text-ink-400">{formatsLabel}</span>
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleInput}
      />
    </label>
  );
}
