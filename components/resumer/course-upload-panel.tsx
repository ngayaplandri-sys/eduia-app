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
  SUMMARY_STYLES,
  SUMMARY_DETAIL_LEVELS,
  PAGE_COUNTS,
} from "@/lib/config/tool-options";
import { useI18n } from "@/lib/i18n/client";
import {
  localizePageCount,
  localizeSummaryDetail,
  localizeSummaryStyle,
} from "@/lib/i18n/labels";
import type { CourseDocument, SummaryRequest } from "@/types";

export interface GenerateSummaryInput {
  request: SummaryRequest;
  /** Fichiers bruts à faire extraire côté serveur (PDF / Word), jusqu'à 5. */
  files: File[];
}

export function CourseUploadPanel({
  courseDocument,
  pending,
  errorMessage,
  errorCode,
  onGenerate,
}: {
  courseDocument: CourseDocument;
  pending: boolean;
  errorMessage: string | null;
  errorCode?: string | null;
  onGenerate: (input: GenerateSummaryInput) => void;
}) {
  const { dict } = useI18n();
  const t = dict.resumer;

  const summaryOptions: readonly ToggleOption[] = [
    { id: "pointsEssentiels", label: t.optPointsEssentiels },
    { id: "definitions", label: t.optDefinitions },
    { id: "formules", label: t.optFormules },
    { id: "exemples", label: t.optExemples },
    { id: "explicationsSimples", label: t.optExplicationsSimples },
  ];

  const [files, setFiles] = React.useState<DropzoneFile[]>([]);
  const [extracting, setExtracting] = React.useState(false);
  const [subject, setSubject] = React.useState(courseDocument.subject);
  const [level, setLevel] = React.useState(courseDocument.level);
  const [chapter, setChapter] = React.useState(courseDocument.chapter);
  const [theme, setTheme] = React.useState(courseDocument.theme);
  const [style, setStyle] = React.useState<string>(SUMMARY_STYLES[0]);
  const [pageCount, setPageCount] = React.useState<string>(PAGE_COUNTS[2]);
  const [detail, setDetail] = React.useState<string>(SUMMARY_DETAIL_LEVELS[1]);
  // Aucune option cochée par défaut : c'est à l'élève de choisir ce qu'il veut
  // inclure avant de lancer la génération, pas à l'application de décider à
  // sa place.
  const [options, setOptions] = React.useState<Record<string, boolean>>({
    pointsEssentiels: false,
    definitions: false,
    formules: false,
    exemples: false,
    explicationsSimples: false,
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

    const request: SummaryRequest = {
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
      chapter: chapter.trim(),
      theme: theme.trim(),
      style,
      pageCount,
      detailLevel: detail,
      options,
    };

    onGenerate({ request, files: rawFiles });
  }

  const busy = pending || extracting;

  return (
    <Card className="p-5 sm:p-6">
      <form className="space-y-7" onSubmit={handleSubmit}>
        <ConfigSection step={1} title={t.step1}>
          <MultiFileDropzone
            id="course-source"
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
          <Field label={t.level} htmlFor="summary-level">
            <Input
              id="summary-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder={t.levelPlaceholder}
              maxLength={80}
              autoComplete="off"
              required
            />
          </Field>

          <Field label={t.subject} htmlFor="summary-subject">
            <Input
              id="summary-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t.subjectPlaceholder}
              maxLength={80}
              autoComplete="off"
              required
            />
          </Field>

          <Field label={t.chapter} htmlFor="summary-chapter">
            <Input
              id="summary-chapter"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder={t.chapterPlaceholder}
              maxLength={200}
              autoComplete="off"
            />
          </Field>

          <Field label={t.theme} htmlFor="summary-theme">
            <Input
              id="summary-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={t.themePlaceholder}
              maxLength={200}
              autoComplete="off"
            />
          </Field>

          <Field label={t.style} htmlFor="summary-style">
            <Select
              id="summary-style"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            >
              {SUMMARY_STYLES.map((s) => (
                <option key={s} value={s}>
                  {localizeSummaryStyle(s, dict)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t.pages} htmlFor="summary-pages">
              <Select
                id="summary-pages"
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

            <Field label={t.detail} htmlFor="summary-detail">
              <Select
                id="summary-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              >
                {SUMMARY_DETAIL_LEVELS.map((d) => (
                  <option key={d} value={d}>
                    {localizeSummaryDetail(d, dict)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </ConfigSection>

        <ConfigSection step={3} title={t.step3}>
          <OptionsList
            idPrefix="summary-opt"
            options={summaryOptions}
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
