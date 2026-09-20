"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ResultLoadingShell } from "@/components/common/result-loading-shell";
import { useI18n } from "@/lib/i18n/client";

/**
 * État de chargement du panneau de droite pendant que l'IA corrige la copie.
 * Reprend la silhouette de `CorrectionReportPanel` (en-tête + feuille de
 * document : note globale, détail par question, blocs de synthèse).
 */
export function CorrectionReportLoading() {
  const { dict } = useI18n();
  const t = dict.corriger;

  return (
    <ResultLoadingShell
      className="min-w-0"
      heading={t.loadingHeading}
      srLabel={t.loadingSr}
      bannerLabel={t.loadingBanner}
    >
      <Skeleton className="h-24 w-full rounded-xl" />

      <div className="space-y-3">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </ResultLoadingShell>
  );
}
