"use client";

import { BookOpen, FileText, ListChecks, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { ResultActions } from "@/components/common/result-actions";
import {
  ResultHeader,
  DocumentSheet,
  DocumentTitle,
  DocumentMetaGrid,
  DocumentBlock,
  DocumentFooter,
  type MetaItem,
} from "@/components/common/result-document";
import { formatActivityDate, slugify } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { buildSummaryOutline } from "@/lib/summary/outline";
import { summaryToPlainText } from "@/lib/summary/plain-text";
import { downloadSummaryPdf, summaryPdfFile } from "@/lib/summary/summary-pdf";
import { useI18n } from "@/lib/i18n/client";
import {
  localizeActivityStatus,
  localizeLevel,
  localizePageCount,
  localizeSubject,
  localizeSummaryStyle,
} from "@/lib/i18n/labels";
import type { CourseSummary, SummaryBullet } from "@/types";

export function SummaryResultPanel({
  summary,
}: {
  summary: CourseSummary | null;
}) {
  const { dict, locale } = useI18n();
  const t = dict.resumer;

  if (!summary) {
    return (
      <section>
        <EmptyState
          icon={FileText}
          title={t.emptyTitle}
          description={t.emptyBody}
          className="py-16"
        />
      </section>
    );
  }

  return (
    <section>
      <ResultHeader
        title={t.resultTitle}
        status={localizeActivityStatus(summary.status, dict)}
        statusTone={summary.status === "Prêt" ? "success" : "warning"}
        actions={
          <ResultActions
            plainText={summaryToPlainText(summary, dict)}
            fileName={`resume-${slugify(summary.title)}.txt`}
            shareTitle={t.shareTitle(summary.title)}
            onDownloadPdf={() =>
              downloadSummaryPdf(
                summary,
                dict,
                locale,
                `resume-${slugify(summary.title)}.pdf`,
              )
            }
            sharePdf={() =>
              summaryPdfFile(
                summary,
                dict,
                locale,
                `resume-${slugify(summary.title)}.pdf`,
              )
            }
          />
        }
      />

      <DocumentSheet>
        <DocumentTitle>{summary.title}</DocumentTitle>

        <DocumentMetaGrid
          items={[
            { label: t.metaLevel, value: localizeLevel(summary.level, dict) },
            {
              label: t.metaStyle,
              value: localizeSummaryStyle(summary.styleLabel, dict),
            },
            {
              label: t.metaSubject,
              value: localizeSubject(summary.subject, dict),
            },
            {
              label: t.metaLength,
              value: localizePageCount(summary.pageCountLabel, dict),
            },
            ...(summary.chapter?.trim()
              ? [
                  {
                    label: t.metaChapter,
                    value: summary.chapter.trim(),
                  } satisfies MetaItem,
                ]
              : []),
            ...(summary.theme?.trim()
              ? [
                  {
                    label: t.metaTheme,
                    value: summary.theme.trim(),
                  } satisfies MetaItem,
                ]
              : []),
            ...(summary.pagesSummarized > 0
              ? [
                  {
                    label: t.metaCoursePages,
                    value: summary.pagesSummarized,
                  } satisfies MetaItem,
                ]
              : []),
          ]}
        />

        <div className="mt-8 space-y-10">
          {buildSummaryOutline(summary.sections).map((part) => (
            <section key={part.number} aria-labelledby={`part-${part.number}`}>
              {/* Grande partie : numéro + titre centrés, filet sous le titre. */}
              <header className="mx-auto flex max-w-2xl flex-col items-center px-2 text-center">
                <span
                  className="grid size-8 place-items-center rounded-full bg-primary-100 text-sm font-bold tabular-nums text-primary-700 ring-1 ring-primary-200"
                  aria-hidden
                >
                  {part.number}
                </span>
                <h4
                  id={`part-${part.number}`}
                  className="mt-2.5 text-base font-extrabold uppercase tracking-[0.04em] text-balance text-ink-900 [overflow-wrap:anywhere] sm:text-lg"
                >
                  <span className="sr-only">{part.number}. </span>
                  {part.heading}
                </h4>
                <span
                  className="mt-2.5 h-0.5 w-12 rounded-full bg-primary-300"
                  aria-hidden
                />
              </header>

              <OutlineContent
                paragraphs={part.paragraphs}
                bullets={part.bullets}
                className="mt-4"
              />

              {part.subsections.map((sub) => (
                <div key={sub.number} className="mt-6">
                  {/* Sous-partie : « 1.1 Sous-titre », centrée, un cran sous la partie. */}
                  <h5 className="mx-auto max-w-2xl px-2 text-center text-[0.95rem] font-bold text-balance text-ink-900 [overflow-wrap:anywhere] sm:text-base">
                    <span className="mr-1.5 font-extrabold tabular-nums text-primary-600">
                      {sub.number}
                    </span>
                    {sub.heading}
                  </h5>
                  <OutlineContent
                    paragraphs={sub.paragraphs}
                    bullets={sub.bullets}
                    className="mt-2.5"
                  />
                </div>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-7 space-y-4">
          {summary.keyConcepts.length > 0 ? (
            <DocumentBlock
              title={t.blockKeyConcepts}
              icon={Sparkles}
              tone="primary"
            >
              <ul className="flex flex-wrap gap-2">
                {summary.keyConcepts.map((concept) => (
                  <li
                    key={concept}
                    className="rounded-md border border-primary-200 bg-surface px-2.5 py-1 text-fine font-medium text-primary-700"
                  >
                    {concept}
                  </li>
                ))}
              </ul>
            </DocumentBlock>
          ) : null}

          {summary.definitions.length > 0 ? (
            <DocumentBlock
              title={t.blockDefinitions}
              icon={BookOpen}
              tone="primary"
            >
              <dl className="space-y-2">
                {summary.definitions.map((entry) => (
                  <div key={entry.term} className="text-fine leading-relaxed">
                    <dt className="font-semibold text-ink-900">{entry.term}</dt>
                    <dd className="text-ink-700">{entry.definition}</dd>
                  </div>
                ))}
              </dl>
            </DocumentBlock>
          ) : null}

          {summary.keyPoints.length > 0 ? (
            <DocumentBlock
              title={t.blockKeyPoints}
              icon={ListChecks}
              tone="success"
            >
              <ul className="space-y-1.5">
                {summary.keyPoints.map((point, index) => (
                  <li
                    key={index}
                    className="flex gap-2 text-fine leading-relaxed text-ink-700"
                  >
                    <span
                      className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-success-500"
                      aria-hidden
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </DocumentBlock>
          ) : null}
        </div>

        <DocumentFooter>
          {t.footer(
            summary.generatedBy,
            formatActivityDate(summary.generatedAt, locale),
          )}
        </DocumentFooter>
      </DocumentSheet>
    </section>
  );
}

/**
 * Explication sous un titre de partie / sous-partie : alignée à gauche pour la
 * lecture, dans une colonne centrée de largeur confortable (~70 caractères).
 */
function OutlineContent({
  paragraphs,
  bullets,
  className,
}: {
  paragraphs: string[];
  bullets: SummaryBullet[];
  className?: string;
}) {
  if (paragraphs.length === 0 && bullets.length === 0) return null;

  return (
    <div className={cn("mx-auto max-w-[70ch] space-y-2", className)}>
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className="text-sm leading-relaxed text-pretty text-ink-700"
        >
          {paragraph}
        </p>
      ))}

      {bullets.length > 0 ? (
        <ul className="space-y-1.5">
          {bullets.map((bullet, index) => (
            <li
              key={index}
              className="flex gap-2.5 text-sm leading-relaxed text-ink-700"
            >
              <span
                className="mt-[0.5rem] size-1.5 shrink-0 rounded-full bg-primary-300"
                aria-hidden
              />
              <span>
                {bullet.lead ? (
                  <strong className="font-semibold text-ink-900">
                    {bullet.lead}{" "}
                  </strong>
                ) : null}
                {bullet.text}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
