"use client";

import * as React from "react";
import { Search, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { useI18n } from "@/lib/i18n/client";
import { localizeSubject } from "@/lib/i18n/labels";
import type { DocumentFile } from "@/types";
import { DocumentCard } from "./document-card";

/** Valeur sentinelle du filtre « toutes les matières » (jamais une vraie matière). */
const ALL_SUBJECTS = "__all__";

type SortKey = "recent" | "name" | "pages";

export function DocumentLibrary({
  documents,
  initialQuery = "",
}: {
  documents: DocumentFile[];
  /** Pré-remplit la recherche — utilisé quand on arrive depuis `/documents?q=…` (barre de recherche du header). */
  initialQuery?: string;
}) {
  const { dict } = useI18n();
  const t = dict.documents;
  const sorts: { key: SortKey; label: string }[] = [
    { key: "recent", label: t.sortRecent },
    { key: "name", label: t.sortName },
    { key: "pages", label: t.sortPages },
  ];

  const [list, setList] = React.useState(documents);
  const [query, setQuery] = React.useState(initialQuery);
  const [subject, setSubject] = React.useState(ALL_SUBJECTS);
  const [sort, setSort] = React.useState<SortKey>("recent");

  const handleRename = React.useCallback((id: string, name: string) => {
    setList((current) =>
      current.map((doc) => (doc.id === id ? { ...doc, name } : doc)),
    );
  }, []);

  const handleDelete = React.useCallback((id: string) => {
    setList((current) => current.filter((doc) => doc.id !== id));
  }, []);

  const subjects = React.useMemo(
    () => [
      ALL_SUBJECTS,
      ...[...new Set(list.map((doc) => doc.subject))].sort((a, b) =>
        a.localeCompare(b),
      ),
    ],
    [list],
  );

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = list.filter((doc) => {
      const matchesQuery =
        q === "" ||
        doc.name.toLowerCase().includes(q) ||
        doc.subject.toLowerCase().includes(q);
      const matchesSubject =
        subject === ALL_SUBJECTS || doc.subject === subject;
      return matchesQuery && matchesSubject;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "pages") return b.pageCount - a.pageCount;
      return b.uploadedAt.localeCompare(a.uploadedAt);
    });
  }, [list, query, subject, sort]);

  return (
    <Card className="p-5 sm:p-6">
      {/* Barre d'outils */}
      <div className="flex flex-col gap-3 border-b border-line-soft pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-title-sm font-bold text-ink-900">
            {t.libraryTitle}
          </h2>
          <span className="rounded-full bg-canvas px-2 py-0.5 text-[0.6875rem] font-semibold text-ink-500">
            {t.countLabel(visible.length)}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-[15rem]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchAria}
              className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-ink-900 transition-colors placeholder:text-ink-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <Select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label={t.filterBySubject}
            className="h-10 sm:w-[12rem]"
          >
            {subjects.map((option) => (
              <option key={option} value={option}>
                {option === ALL_SUBJECTS
                  ? t.allSubjects
                  : localizeSubject(option, dict)}
              </option>
            ))}
          </Select>

          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label={t.sortAria}
            className="h-10 sm:w-[11rem]"
          >
            {sorts.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t.emptyTitle}
          description={t.emptyBody}
          action={{ label: t.emptyCta, href: "/resumer" }}
          className="mt-5 border-0 py-12"
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t.noneFoundTitle}
          description={t.noneFoundBody}
          className="mt-5 border-0 py-12"
        />
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((doc) => (
            <DocumentCard
              key={doc.id}
              file={doc}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
