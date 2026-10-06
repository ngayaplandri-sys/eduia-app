"use client";

import { Check, LoaderCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultLoadingShell } from "@/components/common/result-loading-shell";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import { localizeLevel, localizeSubject } from "@/lib/i18n/labels";
import type { CorrectionStreamEvent } from "@/types";

/** Avancement de la correction, tel que diffusé par `POST /api/ai/grade`. */
export interface CorrectionProgress {
  stage: "analyzing" | "correcting";
  /** Résultat de l'analyse d'une épreuve importée, dès qu'il est connu. */
  analysis: Extract<CorrectionStreamEvent, { type: "analysis" }> | null;
  /** `true` quand une épreuve importée passe d'abord par l'analyse. */
  withAnalysis: boolean;
}

type StepState = "done" | "active" | "waiting";

function ProgressStep({
  index,
  state,
  title,
  body,
  extra,
}: {
  index: number;
  state: StepState;
  title: string;
  body: string;
  extra?: string | null;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-fine font-bold",
          state === "done" && "bg-success-100 text-success-700",
          state === "active" && "bg-primary-100 text-primary-700",
          state === "waiting" && "bg-canvas text-ink-400",
        )}
      >
        {state === "done" ? (
          <Check className="size-4" strokeWidth={3} aria-hidden />
        ) : state === "active" ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          index
        )}
      </span>
      <div className="min-w-0 pt-0.5">
        <p
          className={cn(
            "text-fine font-semibold",
            state === "waiting" ? "text-ink-400" : "text-ink-900",
          )}
        >
          {title}
        </p>
        <p className="mt-0.5 break-words text-meta leading-snug text-ink-500">{body}</p>
        {extra ? (
          <p className="mt-1 break-words text-meta font-medium leading-snug text-success-700">
            {extra}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/**
 * État de chargement du panneau de droite pendant la correction. Pour une
 * épreuve importée, suit les étapes réelles : analyse (puis matière, niveau
 * et nombre de questions détectés), correction. Reprend ensuite la silhouette
 * de `CorrectionReportPanel`.
 */
export function CorrectionReportLoading({ progress }: { progress: CorrectionProgress }) {
  const { dict } = useI18n();
  const t = dict.corriger;
  const { analysis } = progress;

  const detected = analysis
    ? t.stageDetected(
        localizeSubject(analysis.subject, dict),
        analysis.level ? localizeLevel(analysis.level, dict) : null,
        analysis.questionCount,
      )
    : null;

  return (
    <ResultLoadingShell
      className="min-w-0"
      heading={t.loadingHeading}
      srLabel={t.loadingSr}
      bannerLabel={t.loadingBanner}
    >
      <ol className="space-y-4" aria-live="polite">
        {progress.withAnalysis ? (
          <ProgressStep
            index={1}
            state={progress.stage === "analyzing" ? "active" : "done"}
            title={t.stageAnalyzing}
            body={detected ?? t.stageAnalyzingBody}
            extra={analysis?.matchedEduia ? t.stageEduiaMatched : null}
          />
        ) : null}
        <ProgressStep
          index={progress.withAnalysis ? 2 : 1}
          state={progress.stage === "correcting" ? "active" : "waiting"}
          title={t.stageCorrecting}
          body={t.stageCorrectingBody}
        />
      </ol>

      <div className="space-y-3">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </ResultLoadingShell>
  );
}
