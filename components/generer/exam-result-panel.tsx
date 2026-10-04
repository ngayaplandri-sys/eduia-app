"use client";

import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { ResultActions } from "@/components/common/result-actions";
import { ResultHeader, DocumentSheet } from "@/components/common/result-document";
import { formatActivityDate, slugify } from "@/lib/utils/format";
import { examToPlainText } from "@/lib/summary/exam-text";
import { downloadExamPdf, examPdfFile } from "@/lib/summary/exam-pdf";
import {
  examDocLabels,
  examLanguage,
  layoutExam,
  localizeExamTypeFor,
  subQuestionLetter,
  type ExamDocLabels,
  type LaidOutDocument,
  type LaidOutPart,
  type LaidOutQuestion,
} from "@/lib/summary/exam-layout";
import { useI18n } from "@/lib/i18n/client";
import {
  localizeActivityStatus,
  localizeExamType,
  localizeLevel,
  localizeSubject,
} from "@/lib/i18n/labels";
import type { GeneratedExam } from "@/types";

/** Cercle à cocher (copie vierge). */
function Bubble() {
  return (
    <span
      className="inline-block size-4 shrink-0 rounded-full border border-ink-400"
      aria-hidden
    />
  );
}

/** Lignes pointillées de l'espace réponse. */
function AnswerLines({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div className="mt-2.5" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-7 border-b border-dotted border-ink-400/70" />
      ))}
    </div>
  );
}

/** Points d'une question, alignés à droite. */
function Points({ value, labels }: { value: number; labels: ExamDocLabels }) {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-md bg-primary-50 px-1.5 py-0.5 text-[0.75rem] font-semibold tabular-nums text-primary-700">
      {labels.points(value)}
    </span>
  );
}

function ExamDocumentBox({
  doc,
  labels,
}: {
  doc: LaidOutDocument;
  labels: ExamDocLabels;
}) {
  return (
    <figure className="rounded-lg border border-line bg-canvas/60 p-4">
      <figcaption className="text-fine font-bold text-ink-900">
        {labels.document} {doc.number}
        {doc.title ? <span className="font-semibold"> — {doc.title}</span> : null}
      </figcaption>
      {doc.content ? (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-800">
          {doc.content}
        </p>
      ) : null}
      {doc.table ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-fine">
            <thead>
              <tr>
                {doc.table.columns.map((column, i) => (
                  <th
                    key={i}
                    className="border border-line bg-surface px-2.5 py-1.5 text-left font-semibold text-ink-900"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doc.table.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className="border border-line px-2.5 py-1.5 align-top text-ink-800"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {doc.source ? (
        <p className="mt-2 text-meta italic text-ink-500">
          {labels.source} : {doc.source}
        </p>
      ) : null}
    </figure>
  );
}

function ExamQuestionItem({
  item,
  labels,
}: {
  item: LaidOutQuestion;
  labels: ExamDocLabels;
}) {
  const { question } = item;
  return (
    <div className="break-inside-avoid">
      <div className="flex items-start gap-3">
        <span className="mt-px inline-flex h-6 min-w-9 shrink-0 items-center justify-center rounded-md bg-primary-100 px-1.5 text-badge font-bold tabular-nums text-primary-700">
          {item.label}
        </span>
        <p className="min-w-0 flex-1 whitespace-pre-line text-sm leading-relaxed text-ink-900">
          {item.prompt}
        </p>
        <Points value={question.points} labels={labels} />
      </div>

      <div className="sm:pl-12">
        {question.kind === "qcm" && question.choices ? (
          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {question.choices.map((choice) => (
              <span
                key={choice.letter}
                className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-fine text-ink-700"
              >
                <Bubble />
                <span>
                  <span className="font-semibold text-ink-900">{choice.letter}.</span>{" "}
                  {choice.text}
                </span>
              </span>
            ))}
          </div>
        ) : null}

        {question.kind === "truefalse" && question.statements ? (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-fine">
              <thead>
                <tr className="border-y border-line text-ink-500">
                  <th className="py-2 pr-3 text-left font-semibold">{labels.tfStatements}</th>
                  <th className="w-14 py-2 text-center font-semibold">{labels.tfTrue}</th>
                  <th className="w-14 py-2 text-center font-semibold">{labels.tfFalse}</th>
                </tr>
              </thead>
              <tbody>
                {question.statements.map((statement, i) => (
                  <tr key={i} className="border-b border-line-soft align-top">
                    <td className="py-2.5 pr-3 text-ink-900">
                      <span className="mr-1.5 font-semibold text-ink-500">{i + 1}.</span>
                      {statement.text}
                    </td>
                    <td className="py-2.5 text-center">
                      <Bubble />
                    </td>
                    <td className="py-2.5 text-center">
                      <Bubble />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {item.subQuestions.length > 0 ? (
          <ol className="mt-2 space-y-1.5 text-sm text-ink-800">
            {item.subQuestions.map((sub, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 font-semibold text-ink-500">
                  {subQuestionLetter(i)})
                </span>
                <span className="min-w-0">{sub}</span>
              </li>
            ))}
          </ol>
        ) : null}

        <AnswerLines count={item.answerLines} />
      </div>
    </div>
  );
}

function ExamPartSection({
  part,
  labels,
}: {
  part: LaidOutPart;
  labels: ExamDocLabels;
}) {
  return (
    <section className="mt-9" aria-labelledby={`exam-part-${part.letter}`}>
      <header className="flex items-end justify-between gap-3 border-b-2 border-ink-900 pb-2">
        <div className="min-w-0">
          <p className="text-badge font-extrabold uppercase tracking-[0.14em] text-primary-600">
            {labels.part} {part.letter}
          </p>
          <h4
            id={`exam-part-${part.letter}`}
            className="mt-1 text-base font-extrabold uppercase tracking-[0.03em] text-balance text-ink-900 [overflow-wrap:anywhere] sm:text-lg"
          >
            {part.title}
          </h4>
        </div>
        <span className="shrink-0 pb-0.5 text-fine font-bold tabular-nums text-ink-700">
          {labels.points(part.points)}
        </span>
      </header>

      {part.instructions ? (
        <p className="mt-2.5 text-fine italic text-ink-500">{part.instructions}</p>
      ) : null}

      <div className="mt-5 space-y-6">
        {part.documents.map((doc) => (
          <ExamDocumentBox key={doc.number} doc={doc} labels={labels} />
        ))}
        {part.questions.map((item) => (
          <ExamQuestionItem key={item.label} item={item} labels={labels} />
        ))}
      </div>
    </section>
  );
}

/** Champ à remplir de l'en-tête (« Nom et prénom : ______ »). */
function BlankLine({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block translate-y-1 border-b border-ink-400 ${className ?? "w-full"}`}
    />
  );
}

export function ExamResultPanel({ exam }: { exam: GeneratedExam | null }) {
  const { dict, locale } = useI18n();
  const t = dict.generer;

  const fileBase = exam ? slugify(exam.title || `${exam.subject} ${exam.level}`) : "";

  if (!exam) {
    return (
      <section>
        <EmptyState
          icon={FileQuestion}
          title={t.emptyTitle}
          description={t.emptyBody}
          className="py-16"
        />
      </section>
    );
  }

  const labels = examDocLabels(examLanguage(exam, locale));
  // Épreuves anciennes (sans langue enregistrée) : valeurs localisées comme avant.
  const legacy = !exam.language;
  const subject = legacy ? localizeSubject(exam.subject, dict) : exam.subject;
  const level = legacy ? localizeLevel(exam.level, dict) : exam.level;
  const examType = legacy
    ? localizeExamType(exam.examType, dict)
    : localizeExamTypeFor(exam.examType, labels);
  const parts = layoutExam(exam);

  // `wide` : ligne pleine largeur (un chapitre long ne se coupe pas en deux).
  const headerRows: { label: string; value: React.ReactNode; wide?: boolean }[] = [
    { label: labels.subject, value: subject },
    { label: labels.level, value: level },
    ...(exam.theme?.trim()
      ? [{ label: labels.theme, value: exam.theme.trim(), wide: true }]
      : []),
    { label: labels.duration, value: exam.durationLabel },
    { label: labels.scale, value: labels.points(exam.totalPoints) },
    { label: labels.date, value: exam.dateLabel },
  ];

  return (
    <section>
      <ResultHeader
        title={t.resultTitle}
        status={localizeActivityStatus(exam.status, dict)}
        statusTone={exam.status === "Prête" ? "success" : "warning"}
        actions={
          <ResultActions
            plainText={examToPlainText(exam, dict, locale)}
            fileName={`epreuve-${fileBase}.txt`}
            shareTitle={t.shareTitle(subject, level)}
            onDownloadPdf={() =>
              downloadExamPdf(exam, dict, locale, `epreuve-${fileBase}.pdf`)
            }
            sharePdf={() =>
              examPdfFile(exam, dict, locale, `epreuve-${fileBase}.pdf`)
            }
          />
        }
      />

      <DocumentSheet>
        {/* ── En-tête de l'épreuve ── */}
        <header className="rounded-lg border-2 border-ink-900">
          {exam.institution ? (
            <p className="border-b border-ink-900 px-4 py-2 text-center text-fine font-bold uppercase tracking-[0.06em] text-ink-900 [overflow-wrap:anywhere]">
              {exam.institution}
            </p>
          ) : null}
          <div className="px-4 py-3.5 text-center">
            <h3 className="text-lg font-extrabold uppercase tracking-[0.02em] text-balance text-ink-900 [overflow-wrap:anywhere] sm:text-xl">
              {exam.title}
            </h3>
            <p className="mt-1 text-fine font-medium text-ink-500">{examType}</p>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 border-t border-ink-900 px-4 py-3 text-fine sm:grid-cols-2">
            {headerRows.map((row) => (
              <div key={row.label} className={`flex gap-2 ${row.wide ? "sm:col-span-2" : ""}`}>
                <dt className="shrink-0 font-semibold text-ink-700">{row.label} :</dt>
                <dd className="min-w-0 flex-1 break-words text-ink-900">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-end gap-2 border-t border-ink-900 px-4 py-3 text-fine">
            <span className="shrink-0 font-semibold text-ink-700">{labels.name} :</span>
            <BlankLine />
          </div>
        </header>

        {/* ── Consignes générales ── */}
        {exam.generalInstructions?.length ? (
          <section className="mt-6 rounded-lg border border-line bg-canvas/60 px-4 py-3">
            <h4 className="text-fine font-bold uppercase tracking-[0.06em] text-ink-900">
              {labels.generalInstructions}
            </h4>
            <ul className="mt-2 space-y-1">
              {exam.generalInstructions.map((instruction, i) => (
                <li key={i} className="flex gap-2 text-fine leading-relaxed text-ink-700">
                  <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-ink-400" aria-hidden />
                  <span>{instruction}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {parts.map((part) => (
          <ExamPartSection key={part.letter} part={part} labels={labels} />
        ))}

        {/* ── Fin de l'épreuve : total, appréciation, signature ── */}
        <footer className="mt-10 break-inside-avoid border-t-2 border-ink-900 pt-5">
          <p className="flex items-end justify-end gap-2 text-base font-extrabold text-ink-900">
            {labels.total} :
            <BlankLine className="w-16" />
            <span className="tabular-nums">/ {exam.totalPoints}</span>
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem]">
            <div className="rounded-lg border border-line p-3">
              <p className="text-fine font-semibold text-ink-700">{labels.appreciation}</p>
              <div className="mt-1" aria-hidden>
                <div className="h-7 border-b border-dotted border-ink-400/70" />
                <div className="h-7 border-b border-dotted border-ink-400/70" />
              </div>
            </div>
            <div className="min-h-24 rounded-lg border border-line p-3">
              <p className="text-fine font-semibold text-ink-700">{labels.signature}</p>
            </div>
          </div>
          <p className="mt-6 text-center text-fine font-semibold text-ink-500">
            {labels.goodWork}
          </p>
        </footer>
      </DocumentSheet>

      <p
        data-print-hide
        className="mt-3 flex flex-col gap-1 text-meta text-ink-400 sm:flex-row sm:items-center sm:justify-between"
      >
        <span>
          {t.footerBy(exam.generatedBy, formatActivityDate(exam.generatedAt, locale))}
        </span>
        <span>{t.footerScale(exam.totalPoints)}</span>
      </p>
    </section>
  );
}
