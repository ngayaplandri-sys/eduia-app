"use client";

import * as React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Maximize,
  Minimize,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import { loadPdfJs } from "./pdf-document";

/** Zoom relatif à la largeur du panneau (1 = page ajustée à la largeur). */
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

/** Plafond de pixels du canevas : évite d'épuiser la mémoire d'un téléphone. */
const MAX_CANVAS_PIXELS = 12_000_000;

/** Marge intérieure autour de la page (px), de chaque côté. */
const PAGE_GUTTER = 16;

interface HighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const toolButtonClass =
  "inline-flex size-7 shrink-0 items-center sm:size-8 justify-center rounded-md text-ink-500 transition-colors hover:bg-surface hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 disabled:pointer-events-none disabled:opacity-40";

/**
 * Lecteur PDF du Professeur vocal (PDF.js) : une page à la fois, navigation,
 * numéro de page, zoom, recherche dans le texte du document (pages trouvées
 * + surlignage sur la page affichée) et plein écran.
 */
export function PdfViewer({
  doc,
  page,
  onPageChange,
  pageTexts,
}: {
  doc: PDFDocumentProxy;
  page: number;
  onPageChange: (page: number) => void;
  /** Texte de chaque page (index 0 = page 1), une fois la lecture terminée. */
  pageTexts: string[] | null;
}) {
  const { dict } = useI18n();
  const t = dict.voiceTutor;
  const pageCount = doc.numPages;

  const rootRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const [availableWidth, setAvailableWidth] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [rendered, setRendered] = React.useState<{
    page: number;
    scale: number;
    width: number;
    height: number;
  } | null>(null);
  const [renderError, setRenderError] = React.useState(false);
  const [pageInput, setPageInput] = React.useState(String(page));

  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [highlightState, setHighlightState] = React.useState<{
    key: string;
    rects: HighlightRect[];
  }>({ key: "", rects: [] });

  const [nativeFullscreen, setNativeFullscreen] = React.useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = React.useState(false);
  const fullscreen = nativeFullscreen || fallbackFullscreen;

  // Champ « numéro de page » remis à jour quand la page change ailleurs.
  const [inputForPage, setInputForPage] = React.useState(page);
  if (inputForPage !== page) {
    setInputForPage(page);
    setPageInput(String(page));
  }

  const highlightTerm = normalizeForSearch(searchTerm.trim());
  const highlightKey =
    rendered && highlightTerm.length >= 2
      ? `${rendered.page}:${rendered.scale}:${highlightTerm}`
      : "";
  const highlights = highlightKey && highlightState.key === highlightKey ? highlightState.rects : [];

  // Largeur disponible pour la page (suit le redimensionnement du panneau).
  React.useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setAvailableWidth(Math.max(0, element.clientWidth - PAGE_GUTTER * 2));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Rendu de la page dans un canevas hors écran, recopié ensuite d'un bloc :
  // pas de page blanche intermédiaire pendant un changement de zoom.
  React.useEffect(() => {
    if (!availableWidth) return;
    let cancelled = false;
    let task: { cancel: () => void } | null = null;

    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const pdfPage = await doc.getPage(page);
        if (cancelled) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const scale = (availableWidth / base.width) * zoom;
        const viewport = pdfPage.getViewport({ scale });
        const area = viewport.width * viewport.height;
        const ratio = Math.min(
          window.devicePixelRatio || 1,
          2,
          Math.sqrt(MAX_CANVAS_PIXELS / area),
        );

        const offscreen = document.createElement("canvas");
        offscreen.width = Math.floor(viewport.width * ratio);
        offscreen.height = Math.floor(viewport.height * ratio);
        const renderTask = pdfPage.render({
          canvas: offscreen,
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        task = renderTask;
        try {
          await renderTask.promise;
        } catch (error) {
          if (error instanceof pdfjs.RenderingCancelledException) return;
          throw error;
        }
        if (cancelled) return;

        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        canvas.width = offscreen.width;
        canvas.height = offscreen.height;
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        context.drawImage(offscreen, 0, 0);
        offscreen.width = 0;
        offscreen.height = 0;
        setRendered({ page, scale, width: viewport.width, height: viewport.height });
        setRenderError(false);
      } catch {
        if (!cancelled) setRenderError(true);
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, page, zoom, availableWidth]);

  // Surlignage des occurrences recherchées sur la page affichée.
  React.useEffect(() => {
    const term = highlightTerm;
    if (!rendered || !highlightKey) return;
    let cancelled = false;
    (async () => {
      const pdfjs = await loadPdfJs();
      const pdfPage = await doc.getPage(rendered.page);
      const viewport = pdfPage.getViewport({ scale: rendered.scale });
      const content = await pdfPage.getTextContent();
      if (cancelled) return;
      const rects: HighlightRect[] = [];
      for (const item of content.items) {
        if (!("str" in item) || !item.str) continue;
        const text = normalizeForSearch(item.str);
        let index = text.indexOf(term);
        if (index < 0) continue;
        const tx = pdfjs.Util.transform(viewport.transform, item.transform);
        const fontHeight = Math.hypot(tx[2], tx[3]);
        const fullWidth = item.width * rendered.scale;
        while (index >= 0) {
          rects.push({
            left: tx[4] + fullWidth * (index / text.length),
            top: tx[5] - fontHeight * 0.95,
            width: Math.max(4, fullWidth * (term.length / text.length)),
            height: fontHeight * 1.2,
          });
          index = text.indexOf(term, index + term.length);
        }
      }
      setHighlightState({ key: highlightKey, rects });
      if (rects.length > 0) {
        scrollRef.current?.scrollTo({
          top: Math.max(0, rects[0].top - 80),
          behavior: "smooth",
        });
      }
    })().catch(() => {
      if (!cancelled) setHighlightState({ key: highlightKey, rects: [] });
    });
    return () => {
      cancelled = true;
    };
  }, [doc, rendered, highlightKey, highlightTerm]);

  // Pages contenant le terme recherché (texte déjà extrait du document).
  const matches = React.useMemo(() => {
    const term = normalizeForSearch(searchTerm.trim());
    if (!pageTexts || term.length < 2) return [];
    return pageTexts.flatMap((text, index) =>
      normalizeForSearch(text).includes(term) ? [index + 1] : [],
    );
  }, [pageTexts, searchTerm]);
  const matchPosition = matches.indexOf(page);

  function goTo(target: number) {
    const clamped = Math.min(pageCount, Math.max(1, target));
    if (clamped !== page) onPageChange(clamped);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  function runSearch(direction: 1 | -1 = 1) {
    const term = query.trim();
    if (term.length < 2) return;
    const termChanged = term !== searchTerm;
    setSearchTerm(term);
    const normalized = normalizeForSearch(term);
    const found = (pageTexts ?? []).flatMap((text, index) =>
      normalizeForSearch(text).includes(normalized) ? [index + 1] : [],
    );
    if (found.length === 0) return;
    const target = termChanged
      ? found.find((number) => number >= page) ?? found[0]
      : direction === 1
        ? found.find((number) => number > page) ?? found[0]
        : [...found].reverse().find((number) => number < page) ?? found[found.length - 1];
    if (target !== page) onPageChange(target);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    setSearchTerm("");
  }

  function changeZoom(direction: 1 | -1) {
    const index = ZOOM_STEPS.findIndex((step) => step >= zoom - 0.001);
    const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, index + direction))];
    setZoom(next);
  }

  React.useEffect(() => {
    const onChange = () => setNativeFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (fallbackFullscreen) {
      setFallbackFullscreen(false);
      return;
    }
    // iPhone : pas d'API plein écran pour un élément → affichage en surimpression.
    if (rootRef.current?.requestFullscreen) {
      try {
        await rootRef.current.requestFullscreen();
        return;
      } catch {
        // Repli ci-dessous.
      }
    }
    setFallbackFullscreen(true);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("input, select, textarea")) return;
    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      goTo(page - 1);
    } else if (event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      goTo(page + 1);
    } else if (event.key === "Escape" && fallbackFullscreen) {
      setFallbackFullscreen(false);
    }
  }

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      ref={rootRef}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex min-h-0 flex-1 flex-col bg-surface",
        fullscreen && "p-3 sm:p-4",
        fallbackFullscreen && "fixed inset-0 z-50",
      )}
    >
      <div
        role="toolbar"
        aria-label={t.viewerToolbar}
        className="flex shrink-0 flex-wrap items-center justify-center gap-0.5 rounded-xl bg-canvas px-1.5 py-1.5 ring-1 ring-line-soft sm:gap-1.5 sm:px-2"
      >
        <button
          type="button"
          className={toolButtonClass}
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          aria-label={t.prevPage}
          title={t.prevPage}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          className={toolButtonClass}
          onClick={() => goTo(page + 1)}
          disabled={page >= pageCount}
          aria-label={t.nextPage}
          title={t.nextPage}
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>

        <form
          className="flex items-center gap-1 px-0.5 text-fine text-ink-500 sm:gap-1.5 sm:px-1"
          onSubmit={(event) => {
            event.preventDefault();
            const value = Number.parseInt(pageInput, 10);
            if (Number.isFinite(value)) goTo(value);
            else setPageInput(String(page));
          }}
        >
          <input
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ""))}
            onBlur={() => {
              const value = Number.parseInt(pageInput, 10);
              if (Number.isFinite(value)) goTo(value);
              else setPageInput(String(page));
            }}
            inputMode="numeric"
            aria-label={t.pageNumber}
            className="h-7 w-10 rounded-md bg-surface text-center text-sm font-semibold sm:h-8 sm:w-11 text-ink-900 ring-1 ring-line-soft focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <span aria-hidden>/ {pageCount}</span>
        </form>

        <span aria-hidden className="mx-0.5 hidden h-5 w-px bg-line-soft sm:block" />

        <button
          type="button"
          className={toolButtonClass}
          onClick={() => changeZoom(-1)}
          disabled={zoom <= ZOOM_STEPS[0]}
          aria-label={t.zoomOut}
          title={t.zoomOut}
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <div className="relative hidden sm:block">
          <select
            value={String(zoom)}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label={t.zoomLabel}
            className="h-8 cursor-pointer appearance-none rounded-md bg-surface pl-2.5 pr-7 text-fine font-semibold text-ink-900 ring-1 ring-line-soft focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            {ZOOM_STEPS.map((step) => (
              <option key={step} value={String(step)}>
                {Math.round(step * 100)}%
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
        </div>
        <span className="w-9 text-center text-meta font-semibold text-ink-700 min-[400px]:w-10 sm:hidden">
          {zoomPercent}%
        </span>
        <button
          type="button"
          className={toolButtonClass}
          onClick={() => changeZoom(1)}
          disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
          aria-label={t.zoomIn}
          title={t.zoomIn}
        >
          <Plus className="size-4" aria-hidden />
        </button>

        <span aria-hidden className="mx-0.5 hidden h-5 w-px bg-line-soft sm:block" />

        <button
          type="button"
          className={cn(toolButtonClass, searchOpen && "bg-primary-100 text-primary-700")}
          onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          disabled={!pageTexts}
          aria-pressed={searchOpen}
          aria-label={t.search}
          title={t.search}
        >
          <Search className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          className={toolButtonClass}
          onClick={() => void toggleFullscreen()}
          aria-label={fullscreen ? t.exitFullscreen : t.fullscreen}
          title={fullscreen ? t.exitFullscreen : t.fullscreen}
        >
          {fullscreen ? (
            <Minimize className="size-4" aria-hidden />
          ) : (
            <Maximize className="size-4" aria-hidden />
          )}
        </button>
      </div>

      {searchOpen ? (
        <form
          role="search"
          className="mt-2 flex shrink-0 items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            runSearch(1);
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") closeSearch();
              }}
              placeholder={t.searchPlaceholder}
              aria-label={t.search}
              className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <span aria-live="polite" className="shrink-0 px-1 text-meta font-medium text-ink-500">
            {searchTerm.trim().length >= 2
              ? matches.length === 0
                ? t.searchNoResult
                : t.searchResults(matchPosition >= 0 ? matchPosition + 1 : 0, matches.length)
              : null}
          </span>
          <button
            type="button"
            className={toolButtonClass}
            onClick={() => runSearch(-1)}
            disabled={matches.length === 0}
            aria-label={t.searchPrev}
            title={t.searchPrev}
          >
            <ChevronUp className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className={toolButtonClass}
            onClick={() => runSearch(1)}
            disabled={query.trim().length < 2}
            aria-label={t.searchNext}
            title={t.searchNext}
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className={toolButtonClass}
            onClick={closeSearch}
            aria-label={t.closeSearch}
            title={t.closeSearch}
          >
            <X className="size-4" aria-hidden />
          </button>
        </form>
      ) : null}

      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label={t.pageAria(page, pageCount)}
        className="mt-2 min-h-0 flex-1 overflow-auto rounded-xl bg-canvas ring-1 ring-line-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200"
      >
        <div
          className="flex min-h-full min-w-fit justify-center"
          style={{ padding: PAGE_GUTTER }}
        >
          <div className="relative h-fit shrink-0 bg-white shadow-card ring-1 ring-line-soft">
            <canvas ref={canvasRef} className="block" />
            {!rendered ? (
              <div
                aria-hidden
                className="animate-pulse bg-line-soft/60"
                style={{ width: Math.max(availableWidth, 200), height: Math.max(availableWidth, 200) * 1.3 }}
              />
            ) : null}
            {highlights.map((rect, index) => (
              <span
                key={index}
                aria-hidden
                className="pointer-events-none absolute rounded-sm bg-yellow-300/50 mix-blend-multiply"
                style={rect}
              />
            ))}
          </div>
        </div>
        {renderError ? (
          <p role="alert" className="px-4 pb-4 text-center text-fine text-danger-600">
            {t.renderError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
