"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
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
import { CameraScanButton } from "@/components/common/camera-scanner";
import {
  recognizeImage,
  prepareImage,
  describeOcrFailure,
  describeOcrStep,
  OcrError,
  MAX_IMAGE_BYTES,
  type OcrProgress,
} from "@/lib/ocr/recognize-image";

export type DropzoneFileKind = "pdf" | "docx" | "txt" | "image" | "other";

export interface DropzoneFile {
  name: string;
  size: string;
  /** Catégorie déduite du type MIME / de l'extension. */
  kind?: DropzoneFileKind;
  /**
   * Texte exploitable par l'IA :
   * - `image` → texte transcrit par le modèle de vision (`recognizeImage`) ;
   * - `txt`  → contenu lu directement ;
   * - `pdf` / `docx` → `null` (extraction faite côté serveur à partir de `raw`).
   */
  text?: string | null;
  /** Photo lisible seulement en partie (passages marqués [illisible]). */
  partiallyReadable?: boolean;
  /**
   * Fichier brut transmis au serveur : PDF / Word (extraction côté serveur) et,
   * en mode `imageMode="raw"`, toutes les pages (photos comprises, redimensionnées).
   */
  raw?: File;
}

type ProcessResult =
  | { ok: true; file: DropzoneFile; warning: string | null }
  | { ok: false; message: string };

function detectKind(file: File): DropzoneFileKind {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/.test(name)) {
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

/** Miniature d'une page photographiée (URL locale libérée au démontage). */
function ImageThumb({ file }: { file: File }) {
  const imgRef = React.useRef<HTMLImageElement>(null);
  React.useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    if (imgRef.current) imgRef.current.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  // eslint-disable-next-line @next/next/no-img-element -- aperçu local (URL blob)
  return <img ref={imgRef} alt="" className="size-full object-cover" />;
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
  /**
   * Traitement des photos :
   *  - `transcribe` (défaut) : texte lu par l'IA dès l'import (`recognizeImage`) ;
   *  - `raw` : la photo elle-même est transmise (redimensionnée), pour que le
   *    modèle voie aussi graphiques, cartes et schémas — sa lisibilité est
   *    vérifiée côté serveur, à l'analyse.
   */
  imageMode?: "transcribe" | "raw";
  /** Bouton « Scanner avec la caméra » (défaut : affiché). */
  scan?: boolean;
  /** Zone vide plus basse, pour une étape secondaire du formulaire. */
  compact?: boolean;
  /** Notifie le parent quand une extraction (OCR) est en cours. */
  onExtractingChange?: (busy: boolean) => void;
  id?: string;
}

type Phase =
  | { status: "idle" }
  | { status: "reading"; fileName: string; ratio: number; step: string; index: number; total: number };

/**
 * Zone de dépôt multi-fichiers (jusqu'à `maxFiles`) pour les outils acceptant
 * plusieurs pages/fichiers traités comme UN seul document (« Résumer un
 * cours », « Générer une épreuve », « Corriger une épreuve »).
 *
 * Chaque fichier ajouté — importé, glissé-déposé ou scanné avec la caméra —
 * passe par le même pipeline (lecture IA d'une photo, lecture directe d'un
 * TXT, extraction serveur des PDF/DOCX via `raw`). Les pages se réordonnent
 * (l'IA les lit dans cet ordre). Une photo illisible n'est jamais écartée en
 * silence : son nom et le motif précis sont affichés.
 */
export function MultiFileDropzone({
  label,
  hint,
  accept,
  formatsLabel,
  files,
  onFilesChange,
  maxFiles = 5,
  imageMode = "transcribe",
  scan = true,
  compact = false,
  onExtractingChange,
  id,
}: MultiFileDropzoneProps) {
  const { dict, locale } = useI18n();
  const t = dict.dropzone;
  const [dragging, setDragging] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>({ status: "idle" });
  const [notices, setNotices] = React.useState<string[]>([]);

  const atLimit = files.length >= maxFiles;
  const busy = phase.status === "reading";

  async function processOne(picked: File): Promise<ProcessResult> {
    const kind = detectKind(picked);
    const base: DropzoneFile = {
      name: picked.name,
      size: formatBytes(picked.size, locale),
      kind,
    };

    if (kind === "image" && imageMode === "raw") {
      try {
        if (picked.size > MAX_IMAGE_BYTES) throw new OcrError("too_large");
        const prepared = await prepareImage(picked);
        const name = picked.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
        const raw = new File([prepared], name, { type: prepared.type || "image/jpeg" });
        return {
          ok: true,
          file: { ...base, name, size: formatBytes(raw.size, locale), text: null, raw },
          warning: null,
        };
      } catch (error) {
        return {
          ok: false,
          message: t.fileFailed(picked.name, describeOcrFailure(error, t)),
        };
      }
    }

    if (kind === "image") {
      try {
        const { text, quality } = await recognizeImage(
          picked,
          (progress: OcrProgress) => {
            setPhase((current) =>
              current.status === "reading"
                ? {
                    ...current,
                    ratio: progress.ratio,
                    step: describeOcrStep(progress.step, t),
                  }
                : current,
            );
          },
        );
        const partiallyReadable = quality === "partial";
        return {
          ok: true,
          file: { ...base, text, partiallyReadable },
          warning: partiallyReadable ? t.partialWarning(picked.name) : null,
        };
      } catch (error) {
        return {
          ok: false,
          message: t.fileFailed(picked.name, describeOcrFailure(error, t)),
        };
      }
    }

    if (kind === "txt" && imageMode !== "raw") {
      try {
        const text = await picked.text();
        return { ok: true, file: { ...base, text }, warning: null };
      } catch {
        return { ok: true, file: { ...base, text: null }, warning: null };
      }
    }

    // PDF / DOCX / autre (et TXT en mode `raw`) : traitement côté serveur.
    return { ok: true, file: { ...base, text: null, raw: picked }, warning: null };
  }

  async function pickMany(picked: File[]) {
    if (picked.length === 0) return;

    const room = maxFiles - files.length;
    if (room <= 0) {
      setNotices([t.maxFilesReached(maxFiles)]);
      return;
    }

    const accepted = picked.slice(0, room);
    const truncated = picked.length > accepted.length;

    onExtractingChange?.(true);
    setNotices([]);
    const next = [...files];
    const messages: string[] = [];

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
      if (result.ok) {
        next.push(result.file);
        onFilesChange([...next]);
        if (result.warning) messages.push(result.warning);
      } else {
        messages.push(result.message);
      }
    }

    setPhase({ status: "idle" });
    onExtractingChange?.(false);

    if (truncated) messages.unshift(t.tooManySelected(maxFiles, accepted.length));
    setNotices(messages);
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
    setNotices([]);
  }

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= files.length) return;
    const next = [...files];
    [next[index], next[target]] = [next[target], next[index]];
    onFilesChange(next);
  }

  const dragHandlers = {
    onDragOver: (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setDragging(false);
    },
    onDrop,
  };

  return (
    <div className="space-y-2.5">
      {files.length > 0 ? (
        <ol className="space-y-2">
          {files.map((file, index) => {
            const isImage = file.kind === "image";
            const thumb = isImage && file.raw ? file.raw : null;
            return (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-canvas/40 p-3"
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg",
                    thumb
                      ? "border border-line bg-surface"
                      : isImage
                        ? "bg-success-100 text-success-600"
                        : "bg-danger-100 text-danger-500",
                  )}
                >
                  {thumb ? (
                    <ImageThumb file={thumb} />
                  ) : isImage ? (
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
                    {file.partiallyReadable ? (
                      <span className="inline-flex items-center gap-0.5 font-medium text-warning-600">
                        <TriangleAlert className="size-3.5" aria-hidden />
                        {t.partialText}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 font-medium text-success-600">
                        <CircleCheck className="size-3.5" aria-hidden />
                        {thumb
                          ? t.readyForAnalysis
                          : isImage
                            ? t.textExtracted
                            : t.imported}
                      </span>
                    )}
                  </p>
                </div>
                {files.length > 1 ? (
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      aria-label={t.movePageUp(index + 1)}
                      disabled={index === 0 || busy}
                      onClick={() => move(index, -1)}
                      className="rounded-md p-1 text-ink-400 transition-colors hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-30"
                    >
                      <ChevronUp className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={t.movePageDown(index + 1)}
                      disabled={index === files.length - 1 || busy}
                      onClick={() => move(index, 1)}
                      className="rounded-md p-1 text-ink-400 transition-colors hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-30"
                    >
                      <ChevronDown className="size-4" aria-hidden />
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  aria-label={t.removeFileNamed(file.name)}
                  disabled={busy}
                  onClick={() => removeAt(index)}
                  className="shrink-0 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}

      {busy ? (
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

      {notices.length > 0 ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-warning-100 bg-warning-50/70 p-3"
        >
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-warning-600"
            aria-hidden
          />
          {notices.length === 1 ? (
            <p className="min-w-0 flex-1 text-fine leading-snug text-ink-700">
              {notices[0]}
            </p>
          ) : (
            <ul className="min-w-0 flex-1 list-disc space-y-1 pl-4 text-fine leading-snug text-ink-700">
              {notices.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            aria-label={t.close}
            onClick={() => setNotices([])}
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

      {!busy && !atLimit ? (
        files.length > 0 ? (
          <label
            htmlFor={id}
            {...dragHandlers}
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
            {...dragHandlers}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 text-center transition-colors",
              compact ? "py-5" : "py-8",
              dragging
                ? "border-primary-400 bg-primary-50"
                : "border-primary-200 bg-primary-50/60 hover:border-primary-300 hover:bg-primary-50",
            )}
          >
            <span
              className={cn(
                "mb-2 flex items-center justify-center rounded-full bg-primary-100 text-primary-600",
                compact ? "size-10" : "size-12",
              )}
            >
              <CloudUpload className={compact ? "size-5" : "size-6"} aria-hidden />
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

      {scan && !busy && !atLimit ? (
        <CameraScanButton
          maxShots={maxFiles - files.length}
          onCapture={(captured) => void pickMany(captured)}
        />
      ) : null}

      {atLimit ? (
        <p className="text-meta text-ink-400">{t.maxFilesReached(maxFiles)}</p>
      ) : null}
    </div>
  );
}
