"use client";

import * as React from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
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
import {
  EXAM_TYPES,
  EXAM_DURATIONS,
  EXAM_QUESTION_MIX,
  EXAM_QUESTION_COUNTS,
  EXAM_TOTAL_POINTS,
  EXAM_DEFAULT_TOTAL_POINTS,
  EXAM_DIFFICULTIES,
  PAGE_COUNTS,
} from "@/lib/config/tool-options";
import { useI18n } from "@/lib/i18n/client";
import {
  localizeExamDifficulty,
  localizeExamMix,
  localizeExamType,
  localizePageCount,
} from "@/lib/i18n/labels";
import type { ExamConfig, ExamLanguage, ExamRequest } from "@/types";

export interface GenerateExamInput {
  request: ExamRequest;
  /** Fichiers bruts à faire extraire côté serveur (PDF / Word), jusqu'à 5. */
  files: File[];
}

export function ExamConfigPanel({
  config,
  pending,
  errorMessage,
  errorCode,
  onGenerate,
}: {
  config: ExamConfig;
  pending: boolean;
  errorMessage: string | null;
  errorCode?: string | null;
  onGenerate: (input: GenerateExamInput) => void;
}) {
  const { dict, locale } = useI18n();
  const t = dict.generer;

  const examOptions: readonly ToggleOption[] = [
    { id: "bareme", label: t.optBareme },
    { id: "pageGarde", label: t.optPageGarde },
    { id: "melanger", label: t.optMelanger },
    { id: "explications", label: t.optExplications },
  ];

  const [files, setFiles] = React.useState<DropzoneFile[]>([]);
  const [extracting, setExtracting] = React.useState(false);
  const [subject, setSubject] = React.useState(config.subject);
  const [level, setLevel] = React.useState(config.level);
  const [theme, setTheme] = React.useState(config.theme);
  const [examType, setExamType] = React.useState(config.examType);
  const [count, setCount] = React.useState(config.questionCount);
  const [questionMix, setQuestionMix] = React.useState(config.questionMix);
  const [duration, setDuration] = React.useState(config.durationLabel);
  const [pageCount, setPageCount] = React.useState<string>(PAGE_COUNTS[2]);
  const [totalPoints, setTotalPoints] = React.useState<number>(
    config.totalPoints ?? EXAM_DEFAULT_TOTAL_POINTS,
  );
  const [difficulty, setDifficulty] = React.useState<string>(EXAM_DIFFICULTIES[0]);
  // Par défaut, l'épreuve est rédigée dans la langue de l'application.
  const [language, setLanguage] = React.useState<ExamLanguage>(locale);
  const [institution, setInstitution] = React.useState(config.institution ?? "");
  // Aucune option cochée par défaut : c'est à l'élève de choisir ce qu'il veut
  // inclure avant de lancer la génération, pas à l'application de décider à
  // sa place.
  const [options, setOptions] = React.useState<Record<string, boolean>>({
    bareme: false,
    pageGarde: false,
    melanger: false,
    explications: false,
  });

  function setOption(id: string, next: boolean) {
    setOptions((current) => ({ ...current, [id]: next }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || extracting) return;

    // Combine les pages/fichiers sélectionnés en UN seul document : le texte
    // déjà extrait côté client (OCR / TXT) est concaténé avec des repères de
    // page, les fichiers à extraire côté serveur (PDF / Word) sont transmis
    // tels quels — l'IA lit l'ensemble en une seule fois, pas page par page.
    const rawFiles: File[] = [];
    const textChunks: string[] = [];
    files.forEach((f, index) => {
      if (f.raw) {
        rawFiles.push(f.raw);
      } else if (typeof f.text === "string" && f.text.trim()) {
        textChunks.push(`[${dict.dropzone.pageLabel(index + 1)} — ${f.name}]\n${f.text.trim()}`);
      }
    });

    const request: ExamRequest = {
      fileName:
        files.length === 1
          ? files[0].name
          : files.length > 1
            ? dict.dropzone.multiFileName(files.length)
            : null,
      sourceKind: files.length === 1 ? (files[0].kind ?? null) : files.length > 1 ? "multi" : null,
      sourceText: textChunks.length > 0 ? textChunks.join("\n\n") : null,
      subject: subject.trim(),
      level: level.trim(),
      theme: theme.trim(),
      examType,
      questionCount: count,
      questionMix,
      durationLabel: duration,
      pageCount,
      options,
      totalPoints,
      difficulty,
      language,
      institution: institution.trim(),
    };

    onGenerate({ request, files: rawFiles });
  }

  const busy = pending || extracting;

  return (
    <Card className="p-5 sm:p-6">
      <form className="space-y-7" onSubmit={handleSubmit}>
        <ConfigSection step={1} title={t.step1}>
          <MultiFileDropzone
            id="exam-source"
            label={t.dropLabel}
            hint={t.dropHint}
            accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,image/*"
            formatsLabel={t.formats}
            files={files}
            onFilesChange={setFiles}
            maxFiles={5}
            onExtractingChange={setExtracting}
          />
        </ConfigSection>

        <ConfigSection step={2} title={t.step2}>
          <Field label={t.institution} htmlFor="exam-institution">
            <Input
              id="exam-institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder={t.institutionPlaceholder}
              maxLength={120}
              autoComplete="organization"
            />
          </Field>

          <Field label={t.level} htmlFor="exam-level">
            <Input
              id="exam-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder={t.levelPlaceholder}
              maxLength={80}
              autoComplete="off"
              required
            />
          </Field>

          <Field label={t.subject} htmlFor="exam-subject">
            <Input
              id="exam-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t.subjectPlaceholder}
              maxLength={80}
              autoComplete="off"
              required
            />
          </Field>

          <Field label={t.theme} htmlFor="exam-theme">
            <Input
              id="exam-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={t.themePlaceholder}
              maxLength={200}
              autoComplete="off"
            />
          </Field>

          <Field label={t.examType} htmlFor="exam-type">
            <Select
              id="exam-type"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
            >
              {EXAM_TYPES.map((x) => (
                <option key={x} value={x}>
                  {localizeExamType(x, dict)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t.questionCount} htmlFor="exam-count">
              <Select
                id="exam-count"
                value={String(count)}
                onChange={(e) => setCount(Number(e.target.value))}
              >
                {EXAM_QUESTION_COUNTS.map((n) => (
                  <option key={n} value={n}>
                    {t.questionCountOption(n)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t.questionType} htmlFor="exam-mix">
              <Select
                id="exam-mix"
                value={questionMix}
                onChange={(e) => setQuestionMix(e.target.value)}
              >
                {EXAM_QUESTION_MIX.map((m) => (
                  <option key={m} value={m}>
                    {localizeExamMix(m, dict)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t.duration} htmlFor="exam-duration">
              <Select
                id="exam-duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                {EXAM_DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t.totalPoints} htmlFor="exam-total-points">
              <Select
                id="exam-total-points"
                value={String(totalPoints)}
                onChange={(e) => setTotalPoints(Number(e.target.value))}
              >
                {EXAM_TOTAL_POINTS.map((n) => (
                  <option key={n} value={n}>
                    {t.totalPointsOption(n)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t.difficulty} htmlFor="exam-difficulty">
              <Select
                id="exam-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                {EXAM_DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {localizeExamDifficulty(d, dict)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t.language} htmlFor="exam-language">
              <Select
                id="exam-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as ExamLanguage)}
              >
                <option value="fr">{t.languageFr}</option>
                <option value="en">{t.languageEn}</option>
              </Select>
            </Field>

            <Field label={t.pages} htmlFor="exam-pages">
              <Select
                id="exam-pages"
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
          </div>
        </ConfigSection>

        <ConfigSection step={3} title={t.step3}>
          <OptionsList
            idPrefix="exam-opt"
            options={examOptions}
            values={options}
            onChange={setOption}
          />
        </ConfigSection>

        {errorMessage && errorCode === "INSUFFICIENT_CREDITS" ? (
          <InsufficientCreditsBanner message={errorMessage} />
        ) : errorMessage ? (
          <InlineErrorBanner message={errorMessage} />
        ) : null}

        <Button type="submit" variant="primary" size="md" block disabled={busy}>
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          {pending ? t.submitting : extracting ? t.analyzingImage : t.submit}
        </Button>
      </form>
    </Card>
  );
}
