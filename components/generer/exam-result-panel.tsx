"use client";

import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { ResultActions } from "@/components/common/result-actions";
import {
  ResultHeader,
  DocumentSheet,
  DocumentTitle,
  DocumentMetaGrid,
  DocumentPart,
  DocumentFooter,
  QuestionNumber,
} from "@/components/common/result-document";
import { formatActivityDate, slugify } from "@/lib/utils/format";
import { examToPlainText } from "@/lib/summary/exam-text";
import { downloadExamPdf, examPdfFile } from "@/lib/summary/exam-pdf";
import { useI18n } from "@/lib/i18n/client";
import {
  localizeActivityStatus,
  localizeExamType,
  localizeLevel,
  localizePageCount,
  localizeSubject,
} from "@/lib/i18n/labels";
import type { ExamPart, ExamQuestion, GeneratedExam } from "@/types";

/** Cercle à cocher (copie vierge). */
function Bubble() {
  return (
    <span
      className="inline-block size-4 shrink-0 rounded-full border border-ink-400"
      aria-hidden
    />
  );
}

function QcmQuestion({ question, n }: { question: ExamQuestion; n: number }) {
  return (
    <div className="flex gap-3">
      <QuestionNumber>{n}</QuestionNumber>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-ink-900">{question.prompt}</p>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {question.choices?.map((choice) => (
            <span
              key={choice.letter}
              className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-fine text-ink-700"
            >
              <Bubble />
              <span>
                <span className="font-semibold text-ink-900">
                  {choice.letter}.
                </span>{" "}
                {choice.text}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function OpenQuestion({ question, n }: { question: ExamQuestion; n: number }) {
  const { dict } = useI18n();
  return (
    <div className="flex gap-3">
      <QuestionNumber>{n}</QuestionNumber>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-relaxed text-ink-900">
            {question.prompt}
          </p>
          <span className="shrink-0 text-[0.75rem] font-semibold text-primary-600">
            {dict.generer.points(question.points)}
          </span>
        </div>
        {question.subQuestions && question.subQuestions.length > 0 ? (
          <ol className="mt-2 space-y-1 text-fine text-ink-700">
            {question.subQuestions.map((sub, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 font-semibold text-ink-500">
                  {i + 1}.
                </span>
                <span>{sub}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}

function TrueFalseQuestion({ question }: { question: ExamQuestion }) {
  const { dict } = useI18n();
  const g = dict.generer;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] border-collapse text-fine">
        <thead>
          <tr className="border-y border-line text-ink-500">
            <th className="py-2 pr-3 text-left font-semibold">{g.tfStatements}</th>
            <th className="w-16 py-2 text-center font-semibold">{g.tfTrue}</th>
            <th className="w-16 py-2 text-center font-semibold">{g.tfFalse}</th>
          </tr>
        </thead>
        <tbody>
          {question.statements?.map((statement, i) => (
            <tr key={i} className="border-b border-line-soft align-top">
              <td className="py-2.5 pr-3 text-ink-900">
                <span className="mr-1.5 font-semibold text-ink-500">
                  {i + 1}.
                </span>
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
  );
}

function PartQuestions({ part }: { part: ExamPart }) {
  return (
    <>
      {part.questions.map((question, i) => {
        if (question.kind === "truefalse") {
          return <TrueFalseQuestion key={i} question={question} />;
        }
        // Numérotation par partie : compte les questions numérotables avant celle-ci.
        const n =
          part.questions
            .slice(0, i)
            .filter((q) => q.kind !== "truefalse").length + 1;
        return question.kind === "qcm" ? (
          <QcmQuestion key={i} question={question} n={n} />
        ) : (
          <OpenQuestion key={i} question={question} n={n} />
        );
      })}
    </>
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

  return (
    <section>
      <ResultHeader
        title={t.resultTitle}
        status={localizeActivityStatus(exam.status, dict)}
        statusTone={exam.status === "Prête" ? "success" : "warning"}
        actions={
          <ResultActions
            plainText={examToPlainText(exam, dict)}
            fileName={`epreuve-${fileBase}.txt`}
            shareTitle={t.shareTitle(
              localizeSubject(exam.subject, dict),
              localizeLevel(exam.level, dict),
            )}
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
        <DocumentTitle>{exam.title}</DocumentTitle>

        <DocumentMetaGrid
          items={[
            { label: t.metaLevel, value: localizeLevel(exam.level, dict) },
            { label: t.metaDuration, value: exam.durationLabel },
            { label: t.metaSubject, value: localizeSubject(exam.subject, dict) },
            { label: t.metaQuestionCount, value: exam.questionCount },
            { label: t.metaTheme, value: exam.theme },
            {
              label: t.metaLength,
              value: localizePageCount(exam.pageCountLabel, dict),
            },
            {
              label: t.metaExamType,
              value: localizeExamType(exam.examType, dict),
            },
            { label: t.metaDate, value: exam.dateLabel },
            {
              label: t.metaName,
              value: (
                <span className="inline-block w-56 max-w-full translate-y-1 border-b border-ink-400" />
              ),
            },
          ]}
        />

        {exam.parts.map((part) => (
          <DocumentPart
            key={part.title}
            title={part.title}
            points={part.points}
            instructions={part.instructions}
          >
            <PartQuestions part={part} />
          </DocumentPart>
        ))}

        <DocumentFooter>
          {t.footerGoodWork} <span aria-hidden>🎓</span>
        </DocumentFooter>
      </DocumentSheet>

      <p
        data-print-hide
        className="mt-3 flex flex-col gap-1 text-meta text-ink-400 sm:flex-row sm:items-center sm:justify-between"
      >
        <span>
          {t.footerBy(
            exam.generatedBy,
            formatActivityDate(exam.generatedAt, locale),
          )}
        </span>
        <span>{t.footerScale(exam.totalPoints)}</span>
      </p>
    </section>
  );
}
