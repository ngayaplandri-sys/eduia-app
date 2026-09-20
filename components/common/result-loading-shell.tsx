"use client";

import { Sparkles } from "lucide-react";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

/**
 * Chrome commun aux 3 états de chargement de résultat (Résumer / Générer /
 * Corriger) — en-tête + bandeau « L'IA travaille » + silhouette de feuille de
 * document. Auparavant dupliqué à l'identique dans les 3 fichiers
 * `*-result-loading.tsx` ; seul le contenu interne (forme des blocs
 * `Skeleton`, propre à chaque outil) reste spécifique via `children`.
 */
export function ResultLoadingShell({
  heading,
  srLabel,
  bannerLabel,
  className,
  children,
}: {
  heading: string;
  srLabel: string;
  bannerLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className} aria-busy="true" aria-live="polite">
      <span className="sr-only">{srLabel}</span>

      <div className="mb-4 flex items-center gap-2.5">
        <h2 className="text-title-sm font-bold text-ink-900">{heading}</h2>
      </div>

      <div
        className={cn(
          cardVariants({ variant: "content" }),
          "relative overflow-hidden p-6 sm:p-8 lg:p-10",
        )}
      >
        {/* Filet du haut, au même endroit que celui de `DocumentSheet` (une fois
            le résultat prêt) — animé pendant l'attente, statique à l'arrivée :
            la continuité visuelle rend la transition moins abrupte. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-[length:200%_100%] bg-gradient-to-r from-primary-300 via-primary-500 to-primary-300 [animation:var(--animate-shimmer)]"
        />
        <div className="mx-auto max-w-[46rem]">
          <div className="flex items-center justify-center gap-2 rounded-lg bg-primary-50 px-4 py-3 text-center text-fine font-medium text-primary-700">
            <Sparkles className="size-4 shrink-0 animate-pulse" aria-hidden />
            {bannerLabel}
          </div>

          <div className="mt-7 space-y-7">{children}</div>
        </div>
      </div>
    </section>
  );
}
