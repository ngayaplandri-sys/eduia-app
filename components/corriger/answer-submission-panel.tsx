"use client";

import * as React from "react";
import { BadgeCheck, LoaderCircle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Field } from "@/components/ui/select";
import { ConfigSection } from "@/components/common/config-section";
import {
  MultiFileDropzone,
  type DropzoneFile,
} from "@/components/common/multi-file-dropzone";
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
  localizePageCount,
} from "@/lib/i18n/labels";
import type { CorrectionConfig, CorrectionRequest } from "@/types";

/** Pages d'une épreuve importée en une fois (aligné sur la route). */
const MAX_EXAM_PAGES = 10;
/** Pages / fichiers de copie. */
const MAX_COPY_FILES = 5;

const UPLOAD_ACCEPT = ".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,image/*";

export interface GenerateCorrectionInput {
  request: CorrectionRequest;
  /** Pages de l'épreuve importée ou scannée, dans l'ordre (vide = aucune). */
  examFiles: File[];
  /** Copie jointe en fichier (PDF / Word) ; les photos sont déjà transcrites. */
  copyFiles: File[];
}

type ExamSource = "import" | "eduia";

/**
 * Formulaire de « Corriger une épreuve », en trois temps :
 *  1. l'épreuve — importée ou scannée depuis n'importe quelle source (PDF,
 *     photos, Word… plusieurs pages = une épreuve), ou choisie parmi les
 *     épreuves générées avec EduIA ;
 *  2. la copie de l'élève, facultative : sans copie, EduIA rédige le corrigé ;
 *  3. les options de correction.
 */
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

  const hasEduiaExams = config.availableExams.length > 0;
  const [source, setSource] = React.useState<ExamSource>("import");
  const [examFiles, setExamFiles] = React.useState<DropzoneFile[]>([]);
  const [selectedExamId, setSelectedExamId] = React.useState(
    config.selectedExamId,
  );
  const [copyFiles, setCopyFiles] = React.useState<DropzoneFile[]>([]);
  const [answers, setAnswers] = React.useState("");
  const [level, setLevel] = React.useState("");
  const [scale, setScale] = React.useState<string>(GRADING_SCALES[0]);
  const [strictness, setStrictness] =
    React.useState<GradingStrictness>("Standard");
  const [pageCount, setPageCount] = React.useState<string>(PAGE_COUNTS[3]);
  const [options, setOptions] = React.useState<Record<string, boolean>>({
    conseils: true,
    explications: true,
  });
  const [examPreparing, setExamPreparing] = React.useState(false);
  const [copyExtracting, setCopyExtracting] = React.useState(false);

  const usingEduia = source === "eduia" && hasEduiaExams && selectedExamId.length > 0;
  const hasImportedExam = source === "import" && examFiles.length > 0;
  const hasCopy =
    copyFiles.length > 0 || answers.trim().length > 0;
  const canSubmit = hasImportedExam || usingEduia || hasCopy;
  const busy = pending || examPreparing || copyExtracting;

  function setOption(id: string, next: boolean) {
    setOptions((current) => ({ ...current, [id]: next }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !canSubmit) return;

    const selectedExam = usingEduia
      ? (config.availableExams.find((exam) => exam.id === selectedExamId)?.label ?? "")
      : "";

    // Pages de copie déjà lues (photos transcrites, TXT) : une seule copie,
    // repérée page par page quand il y en a plusieurs.
    const textPages = copyFiles
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => file.text?.trim());
    const answerSourceText =
      textPages.length === 0
        ? null
        : copyFiles.length === 1
          ? (textPages[0].file.text ?? null)
          : textPages
              .map(
                ({ file, index }) =>
                  `[${dict.dropzone.pageLabel(index + 1)} — ${file.name}]\n${file.text}`,
              )
              .join("\n\n");

    const request: CorrectionRequest = {
      selectedExam,
      selectedExamId: usingEduia ? selectedExamId : "",
      level: level.trim(),
      answerFileName:
        copyFiles.length === 0
          ? null
          : copyFiles.length === 1
            ? copyFiles[0].name
            : dict.dropzone.multiFileName(copyFiles.length),
      answerSourceKind: copyFiles[0]?.kind ?? null,
      answerText: answers,
      answerSourceText,
      scale,
      strictness,
      pageCount,
      options,
    };

    const rawOf = (files: DropzoneFile[]) =>
      files.map((file) => file.raw).filter((file): file is File => Boolean(file));

    onGenerate({
      request,
      examFiles: source === "import" ? rawOf(examFiles) : [],
      copyFiles: rawOf(copyFiles),
    });
  }

  const submitLabel = pending
    ? t.submitting
    : examPreparing || copyExtracting
      ? t.analyzingImage
      : hasCopy
        ? t.submit
        : usingEduia
          ? t.submitAnswerKey
          : t.submitExam;

  return (
    <Card className="min-w-0 p-5 sm:p-6">
      <form className="space-y-7" onSubmit={handleSubmit}>
        <div className="flex gap-3 rounded-xl border border-primary-100 bg-primary-50/70 p-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
            <BadgeCheck className="size-[1.15rem]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-fine font-semibold leading-snug text-ink-900">
              {t.anySourceTitle}
            </p>
            <p className="mt-1 text-meta leading-snug text-ink-500">{t.anySourceBody}</p>
          </div>
        </div>

        <ConfigSection step={1} title={t.stepExam}>
          {hasEduiaExams ? (
            <SegmentedControl<ExamSource>
              options={[
                { key: "import", label: t.sourceImport },
                { key: "eduia", label: t.sourceEduia },
              ]}
              value={source}
              onChange={setSource}
              columns="grid-cols-2"
            />
          ) : null}

          {source === "import" || !hasEduiaExams ? (
            <>
              <MultiFileDropzone
                id="exam-files"
                label={t.examDropLabel}
                hint={t.examDropHint}
                accept={UPLOAD_ACCEPT}
                formatsLabel={t.examFormats}
                files={examFiles}
                onFilesChange={setExamFiles}
                maxFiles={MAX_EXAM_PAGES}
                imageMode="raw"
                onExtractingChange={setExamPreparing}
              />
              <p className="text-meta leading-snug text-ink-400">{t.examAutoDetect}</p>
            </>
          ) : (
            <Field label={t.relatedExam} htmlFor="ref-exam">
              <Select
                id="ref-exam"
                className="truncate"
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
              >
                {config.availableExams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.label}
                  </option>
                ))}
              </Select>
              <p className="text-meta leading-snug text-ink-400">{t.answerKeyHint}</p>
            </Field>
          )}
        </ConfigSection>

        <ConfigSection step={2} title={t.stepCopy} description={t.copyHint}>
          <MultiFileDropzone
            id="copy-files"
            label={t.dropLabel}
            hint={t.dropHint}
            accept={UPLOAD_ACCEPT}
            formatsLabel={t.formats}
            files={copyFiles}
            onFilesChange={setCopyFiles}
            maxFiles={MAX_COPY_FILES}
            compact
            onExtractingChange={setCopyExtracting}
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
        </ConfigSection>

        <ConfigSection step={3} title={t.step2}>
          <Field label={t.level} htmlFor="ref-level">
            <Input
              id="ref-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder={t.levelPlaceholder}
              maxLength={80}
              autoComplete="off"
            />
          </Field>

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
            <p className="text-meta leading-snug text-ink-400">{t.scaleHint}</p>
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
          {pending || examPreparing || copyExtracting ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          {submitLabel}
        </Button>
      </form>
    </Card>
  );
}
