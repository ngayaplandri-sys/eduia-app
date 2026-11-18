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

/** Zoom relatif à la largeur du panneau (1 = pages ajustées à la largeur). */
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

/** Plafond de pixels d'un canevas : évite d'épuiser la mémoire d'un téléphone. */
const MAX_CANVAS_PIXELS = 12_000_000;

/** Marge intérieure autour des pages (px), de chaque côté. */
const PAGE_GUTTER = 16;

/** Espace entre deux pages (px). */
const PAGE_GAP = 12;

/** Ligne de lecture : la page qui la traverse est la « page affichée ». */
const READING_LINE = 0.3;

/** Passage montré par le professeur : placé à cette hauteur du panneau. */
const PASSAGE_LINE = 0.22;

/** Au-delà de cet écart, on saute directement à la page au lieu de défiler. */
const SMOOTH_SCROLL_PAGES = 6;

/** Rectangle en unités de la page à l'échelle 1 (multiplié par l'échelle affichée). */
interface PageRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PageSize {
  width: number;
  height: number;
}

interface PageLayout {
  top: number;
  width: number;
  height: number;
  scale: number;
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  hasEOL?: boolean;
}

interface PageText {
  items: PdfTextItem[];
  /** Matrice de la page à l'échelle 1 (inclut la rotation éventuelle). */
  transform: number[];
}

export interface PdfViewerHandle {
  /** Fait défiler jusqu'à une page et y surligne le passage cité (s'il est retrouvé). */
  showPassage: (page: number, quote?: string | null) => void;
  /** Fait défiler jusqu'au haut d'une page. */
  goToPage: (page: number) => void;
}

function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Lettres et chiffres seulement, sans accents ni casse : « Glikoliz, sitoplazmada » → « glikolizsitoplazmada ». */
function compactChars(text: string): string {
  return normalizeForSearch(text).replace(/[^\p{L}\p{N}]/gu, "");
}

/** Rectangle d'une partie `[from, to[` du texte d'un élément (largeur au prorata des caractères). */
function itemRect(
  item: PdfTextItem,
  pageTransform: number[],
  multiply: (a: number[], b: number[]) => number[],
  from: number,
  to: number,
): PageRect {
  const tx = multiply(pageTransform, item.transform);
  const fontHeight = Math.hypot(tx[2], tx[3]);
  const length = Math.max(1, item.str.length);
  return {
    left: tx[4] + item.width * (from / length),
    top: tx[5] - fontHeight * 0.95,
    width: Math.max(3, item.width * ((to - from) / length)),
    height: fontHeight * 1.2,
  };
}

/** Toutes les occurrences d'un terme de recherche, élément par élément. */
function termRects(
  text: PageText,
  term: string,
  multiply: (a: number[], b: number[]) => number[],
): PageRect[] {
  const rects: PageRect[] = [];
  for (const item of text.items) {
    if (!item.str) continue;
    const normalized = normalizeForSearch(item.str);
    let index = normalized.indexOf(term);
    while (index >= 0) {
      rects.push(itemRect(item, text.transform, multiply, index, index + term.length));
      index = normalized.indexOf(term, index + term.length);
    }
  }
  return rects;
}

/**
 * Passage cité par le professeur (quelques mots recopiés du cours). La
 * comparaison ignore espaces, ponctuation, accents et casse, et se fait sur le
 * texte de toute la page (un passage peut s'étendre sur plusieurs éléments) ;
 * si la citation n'est pas exacte, on retente avec ses premiers mots, puis ses
 * derniers.
 */
function quoteRects(
  text: PageText,
  quote: string,
  multiply: (a: number[], b: number[]) => number[],
): PageRect[] {
  let flat = "";
  const origin: { item: number; index: number }[] = [];
  text.items.forEach((item, itemIndex) => {
    for (let index = 0; index < item.str.length; index++) {
      const kept = compactChars(item.str[index]);
      for (const char of kept) {
        flat += char;
        origin.push({ item: itemIndex, index });
      }
    }
  });

  const words = quote.split(/\s+/).map(compactChars).filter(Boolean);
  const candidates: string[] = [];
  for (let count = words.length; count >= 2; count--) candidates.push(words.slice(0, count).join(""));
  for (let start = 1; start <= words.length - 2; start++) candidates.push(words.slice(start).join(""));

  for (const needle of candidates) {
    if (needle.length < 8) continue;
    const at = flat.indexOf(needle);
    if (at < 0) continue;
    const spans = new Map<number, { from: number; to: number }>();
    for (let position = at; position < at + needle.length; position++) {
      const { item, index } = origin[position];
      const span = spans.get(item);
      if (span) span.to = Math.max(span.to, index + 1);
      else spans.set(item, { from: index, to: index + 1 });
    }
    return [...spans].map(([item, span]) =>
      itemRect(text.items[item], text.transform, multiply, span.from, span.to),
    );
  }
  return [];
}

const toolButtonClass =
  "inline-flex size-7 shrink-0 items-center sm:size-8 justify-center rounded-md text-ink-500 transition-colors hover:bg-surface hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 disabled:pointer-events-none disabled:opacity-40";

/**
 * Une page du cours. Dessinée seulement quand elle est proche de la zone
 * visible (`active`), et effacée quand on s'en éloigne : un cours de 50 pages
 * ne garde en mémoire que quelques canevas. Pendant un changement de zoom,
 * l'ancien rendu reste affiché (étiré) jusqu'à ce que le nouveau soit prêt.
 */
const PdfPageView = React.memo(function PdfPageView({
  doc,
  number,
  layout,
  active,
  searchTerm,
  findTerm,
  focusRects,
  focusKey,
  label,
  errorLabel,
}: {
  doc: PDFDocumentProxy;
  number: number;
  layout: PageLayout;
  active: boolean;
  searchTerm: string;
  findTerm: (page: number, term: string) => Promise<PageRect[]>;
  focusRects: PageRect[] | null;
  focusKey: number;
  label: string;
  errorLabel: string;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [renderedScale, setRenderedScale] = React.useState<number | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [searchState, setSearchState] = React.useState<{ key: string; rects: PageRect[] }>({
    key: "",
    rects: [],
  });

  // Page éloignée : son canevas est vidé, elle sera redessinée au retour.
  const [wasActive, setWasActive] = React.useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) setRenderedScale(null);
  }

  const { scale, width, height } = layout;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!active) {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      return;
    }
    if (!scale) return;
    let cancelled = false;
    let task: { cancel: () => void } | null = null;

    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const pdfPage = await doc.getPage(number);
        if (cancelled) return;
        const viewport = pdfPage.getViewport({ scale });
        const ratio = Math.min(
          window.devicePixelRatio || 1,
          2,
          Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height)),
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
        const target = canvasRef.current;
        const context = target?.getContext("2d");
        if (cancelled || !target || !context) return;
        target.width = offscreen.width;
        target.height = offscreen.height;
        context.drawImage(offscreen, 0, 0);
        offscreen.width = 0;
        offscreen.height = 0;
        setRenderedScale(scale);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, number, scale, active]);

  // Occurrences du terme recherché sur cette page (si elle est proche).
  const searchKey = active && searchTerm.length >= 2 ? searchTerm : "";
  React.useEffect(() => {
    if (!searchKey) return;
    let cancelled = false;
    findTerm(number, searchKey)
      .then((rects) => {
        if (!cancelled) setSearchState({ key: searchKey, rects });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [findTerm, number, searchKey]);
  const searchRects = searchKey && searchState.key === searchKey ? searchState.rects : [];

  const scaled = (rect: PageRect): React.CSSProperties => ({
    left: rect.left * scale,
    top: rect.top * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  });

  return (
    <div
      data-page={number}
      aria-label={label}
      role="img"
      className="relative shrink-0 overflow-hidden bg-white shadow-card ring-1 ring-line-soft"
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        width={0}
        height={0}
        className="absolute inset-0 block"
        style={{ width, height }}
      />
      {active && renderedScale === null && !failed ? (
        <div aria-hidden className="absolute inset-0 animate-pulse bg-line-soft/50" />
      ) : null}
      {failed ? (
        <p className="absolute inset-x-0 top-1/3 px-4 text-center text-fine text-danger-600">
          {errorLabel}
        </p>
      ) : null}
      {searchRects.map((rect, index) => (
        <span
          key={`s${index}`}
          aria-hidden
          className="pointer-events-none absolute rounded-sm bg-yellow-300/50 mix-blend-multiply"
          style={scaled(rect)}
        />
      ))}
      {focusRects?.map((rect, index) => (
        <span
          key={`f${focusKey}-${index}`}
          aria-hidden
          className="voice-passage pointer-events-none absolute rounded-sm bg-primary-300/45 mix-blend-multiply"
          style={scaled(rect)}
        />
      ))}
    </div>
  );
});

/**
 * Lecteur PDF du Professeur vocal (PDF.js) : tout le cours, page après page,
 * dans un seul défilement. Numéro de la page affichée, navigation, zoom,
 * recherche dans le texte (pages trouvées + surlignage), plein écran, et
 * passage montré par le professeur pendant ses explications (`showPassage`).
 */
export function PdfViewer({
  doc,
  onPageChange,
  pageTexts,
  ref,
}: {
  doc: PDFDocumentProxy;
  /** Page qui traverse la ligne de lecture, à chaque changement. */
  onPageChange: (page: number) => void;
  /** Texte de chaque page (index 0 = page 1), une fois la lecture terminée. */
  pageTexts: string[] | null;
  ref?: React.Ref<PdfViewerHandle>;
}) {
  const { dict } = useI18n();
  const t = dict.voiceTutor;
  const pageCount = doc.numPages;

  const rootRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const [sizes, setSizes] = React.useState<PageSize[]>([]);
  const [availableWidth, setAvailableWidth] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [page, setPage] = React.useState(1);
  const [range, setRange] = React.useState({ first: 1, last: 2 });
  const [pageInput, setPageInput] = React.useState("1");

  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");

  const [focus, setFocus] = React.useState<{ key: number; page: number; rects: PageRect[] } | null>(null);

  const [nativeFullscreen, setNativeFullscreen] = React.useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = React.useState(false);
  const fullscreen = nativeFullscreen || fallbackFullscreen;

  // Champ « numéro de page » remis à jour quand la page affichée change.
  const [inputForPage, setInputForPage] = React.useState(page);
  if (inputForPage !== page) {
    setInputForPage(page);
    setPageInput(String(page));
  }

  // Position des pages dans le défilement (toutes à la largeur du panneau × zoom).
  const layout = React.useMemo<PageLayout[]>(() => {
    const width = Math.floor(availableWidth * zoom);
    const entries: PageLayout[] = [];
    let top = PAGE_GUTTER;
    for (const size of sizes) {
      const scale = width && size.width ? width / size.width : 0;
      const height = Math.floor(size.height * scale);
      entries.push({ top, width, height, scale });
      top += height + PAGE_GAP;
    }
    return entries;
  }, [sizes, availableWidth, zoom]);
  const contentHeight = layout.length
    ? layout[layout.length - 1].top + layout[layout.length - 1].height + PAGE_GUTTER
    : 0;

  // Valeurs lues par les rappels (défilement, observateur de taille, poignée).
  const layoutRef = React.useRef(layout);
  const pageRef = React.useRef(page);
  const onPageChangeRef = React.useRef(onPageChange);
  React.useEffect(() => {
    layoutRef.current = layout;
    pageRef.current = page;
    onPageChangeRef.current = onPageChange;
  });

  // Endroit lu (page + fraction de page sous la ligne de lecture) : conservé
  // quand le zoom ou la largeur changent, ou quand le panneau était masqué.
  const anchorRef = React.useRef({ page: 1, fraction: 0 });
  // Passage à montrer dès que le panneau sera visible (onglet masqué sur mobile).
  const pendingRef = React.useRef<{ page: number; offset: number | null } | null>(null);
  const hiddenRef = React.useRef(false);
  const textCacheRef = React.useRef(new Map<number, Promise<PageText>>());
  const focusCounterRef = React.useRef(0);

  // Dimensions de chaque page à l'échelle 1 : la première d'abord (toutes
  // supposées identiques), puis les vraies dimensions de chacune.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const first = (await doc.getPage(1)).getViewport({ scale: 1 });
      if (cancelled) return;
      setSizes(Array.from({ length: doc.numPages }, () => ({ width: first.width, height: first.height })));
      const all: PageSize[] = [{ width: first.width, height: first.height }];
      for (let number = 2; number <= doc.numPages; number++) {
        const viewport = (await doc.getPage(number)).getViewport({ scale: 1 });
        if (cancelled) return;
        all.push({ width: viewport.width, height: viewport.height });
      }
      const differs = all.some(
        (size) => Math.abs(size.width - first.width) > 0.5 || Math.abs(size.height - first.height) > 0.5,
      );
      if (differs) setSizes(all);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [doc]);

  const pageText = React.useCallback(
    (number: number): Promise<PageText> => {
      const cache = textCacheRef.current;
      let entry = cache.get(number);
      if (!entry) {
        entry = (async () => {
          const pdfPage = await doc.getPage(number);
          const content = await pdfPage.getTextContent();
          const items = content.items.filter(
            (item): item is typeof item & PdfTextItem => "str" in item && typeof item.str === "string",
          );
          return { items, transform: pdfPage.getViewport({ scale: 1 }).transform };
        })();
        entry.catch(() => cache.delete(number));
        cache.set(number, entry);
      }
      return entry;
    },
    [doc],
  );

  const findTerm = React.useCallback(
    async (number: number, term: string) => {
      const [pdfjs, text] = await Promise.all([loadPdfJs(), pageText(number)]);
      return termRects(text, normalizeForSearch(term.trim()), pdfjs.Util.transform);
    },
    [pageText],
  );

  /** Page sous la ligne de lecture et pages à dessiner, d'après le défilement. */
  const measure = React.useCallback(() => {
    const element = scrollRef.current;
    const pages = layoutRef.current;
    if (!element || pages.length === 0 || !pages[0].scale || element.clientHeight === 0) return;
    const viewTop = element.scrollTop;
    const viewHeight = element.clientHeight;
    const line = viewTop + viewHeight * READING_LINE;

    let reading = 1;
    for (let index = 0; index < pages.length; index++) {
      if (pages[index].top <= line) reading = index + 1;
      else break;
    }
    const entry = pages[reading - 1];
    anchorRef.current = {
      page: reading,
      fraction: entry.height ? Math.min(1, Math.max(0, (line - entry.top) / entry.height)) : 0,
    };
    // Tout en bas du défilement : c'est la dernière page qu'on lit.
    const atBottom =
      element.scrollHeight > viewHeight + 2 && viewTop + viewHeight >= element.scrollHeight - 2;
    const current = atBottom ? pages.length : reading;

    const margin = viewHeight;
    let first = pages.length;
    let last = 1;
    pages.forEach((entry, index) => {
      if (entry.top + entry.height >= viewTop - margin && entry.top <= viewTop + viewHeight + margin) {
        first = Math.min(first, index + 1);
        last = Math.max(last, index + 1);
      }
    });
    setRange((previous) =>
      previous.first === first && previous.last === last ? previous : { first, last },
    );
    if (current !== pageRef.current) {
      pageRef.current = current;
      setPage(current);
      onPageChangeRef.current(current);
    }
  }, []);

  /** Défile jusqu'à une page (et à une hauteur dans la page, en unités d'échelle 1). */
  const scrollToPage = React.useCallback(
    (target: number, offset: number | null, line: number) => {
      const element = scrollRef.current;
      const entry = layoutRef.current[target - 1];
      if (!element || !entry || !entry.scale || element.clientHeight === 0) {
        pendingRef.current = { page: target, offset };
        return;
      }
      pendingRef.current = null;
      const top =
        offset === null
          ? entry.top - PAGE_GAP
          : entry.top + offset * entry.scale - element.clientHeight * line;
      const distance = Math.abs(target - pageRef.current);
      element.scrollTo({
        top: Math.max(0, top),
        behavior: distance <= SMOOTH_SCROLL_PAGES ? "smooth" : "instant",
      });
    },
    [],
  );

  // Largeur disponible (suit le panneau) ; au retour d'un panneau masqué, on
  // revient à l'endroit lu (ou au passage montré entre-temps).
  React.useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const hidden = element.clientWidth === 0 || element.clientHeight === 0;
      const wasHidden = hiddenRef.current;
      hiddenRef.current = hidden;
      if (hidden) return;
      setAvailableWidth(Math.max(0, element.clientWidth - PAGE_GUTTER * 2));
      if (wasHidden) {
        requestAnimationFrame(() => {
          const pending = pendingRef.current;
          if (pending) {
            scrollToPage(pending.page, pending.offset, PASSAGE_LINE);
          } else {
            const { page: anchorPage, fraction } = anchorRef.current;
            const entry = layoutRef.current[anchorPage - 1];
            if (entry) element.scrollTop = entry.top + fraction * entry.height - element.clientHeight * READING_LINE;
          }
          measure();
        });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure, scrollToPage]);

  // Mise en page changée (zoom, largeur, vraies dimensions) : même endroit lu.
  React.useLayoutEffect(() => {
    // La nouvelle mise en page doit être lue tout de suite par `measure`.
    layoutRef.current = layout;
    const element = scrollRef.current;
    if (!element || layout.length === 0 || !layout[0].scale || element.clientHeight === 0) return;
    const pending = pendingRef.current;
    if (pending && layout[pending.page - 1]?.scale) {
      scrollToPage(pending.page, pending.offset, PASSAGE_LINE);
    } else {
      const { page: anchorPage, fraction } = anchorRef.current;
      const entry = layout[anchorPage - 1];
      if (entry && (anchorPage > 1 || fraction > 0)) {
        element.scrollTop = entry.top + fraction * entry.height - element.clientHeight * READING_LINE;
      }
    }
    measure();
  }, [layout, measure, scrollToPage]);

  React.useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      element.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [measure]);

  const goToPage = React.useCallback(
    (target: number) => {
      const clamped = Math.min(pageCount, Math.max(1, target));
      scrollToPage(clamped, null, 0);
    },
    [pageCount, scrollToPage],
  );

  const showPassage = React.useCallback(
    (target: number, quote?: string | null) => {
      if (!Number.isInteger(target) || target < 1 || target > pageCount) return;
      focusCounterRef.current += 1;
      const key = focusCounterRef.current;
      const cited = quote?.trim();
      if (!cited) {
        setFocus({ key, page: target, rects: [] });
        scrollToPage(target, null, 0);
        return;
      }
      // Le passage est cherché d'abord (quelques millisecondes) : un seul
      // défilement, directement à la bonne hauteur ; sinon, le haut de la page.
      (async () => {
        const [pdfjs, text] = await Promise.all([loadPdfJs(), pageText(target)]);
        return quoteRects(text, cited, pdfjs.Util.transform);
      })()
        .catch(() => [] as PageRect[])
        .then((rects) => {
          if (focusCounterRef.current !== key) return;
          setFocus({ key, page: target, rects });
          if (rects.length === 0) scrollToPage(target, null, 0);
          else scrollToPage(target, Math.min(...rects.map((rect) => rect.top)), PASSAGE_LINE);
        });
    },
    [pageCount, pageText, scrollToPage],
  );

  React.useImperativeHandle(ref, () => ({ showPassage, goToPage }), [showPassage, goToPage]);

  // Pages contenant le terme recherché (texte déjà extrait du document).
  const matches = React.useMemo(() => {
    const term = normalizeForSearch(searchTerm.trim());
    if (!pageTexts || term.length < 2) return [];
    return pageTexts.flatMap((text, index) =>
      normalizeForSearch(text).includes(term) ? [index + 1] : [],
    );
  }, [pageTexts, searchTerm]);
  const matchPosition = matches.indexOf(page);

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
    void findTerm(target, term)
      .then((rects) =>
        scrollToPage(target, rects.length ? Math.min(...rects.map((rect) => rect.top)) : null, PASSAGE_LINE),
      )
      .catch(() => scrollToPage(target, null, 0));
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
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPage(page - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToPage(page + 1);
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
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          aria-label={t.prevPage}
          title={t.prevPage}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          className={toolButtonClass}
          onClick={() => goToPage(page + 1)}
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
            if (Number.isFinite(value)) goToPage(value);
            else setPageInput(String(page));
          }}
        >
          <input
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ""))}
            onBlur={() => {
              const value = Number.parseInt(pageInput, 10);
              if (Number.isFinite(value) && value !== page) goToPage(value);
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
        {layout.length && layout[0].scale ? (
          <div
            className="flex min-w-fit flex-col items-center"
            style={{ padding: PAGE_GUTTER, gap: PAGE_GAP, minHeight: contentHeight }}
          >
            {layout.map((entry, index) => {
              const number = index + 1;
              return (
                <PdfPageView
                  key={number}
                  doc={doc}
                  number={number}
                  layout={entry}
                  active={number >= range.first && number <= range.last}
                  searchTerm={searchTerm.trim()}
                  findTerm={findTerm}
                  focusRects={focus?.page === number ? focus.rects : null}
                  focusKey={focus?.page === number ? focus.key : 0}
                  label={t.pageAria(number, pageCount)}
                  errorLabel={t.renderError}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex justify-center" style={{ padding: PAGE_GUTTER }}>
            <div
              aria-hidden
              className="w-full max-w-xl animate-pulse rounded-sm bg-line-soft/60"
              style={{ aspectRatio: "1 / 1.3" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
