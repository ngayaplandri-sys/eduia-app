"use client";

import {
  BookMarked,
  Check,
  ClipboardCheck,
  Minus,
  RotateCcw,
  X,
  ThumbsUp,
  Target,
  Lightbulb,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { EmptyState } from "@/components/feedback/empty-state";
import { ResultActions } from "@/components/common/result-actions";
import {
  ResultHeader,
  DocumentSheet,
  DocumentTitle,
  DocumentMetaGrid,
  DocumentPart,
  DocumentBlock,
  DocumentFooter,
  QuestionNumber,
  type MetaItem,
} from "@/components/common/result-document";
import { formatActivityDate, slugify } from "@/lib/utils/format";
import { correctionToPlainText } from "@/lib/summary/correction-text";
import {
  downloadCorrectionPdf,
  correctionPdfFile,
} from "@/lib/summary/correction-pdf";
import { useI18n } from "@/lib/i18n/client";
import {
  localizeActivityStatus,
  localizeLevel,
  localizePageCount,
  localizeSubject,
} from "@/lib/i18n/labels";
import type { CorrectionQuestion, ExamCorrection } from "@/types";

function scoreTone(ratio: number): "success" | "info" | "warning" | "danger" {
  if (ratio >= 0.75) return "success";
  if (ratio >= 0.5) return "info";
  if (ratio >= 0.4) return "warning";
  return "danger";
}

const SCORE_BOX_TONE: Record<
  ReturnType<typeof scoreTone>,
  { box: string; number: string; bar: string }
> = {
  success: {
    box: "border-success-200 bg-success-50/60",
    number: "text-success-700",
    bar: "from-success-500 to-success-600",
  },
  info: {
    box: "border-info-200 bg-info-50/60",
    number: "text-info-700",
    bar: "from-info-500 to-info-600",
  },
  warning: {
    box: "border-warning-200 bg-warning-50/70",
    number: "text-warning-700",
    bar: "from-warning-500 to-warning-600",
  },
  danger: {
    box: "border-danger-100 bg-danger-50/70",
    number: "text-danger-600",
    bar: "from-danger-500 to-danger-600",
  },
};

const VERDICT_META: Record<
  CorrectionQuestion["verdict"],
  { tone: "success" | "warning" | "danger"; icon: LucideIcon }
> = {
  correct: { tone: "success", icon: Check },
  partial: { tone: "warning", icon: Minus },
  incorrect: { tone: "danger", icon: X },
};

/** Petit intitulé de bloc (« ÉNONCÉ », « DÉMARCHE »…). */
function BlockLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-400",
        className,
      )}
    >
      {children}
    </p>
  );
}

function QuestionRow({
  question,
  index,
  isAnswerKey,
}: {
  question: CorrectionQuestion;
  index: number;
  isAnswerKey: boolean;
}) {
  const { dict } = useI18n();
  const c = dict.corriger;
  const meta = VERDICT_META[question.verdict];
  const VerdictIcon = meta.icon;
  const steps = question.steps ?? [];

  return (
    <article className="flex gap-3 border-b border-line-soft pb-5 last:border-b-0 last:pb-0">
      <QuestionNumber>{index + 1}</QuestionNumber>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h5 className="min-w-0 flex-1 break-words text-[0.8125rem] font-bold uppercase tracking-wide text-ink-900">
            {c.questionLabel(index + 1)}
            {question.ref ? (
              <span className="ml-1.5 font-medium normal-case tracking-normal text-ink-400">
                · {question.ref}
              </span>
            ) : null}
          </h5>
          <div className="flex shrink-0 items-center gap-2">
            {isAnswerKey ? (
              <Badge tone="neutral" size="sm">
                {c.ptMax(question.pointsMax)}
              </Badge>
            ) : (
              <>
                <Badge tone={meta.tone} size="sm">
                  <VerdictIcon strokeWidth={3} aria-hidden />
                  {dict.activity.verdicts[question.verdict]}
                </Badge>
                <Badge tone="neutral" size="sm">
                  {c.ptShort(question.pointsEarned, question.pointsMax)}
                </Badge>
              </>
            )}
          </div>
        </div>

        <BlockLabel className="mt-2.5">{c.statementLabel}</BlockLabel>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-ink-900">
          {question.prompt}
        </p>

        <div
          className={
            isAnswerKey
              ? "mt-3"
              : "mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
          }
        >
          {isAnswerKey ? null : (
            <div className="min-w-0 rounded-lg border border-line-soft bg-canvas/50 px-3 py-2">
              <BlockLabel>{c.yourAnswer}</BlockLabel>
              <p className="mt-1 whitespace-pre-wrap break-words text-fine leading-snug text-ink-700">
                {question.studentAnswer || "—"}
              </p>
            </div>
          )}
          <div className="min-w-0 rounded-lg border border-success-200 bg-success-50/50 px-3 py-2">
            <BlockLabel className="text-success-700">{c.expectedAnswer}</BlockLabel>
            <p className="mt-1 whitespace-pre-wrap break-words text-fine font-medium leading-snug text-ink-900">
              {question.expectedAnswer}
            </p>
          </div>
        </div>

        {steps.length > 0 ? (
          <div className="mt-3">
            <BlockLabel>{c.stepsLabel}</BlockLabel>
            <ol className="mt-1.5 space-y-2.5 border-l-2 border-primary-100 pl-3.5">
              {steps.map((step, stepIndex) => (
                <li key={stepIndex} className="min-w-0">
                  <p className="text-meta font-semibold text-primary-600">{step.label}</p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-fine leading-relaxed text-ink-700">
                    {step.content}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {question.feedback ? (
          <div className="mt-3">
            <BlockLabel>{c.explanationLabel}</BlockLabel>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-fine leading-relaxed text-ink-700">
              {question.feedback}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function BulletList({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2 text-fine leading-relaxed">
          <span className={cn("mt-[0.45rem] size-1.5 shrink-0 rounded-full", dot)} aria-hidden />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function CorrectionReportPanel({
  correction,
  onNew,
}: {
  correction: ExamCorrection | null;
  /** « Nouvelle correction » : remet le formulaire à zéro. */
  onNew?: () => void;
}) {
  const { dict, locale } = useI18n();
  const c = dict.corriger;

  if (!correction) {
    return (
      <section className="min-w-0">
        <EmptyState
          icon={ClipboardCheck}
          title={c.emptyTitle}
          description={c.emptyBody}
          className="py-16"
        />
      </section>
    );
  }

  const isAnswerKey = correction.mode === "answer-key";
  const ratio =
    correction.maxScore > 0 ? correction.score / correction.maxScore : 0;
  const percent = Math.round(ratio * 100);
  const tone = scoreTone(ratio);
  const fileBase = `${isAnswerKey ? "corrige" : "correction"}-${slugify(
    correction.examTitle,
  )}`;
  const number = (value: number) =>
    value.toLocaleString(locale === "en" ? "en-GB" : "fr-FR", {
      maximumFractionDigits: 2,
    });
  const keyPoints = correction.keyPoints ?? [];

  const meta: MetaItem[] = [
    { label: c.metaSubject, value: localizeSubject(correction.subject, dict) },
    { label: c.metaLevel, value: correction.level ? localizeLevel(correction.level, dict) : "" },
    { label: c.metaTheme, value: correction.theme },
    {
      label: c.metaScale,
      value:
        correction.pointsSource === "exam"
          ? c.scaleFromExam(number(correction.maxScore))
          : correction.pointsSource === "proposed"
            ? c.scaleProposed(number(correction.maxScore))
            : "",
    },
    {
      label: c.metaSource,
      value:
        correction.examSource === "external"
          ? c.sourceExternal
          : correction.examSource === "eduia"
            ? c.sourceEduiaLabel
            : "",
    },
    { label: c.metaDate, value: correction.dateLabel },
    {
      label: c.metaLength,
      value: localizePageCount(correction.pageCountLabel, dict),
    },
  ].filter((item) => typeof item.value !== "string" || item.value.trim().length > 0);

  return (
    <section className="min-w-0">
      <ResultHeader
        title={isAnswerKey ? c.resultTitleAnswerKey : c.resultTitle}
        status={localizeActivityStatus(correction.status, dict)}
        statusTone={correction.status === "Corrigée" ? "success" : "warning"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ResultActions
              plainText={correctionToPlainText(correction, dict, locale)}
              fileName={`${fileBase}.txt`}
              shareTitle={c.shareTitle(correction.examTitle)}
              onDownloadPdf={() =>
                downloadCorrectionPdf(
                  correction,
                  dict,
                  locale,
                  `${fileBase}.pdf`,
                )
              }
              sharePdf={() =>
                correctionPdfFile(correction, dict, locale, `${fileBase}.pdf`)
              }
            />
            {onNew ? (
              <button
                type="button"
                onClick={onNew}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-fine font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]"
              >
                <RotateCcw className="size-4" aria-hidden />
                {c.newCorrection}
              </button>
            ) : null}
          </div>
        }
      />

      <DocumentSheet>
        <DocumentTitle subtitle={correction.examTitle}>
          {c.docTitle}
        </DocumentTitle>

        <DocumentMetaGrid items={meta} />

        {correction.notice ? (
          <p
            role="note"
            className="mt-5 flex gap-2.5 rounded-xl border border-warning-100 bg-warning-50/70 p-3.5 text-fine leading-snug text-ink-700"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-600" aria-hidden />
            <span className="min-w-0 break-words">{correction.notice}</span>
          </p>
        ) : null}

        {isAnswerKey ? (
          correction.summary ? (
            <p className="mt-5 break-words rounded-xl border border-line bg-canvas/50 p-4 text-fine leading-relaxed text-ink-700">
              {correction.summary}
            </p>
          ) : null
        ) : (
          <div
            className={cn(
              "mt-5 rounded-xl border p-5",
              SCORE_BOX_TONE[tone].box,
            )}
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <span
                className={cn(
                  "shrink-0 font-display text-display-xl font-medium leading-none",
                  SCORE_BOX_TONE[tone].number,
                )}
              >
                {number(correction.score)}
                <span className="text-lg font-bold text-ink-400">
                  {" "}
                  / {number(correction.maxScore)}
                </span>
              </span>
              {correction.appreciation ? (
                <Badge
                  tone={tone}
                  className="max-w-full whitespace-normal break-words text-left"
                >
                  {correction.appreciation}
                </Badge>
              ) : null}
            </div>
            <div
              className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-surface/70"
              role="progressbar"
              aria-valuenow={correction.score}
              aria-valuemin={0}
              aria-valuemax={correction.maxScore}
              aria-label={c.scoreAria}
            >
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out",
                  SCORE_BOX_TONE[tone].bar,
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-3 break-words text-fine leading-relaxed text-ink-700">
              {correction.summary}
            </p>
          </div>
        )}

        <DocumentPart
          title={isAnswerKey ? c.answerKeyByQuestion : c.detailByQuestion}
        >
          {correction.questions.map((question, index) => (
            <QuestionRow
              key={index}
              question={question}
              index={index}
              isAnswerKey={isAnswerKey}
            />
          ))}
        </DocumentPart>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border-2 border-ink-900 px-4 py-3">
          <span className="text-sm font-extrabold uppercase tracking-[0.04em] text-ink-900">
            {isAnswerKey ? c.totalAnswerKey : c.totalLabel}
          </span>
          <span className="font-display text-xl font-semibold tabular-nums text-ink-900">
            {isAnswerKey
              ? c.ptMax(correction.maxScore)
              : `${number(correction.score)} / ${number(correction.maxScore)}`}
          </span>
        </div>

        <div className="mt-7 space-y-4">
          {keyPoints.length > 0 ? (
            <DocumentBlock title={c.keyPoints} icon={BookMarked} tone="primary">
              <BulletList items={keyPoints} dot="bg-primary-400" />
            </DocumentBlock>
          ) : null}

          {!isAnswerKey &&
          (correction.strengths.length > 0 ||
            correction.improvements.length > 0) ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {correction.strengths.length > 0 ? (
                <DocumentBlock
                  title={c.strengths}
                  icon={ThumbsUp}
                  tone="success"
                >
                  <BulletList items={correction.strengths} dot="bg-success-500" />
                </DocumentBlock>
              ) : null}

              {correction.improvements.length > 0 ? (
                <DocumentBlock
                  title={c.improvements}
                  icon={Target}
                  tone="warning"
                >
                  <BulletList items={correction.improvements} dot="bg-warning-500" />
                </DocumentBlock>
              ) : null}
            </div>
          ) : null}

          {correction.advice.length > 0 ? (
            <DocumentBlock
              title={isAnswerKey ? c.methodAdvice : c.advice}
              icon={Lightbulb}
              tone="primary"
            >
              <ol className="space-y-2">
                {correction.advice.map((item, index) => (
                  <li
                    key={index}
                    className="flex gap-2.5 text-fine leading-relaxed"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[0.6875rem] font-bold text-primary-700">
                      {index + 1}
                    </span>
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ol>
            </DocumentBlock>
          ) : null}
        </div>

        <DocumentFooter>
          {(isAnswerKey ? c.footerAnswerKey : c.footer)(
            correction.correctedBy,
            formatActivityDate(correction.correctedAt, locale),
            correction.maxScore,
          )}
        </DocumentFooter>
      </DocumentSheet>
    </section>
  );
}
