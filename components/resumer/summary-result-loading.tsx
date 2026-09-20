"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ResultLoadingShell } from "@/components/common/result-loading-shell";
import { useI18n } from "@/lib/i18n/client";

/**
 * État de chargement du panneau de droite pendant que l'IA rédige le résumé.
 * Reprend la silhouette de `SummaryResultPanel` (en-tête + feuille de document)
 * pour éviter tout saut de mise en page à l'apparition du résultat.
 */
export function SummaryResultLoading() {
  const { dict } = useI18n();
  const t = dict.resumer;

  return (
    <ResultLoadingShell
      heading={t.loadingHeading}
      srLabel={t.loadingSr}
      bannerLabel={t.loadingBanner}
    >
      <div className="space-y-2.5">
        <Skeleton className="h-6 w-3/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      <div className="space-y-2.5">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-9/12" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </ResultLoadingShell>
  );
}
