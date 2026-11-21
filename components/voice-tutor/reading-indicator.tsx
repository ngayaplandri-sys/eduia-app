"use client";

import * as React from "react";
import { BookOpenText, Languages, Lightbulb, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import type { VoiceTutorLanguage } from "@/lib/config/voice-tutor";

/** Ce que fait le professeur avec la phrase en cours. */
export type ReadingPhase = "reading" | "translation" | "explaining";

export interface ReadingProgress {
  /** Message (réponse) en cours de lecture. */
  messageId: string;
  page: number;
  /** Numéro de la phrase lue dans cette réponse. */
  step: number;
  phase: ReadingPhase;
  /** Part de la page déjà lue (0 à 1), si la phrase a été retrouvée dans son texte. */
  progress: number | null;
}

const PHASE_ICONS: Record<ReadingPhase, LucideIcon> = {
  reading: BookOpenText,
  translation: Languages,
  explaining: Lightbulb,
};

/**
 * Où en est le professeur, en bas du document : page et numéro de la phrase,
 * les trois temps de chaque phrase (lecture dans la langue du cours,
 * traduction, explication) avec celui en cours, et la part de la page déjà lue.
 * Le même repère suit la phrase dans le PDF.
 */
export function ReadingIndicator({
  state,
  documentLanguage,
  replyLanguage,
  className,
}: {
  state: ReadingProgress;
  documentLanguage: VoiceTutorLanguage;
  replyLanguage: VoiceTutorLanguage;
  className?: string;
}) {
  const { dict, locale } = useI18n();
  const t = dict.voiceTutor;
  const names = React.useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "language" });
    } catch {
      return null;
    }
  }, [locale]);
  const translated = documentLanguage !== replyLanguage;
  const phases: ReadingPhase[] = translated
    ? ["reading", "translation", "explaining"]
    : ["reading", "explaining"];
  const current = phases.indexOf(state.phase === "translation" && !translated ? "explaining" : state.phase);
  const Icon = PHASE_ICONS[state.phase];
  const label = (phase: ReadingPhase) =>
    phase === "reading" ? t.phaseReading : phase === "translation" ? t.phaseTranslation : t.phaseExplanation;
  const language = (phase: ReadingPhase) =>
    phase === "reading"
      ? names?.of(documentLanguage)
      : phase === "translation"
        ? names?.of(replyLanguage)
        : null;
  const percent = state.progress === null ? null : Math.round(state.progress * 100);

  return (
    <div
      role="group"
      aria-label={t.indicatorLabel}
      data-reading-step={state.step}
      data-reading-phase={state.phase}
      className={cn(
        "w-full max-w-md rounded-2xl bg-surface/95 px-3 py-2.5 shadow-[var(--shadow-card-hover)] ring-1 ring-line-soft backdrop-blur",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white">
          <Icon className="size-3.5" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 truncate text-fine font-bold text-ink-900">
          {t.indicatorTitle(state.page, state.step)}
        </p>
        {percent !== null ? (
          <span className="shrink-0 text-meta font-semibold tabular-nums text-ink-500">{percent} %</span>
        ) : null}
      </div>

      <ol className="mt-2 flex min-w-0 items-center gap-1">
        {phases.map((phase, index) => {
          const name = language(phase);
          return (
            <li key={phase} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <span aria-hidden className="h-px w-2 shrink-0 bg-line" />
              ) : null}
              {/* Pas de `cn` ici : tailwind-merge prendrait `text-meta` (taille) pour une couleur. */}
              <span
                aria-current={index === current ? "step" : undefined}
                className={`truncate rounded-full px-2 py-0.5 text-meta font-semibold transition-colors duration-200 ${
                  index === current
                    ? "bg-primary-600 text-white"
                    : index < current
                      ? "bg-primary-100 text-primary-700"
                      : "bg-canvas text-ink-400 ring-1 ring-line-soft"
                }`}
              >
                {label(phase)}
                {name ? <span className="hidden font-medium @sm:inline"> · {name}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>

      {percent !== null ? (
        <div
          role="progressbar"
          aria-label={t.indicatorProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-2 h-1 overflow-hidden rounded-full bg-line-soft"
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
