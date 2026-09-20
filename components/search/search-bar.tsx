"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  LoaderCircle,
  FileText,
  BookOpen,
  FilePenLine,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import { localizeSubject, localizeLevel } from "@/lib/i18n/labels";
import { formatShortDate } from "@/lib/utils/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { SearchResultItem, SearchResultType } from "@/types";

const GROUP_ORDER: SearchResultType[] = ["document", "summary", "exam", "correction"];

const GROUP_ICON: Record<SearchResultType, LucideIcon> = {
  document: FileText,
  summary: BookOpen,
  exam: FilePenLine,
  correction: ClipboardCheck,
};

function groupLabel(type: SearchResultType, t: Dictionary["layout"]): string {
  switch (type) {
    case "document":
      return t.searchGroupDocuments;
    case "summary":
      return t.searchGroupSummaries;
    case "exam":
      return t.searchGroupExams;
    case "correction":
      return t.searchGroupCorrections;
  }
}

/** Met en gras la portion du texte qui correspond à la requête. */
function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const index = text.toLowerCase().indexOf(q.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-primary-100 text-primary-800">
        {text.slice(index, index + q.length)}
      </mark>
      {text.slice(index + q.length)}
    </>
  );
}

interface SearchState {
  loading: boolean;
  results: SearchResultItem[];
}

/** Recherche débouncée (300 ms) dans `/api/search`. `[]` tant que la requête a moins de 2 caractères. */
function useLibrarySearch(query: string): SearchState {
  const [state, setState] = React.useState<SearchState>({ loading: false, results: [] });
  const trimmed = query.trim();

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setState((current) => ({ ...current, loading: true }));
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : { results: [] }))
        .then((data: { results?: SearchResultItem[] }) => {
          if (!cancelled) {
            setState({ loading: false, results: Array.isArray(data.results) ? data.results : [] });
          }
        })
        .catch(() => {
          if (!cancelled) setState({ loading: false, results: [] });
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Sous 2 caractères, aucune requête n'est jamais lancée — dérivé au rendu
  // plutôt que réinitialisé par un `setState` synchrone dans l'effet, pour
  // ne jamais afficher les résultats obsolètes d'une requête plus longue
  // précédente après un retour arrière.
  return trimmed.length < 2 ? { loading: false, results: [] } : state;
}

/** Corps des résultats — partagé entre la barre desktop et la modale mobile. */
function SearchResults({
  query,
  state,
  onNavigate,
}: {
  query: string;
  state: SearchState;
  onNavigate: () => void;
}) {
  const { dict, locale } = useI18n();
  const t = dict.layout;
  const trimmed = query.trim();

  if (trimmed.length === 0) return null;

  if (trimmed.length < 2) {
    return <p className="px-4 py-4 text-fine text-ink-400">{t.searchMinChars}</p>;
  }

  if (state.loading && state.results.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 text-fine text-ink-500">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        {t.searchLoading}
      </div>
    );
  }

  if (state.results.length === 0) {
    return (
      <div className="px-4 py-5 text-center">
        <p className="text-fine font-semibold text-ink-700">
          {t.searchEmptyTitle(trimmed)}
        </p>
        <p className="mt-1 text-fine text-ink-400">{t.searchEmptyBody}</p>
      </div>
    );
  }

  const groups = GROUP_ORDER.map((type) => ({
    type,
    items: state.results.filter((item) => item.type === type),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="max-h-[70vh] overflow-y-auto py-2 sm:max-h-[24rem]">
      {groups.map((group) => {
        const Icon = GROUP_ICON[group.type];
        return (
          <div key={group.type} className="px-1.5 py-1">
            <p className="px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-400">
              {groupLabel(group.type, t)}
            </p>
            <ul>
              {group.items.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-label={t.searchResultAria(item.title)}
                    className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-none"
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">
                        {highlightMatch(item.title, trimmed)}
                      </span>
                      <span className="block truncate text-meta text-ink-400">
                        {[localizeSubject(item.subject, dict), localizeLevel(item.level, dict), formatShortDate(item.date, locale)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Barre de recherche complète — visible à partir de `md`. */
export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const { dict } = useI18n();
  const t = dict.layout;
  const state = useLibrarySearch(query);

  const closeAndReset = React.useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const first = state.results[0];
          if (first) {
            router.push(first.href);
            closeAndReset();
          }
        }}
        className="group relative flex h-11 w-full items-center rounded-lg border border-line bg-surface pl-3 pr-1.5 transition-colors focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100"
      >
        <Search className="size-4 shrink-0 text-ink-400" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.currentTarget.blur();
              setOpen(false);
            }
          }}
          aria-label={t.searchAria}
          placeholder={t.searchPlaceholder}
          autoComplete="off"
          className="peer h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
        />
        <button
          type="submit"
          aria-label={t.runSearch}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-600 transition-colors hover:bg-canvas hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Search className="size-4" aria-hidden />
        </button>
      </form>

      {open && query.trim().length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <SearchResults query={query} state={state} onNavigate={closeAndReset} />
        </div>
      ) : null}
    </div>
  );
}

/** Déclencheur compact — visible en dessous de `md`, ouvre une modale de recherche plein écran. */
export function SearchTrigger() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const { dict } = useI18n();
  const t = dict.layout;
  const state = useLibrarySearch(query);

  return (
    <>
      <IconButton label={dict.layout.openSearch} className="md:hidden" onClick={() => setOpen(true)}>
        <Search />
      </IconButton>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setQuery("");
        }}
      >
        <DialogContent title={t.searchDialogTitle} description={t.searchDialogDescription} className="sm:max-w-md">
          <div className="mt-4 flex h-11 items-center gap-2 rounded-lg border border-line bg-canvas/50 px-3 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100">
            <Search className="size-4 shrink-0 text-ink-400" aria-hidden />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t.searchAria}
              placeholder={t.searchPlaceholder}
              autoComplete="off"
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
          </div>
          <div className="-mx-2.5 mt-1">
            <SearchResults query={query} state={state} onNavigate={() => setOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
