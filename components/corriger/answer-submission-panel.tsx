"use client";

import * as React from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Field } from "@/components/ui/select";
import { ConfigSection } from "@/components/common/config-section";
import { FileDropzone, type DropzoneFile } from "@/components/common/file-dropzone";
import { OptionsList, type ToggleOption } from "@/components/common/options-list";
import { InlineErrorBanner } from "@/components/common/inline-error-banner";
import { InsufficientCreditsBanner } from "@/components/credits/insufficient-credits-banner";
import { SegmentedControl } from "@/components/common/segmented-control";
import {
  GRADING_SCALES,
  GRADING_STRICTNESS,
  PAGE_COUNTS,
  type GradingStrictness,
} from "@/lib/config/tool-options";
import { useI18n } from "@/lib/i18n/client";
import {
  localizeGradingScale,
  localizeGradingStrictness,
  localizeLevel,
  localizePageCount,
  localizeSubject,
} from "@/lib/i18n/labels";
import type { CorrectionConfig, CorrectionRequest } from "@/types";

export interface GenerateCorrectionInput {
  request: CorrectionRequest;
  /** Copie brute à faire extraire côté serveur (PDF / Word), sinon `null`. */
  file: File | null;
}

export function AnswerSubmissionPanel({
  config,
  pending,
  errorMessage,
  errorCode,
  onGenerate,
}: {
  config: CorrectionConfig;
  pending: boolean;
  errorMessage: string | null;
  errorCode?: string | null;
  onGenerate: (input: GenerateCorrectionInput) => void;
}) {
  const { dict } = useI18n();
  const t = dict.corriger;

  const correctionOptions: readonly ToggleOption[] = [
    { id: "conseils", label: t.optConseils },
    { id: "explications", label: t.optExplications },
  ];

  const [selectedExamId, setSelectedExamId] = React.useState(
    config.selectedExamId,
  );
  const [level, setLevel] = React.useState(config.level);
  const [copyFile, setCopyFile] = React.useState<DropzoneFile | null>(
    config.answerFileName
      ? { name: config.answerFileName, size: config.answerFileSize }
      : null,
  );
  const [copyExtracting, setCopyExtracting] = React.useState(false);
  const [answers, setAnswers] = React.useState("");
  const [scale, setScale] = React.useState<string>(GRADING_SCALES[0]);
  const [strictness, setStrictness] =
    React.useState<GradingStrictness>("Standard");
  const [pageCount, setPageCount] = React.useState<string>(PAGE_COUNTS[3]);
  const [options, setOptions] = React.useState<Record<string, boolean>>({
    conseils: true,
    explications: true,
  });

  const hasRawFile = Boolean(copyFile?.raw);
  const hasCopy =
    hasRawFile ||
    (copyFile?.text ?? "").trim().length > 0 ||
    answers.trim().length > 0;
  const hasReferenceExam = selectedExamId.trim().length > 0;
  // Sans copie mais avec une épreuve sélectionnée → l'IA génère le corrigé type.
  const answerKeyMode = !hasCopy && hasReferenceExam;
  const canSubmit = hasCopy || hasReferenceExam;
  const busy = pending || copyExtracting;

  function setOption(id: string, next: boolean) {
    setOptions((current) => ({ ...current, [id]: next }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !canSubmit) return;

    const selectedExam =
      config.availableExams.find((exam) => exam.id === selectedExamId)?.label ??
      "";

    const request: CorrectionRequest = {
      selectedExam,
      selectedExamId,
      level: level.trim(),
      answerFileName: copyFile?.name ?? null,
      answerSourceKind: copyFile?.kind ?? null,
      answerText: answers,
      answerSourceText: copyFile?.text ?? null,
      scale,
      strictness,
      pageCount,
      options,
    };

    onGenerate({ request, file: copyFile?.raw ?? null });
  }

  return (
    <Card className="min-w-0 p-5 sm:p-6">
      <form className="space-y-7" onSubmit={handleSubmit}>
        <ConfigSection step={1} title={t.step1}>
          <FileDropzone
            id="copy-file"
            label={t.dropLabel}
            hint={t.dropHint}
            accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,image/*"
            formatsLabel={t.formats}
            file={copyFile}
            onSelect={setCopyFile}
            onClear={() => setCopyFile(null)}
            onExtractingChange={setCopyExtracting}
            replaceable
          />

          <div className="space-y-1.5">
            <label
              htmlFor="answers"
              className="block text-fine font-medium text-ink-700"
            >
              {t.orTypeAnswers}
            </label>
            <textarea
              id="answers"
              rows={4}
              value={answers}
              onChange={(e) => setAnswers(e.target.value)}
              placeholder={t.answersPlaceholder}
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-900 transition-colors placeholder:text-ink-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <Field label={t.relatedExam} htmlFor="ref-exam">
            <Select
              id="ref-exam"
              className="truncate"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
            >
              {config.availableExams.length === 0 ? (
                <option value="">{t.noExamSaved}</option>
              ) : (
                config.availableExams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.label}
                  </option>
                ))
              )}
            </Select>
            {hasReferenceExam ? (
              <p className="text-meta leading-snug text-ink-400">
                {t.answerKeyHint}
              </p>
            ) : null}
          </Field>

          <Field label={t.level} htmlFor="ref-level">
            <Input
              id="ref-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder={t.levelPlaceholder}
              maxLength={80}
              autoComplete="off"
              required
            />
          </Field>

          {config.questionCount > 0 ? (
            <p className="text-meta break-words text-ink-400">
              {t.questionsMeta(
                config.questionCount,
                localizeSubject(config.subject, dict),
                localizeLevel(level, dict),
              )}
            </p>
          ) : null}
        </ConfigSection>

        <ConfigSection step={2} title={t.step2}>
          <Field label={t.scale} htmlFor="scale">
            <Select
              id="scale"
              value={scale}
              onChange={(e) => setScale(e.target.value)}
            >
              {GRADING_SCALES.map((option) => (
                <option key={option} value={option}>
                  {localizeGradingScale(option, dict)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="space-y-1.5">
            <span className="block text-fine font-medium text-ink-700">
              {t.strictness}
            </span>
            <SegmentedControl
              options={GRADING_STRICTNESS.map((option) => ({
                key: option,
                label: localizeGradingStrictness(option, dict),
              }))}
              value={strictness}
              onChange={setStrictness}
              columns="grid-cols-3"
            />
          </div>

          <Field label={t.correctionPages} htmlFor="correction-pages">
            <Select
              id="correction-pages"
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
            >
              {PAGE_COUNTS.map((p) => (
                <option key={p} value={p}>
                  {localizePageCount(p, dict)}
                </option>
              ))}
            </Select>
          </Field>

          <OptionsList
            idPrefix="correction-opt"
            options={correctionOptions}
            values={options}
            onChange={setOption}
          />
        </ConfigSection>

        {errorMessage && errorCode === "INSUFFICIENT_CREDITS" ? (
          <InsufficientCreditsBanner message={errorMessage} />
        ) : errorMessage ? (
          <InlineErrorBanner message={errorMessage} />
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="md"
          block
          disabled={busy || !canSubmit}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          {pending
            ? t.submitting
            : copyExtracting
              ? t.analyzingImage
              : answerKeyMode
                ? t.submitAnswerKey
                : t.submit}
        </Button>
      </form>
    </Card>
  );
}
