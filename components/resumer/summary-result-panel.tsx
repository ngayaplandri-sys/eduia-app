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
import type { CourseSummary } from "@/types";

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

        <div className="mt-6 space-y-5">
          {summary.sections.map((section) => (
            <section key={section.heading}>
              <h4 className="text-[0.95rem] font-bold text-ink-900">
                {section.heading}
              </h4>

              {section.paragraphs?.map((paragraph, index) => (
                <p
                  key={index}
                  className="mt-2 text-sm leading-relaxed text-ink-700"
                >
                  {paragraph}
                </p>
              ))}

              {section.bullets ? (
                <ul className="mt-2 space-y-1.5">
                  {section.bullets.map((bullet, index) => (
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
