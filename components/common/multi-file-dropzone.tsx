"use client";

import * as React from "react";
import {
  CloudUpload,
  FileText,
  Trash2,
  CircleCheck,
  ScanText,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-react";
import { formatBytes } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import type { DropzoneFile, DropzoneFileKind } from "@/components/common/file-dropzone";
import type { OcrProgress } from "@/lib/ocr/recognize-image";

/** Taille maximale d'une image analysable par OCR. */
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
/** En dessous de ce nombre de lettres/chiffres, l'OCR n'a rien d'exploitable. */
const MIN_USEFUL_CHARS = 8;
/** En dessous de cette confiance moyenne, on considère l'image illisible. */
const MIN_CONFIDENCE = 40;

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

interface MultiFileDropzoneProps {
  label: string;
  hint: string;
  /** Attribut `accept` de l'input (ex. ".pdf,.docx,.txt,.jpg,.png"). */
  accept: string;
  /** Ligne d'aide sur les formats (ex. « PDF, Word, image · 15 Mo max »). */
  formatsLabel: string;
  files: DropzoneFile[];
  onFilesChange: (files: DropzoneFile[]) => void;
  /** Nombre maximum de fichiers/pages importables en une fois (défaut : 5). */
  maxFiles?: number;
  /** Notifie le parent quand une extraction (OCR) est en cours. */
  onExtractingChange?: (busy: boolean) => void;
  id?: string;
}

type Phase =
  | { status: "idle" }
  | { status: "reading"; fileName: string; ratio: number; step: string; index: number; total: number };

/**
 * Zone de dépôt multi-fichiers (jusqu'à `maxFiles`) — variante de `FileDropzone`
 * pour les outils acceptant plusieurs pages/fichiers traités comme UN seul
 * document (« Résumer un cours », « Générer une épreuve »).
 *
 * Même pipeline d'extraction par fichier (OCR pour une image, lecture directe
 * pour un TXT, extraction serveur pour PDF/DOCX via `raw`), appliqué
 * séquentiellement à chaque fichier ajouté.
 */
export function MultiFileDropzone({
  label,
  hint,
  accept,
  formatsLabel,
  files,
  onFilesChange,
  maxFiles = 5,
  onExtractingChange,
  id,
}: MultiFileDropzoneProps) {
  const { dict, locale } = useI18n();
  const t = dict.dropzone;
  const [dragging, setDragging] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>({ status: "idle" });
  const [notice, setNotice] = React.useState<string | null>(null);

  const atLimit = files.length >= maxFiles;

  async function processOne(picked: File): Promise<DropzoneFile | null> {
    const kind = detectKind(picked);
    const base: DropzoneFile = {
      name: picked.name,
      size: formatBytes(picked.size, locale),
      kind,
    };

    if (kind === "image") {
      if (picked.size > MAX_IMAGE_BYTES) return null;
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
          return null;
        }
        return { ...base, text };
      } catch {
        return null;
      }
    }

    if (kind === "txt") {
      try {
        const text = await picked.text();
        return { ...base, text };
      } catch {
        return { ...base, text: null };
      }
    }

    // PDF / DOCX / autre : extraction côté serveur à partir du fichier brut.
    return { ...base, text: null, raw: picked };
  }

  async function pickMany(picked: File[]) {
    if (picked.length === 0) return;

    const room = maxFiles - files.length;
    if (room <= 0) {
      setNotice(t.maxFilesReached(maxFiles));
      return;
    }

    const accepted = picked.slice(0, room);
    const truncated = picked.length > accepted.length;

    onExtractingChange?.(true);
    const next = [...files];
    let anyFailed = false;

    for (let i = 0; i < accepted.length; i++) {
      const picking = accepted[i];
      setPhase({
        status: "reading",
        fileName: picking.name,
        ratio: 0,
        step: t.preparingAnalysis,
        index: i + 1,
        total: accepted.length,
      });
      const result = await processOne(picking);
      if (result) {
        next.push(result);
        onFilesChange([...next]);
      } else {
        anyFailed = true;
      }
    }

    setPhase({ status: "idle" });
    onExtractingChange?.(false);

    if (truncated) {
      setNotice(t.tooManySelected(maxFiles, accepted.length));
    } else if (anyFailed) {
      setNotice(t.someFilesFailed);
    } else {
      setNotice(null);
    }
  }

  function handleInput(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    void pickMany(picked);
  }

  function onDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void pickMany(Array.from(event.dataTransfer.files ?? []));
  }

  function removeAt(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
    setNotice(null);
  }

  return (
    <div className="space-y-2.5">
      {files.length > 0 ? (
        <div className="space-y-2">
          {files.map((file, index) => {
            const isImage = file.kind === "image";
            return (
              <div
                key={`${file.name}-${index}`}
                className="flex items-start gap-3 rounded-xl border border-line bg-canvas/40 p-3"
              >
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
                  <p className="flex items-center gap-1.5 text-meta font-semibold text-primary-600">
                    {t.pageLabel(index + 1)}
                  </p>
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
                </div>
                <button
                  type="button"
                  aria-label={t.removeFileNamed(file.name)}
                  onClick={() => removeAt(index)}
                  className="shrink-0 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {phase.status === "reading" ? (
        <div className="rounded-xl border border-line bg-canvas/40 p-3.5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-snug text-ink-900">
                {phase.fileName}
                {phase.total > 1 ? ` (${phase.index}/${phase.total})` : ""}
              </p>
              <p className="mt-0.5 truncate text-meta text-ink-400">{phase.step}</p>
            </div>
            <span className="shrink-0 text-meta font-semibold tabular-nums text-primary-600">
              {Math.round(phase.ratio * 100)} %
            </span>
          </div>
          <div
            className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuenow={Math.round(phase.ratio * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t.analysisAria}
          >
            <div
              className="h-full rounded-full bg-primary-500 transition-[width] duration-300 ease-out"
              style={{ width: `${Math.max(6, Math.round(phase.ratio * 100))}%` }}
            />
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning-100 bg-warning-50/70 p-3">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-warning-600"
            aria-hidden
          />
          <p className="min-w-0 flex-1 text-fine leading-snug text-ink-700">
            {notice}
          </p>
          <button
            type="button"
            aria-label={t.close}
            onClick={() => setNotice(null)}
            className="shrink-0 rounded-md p-1 text-ink-400 transition-colors hover:bg-warning-100 hover:text-warning-700 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : null}

      {files.length > 0 ? (
        <p className="text-meta font-medium text-ink-400">
          {t.multiFilesCount(files.length, maxFiles)}
        </p>
      ) : null}

      {phase.status !== "reading" && !atLimit ? (
        files.length > 0 ? (
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
              "flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-center text-fine font-semibold transition-colors",
              dragging
                ? "border-primary-400 bg-primary-50 text-primary-700"
                : "border-primary-200 bg-primary-50/60 text-primary-600 hover:border-primary-300 hover:bg-primary-50",
            )}
          >
            <CloudUpload className="size-4" aria-hidden />
            {t.addFile}
            <input
              id={id}
              type="file"
              accept={accept}
              multiple
              className="sr-only"
              onChange={handleInput}
            />
          </label>
        ) : (
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
              {t.browse}
            </span>
            <span className="mt-2 text-meta text-ink-400">{formatsLabel}</span>
            <input
              id={id}
              type="file"
              accept={accept}
              multiple
              className="sr-only"
              onChange={handleInput}
            />
          </label>
        )
      ) : null}

      {atLimit ? (
        <p className="text-meta text-ink-400">{t.maxFilesReached(maxFiles)}</p>
      ) : null}
    </div>
  );
}
