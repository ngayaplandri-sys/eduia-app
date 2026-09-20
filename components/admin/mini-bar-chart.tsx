import { cn } from "@/lib/utils/cn";
import type { AdminStatPoint } from "@/types";

type BarTone = "primary" | "success" | "info" | "warning";

const TONE_BAR: Record<BarTone, string> = {
  primary: "bg-primary-500",
  success: "bg-success-500",
  info: "bg-info-500",
  warning: "bg-warning-500",
};

/**
 * Barres horizontales en CSS pur (aucune dépendance de graphe). Chaque barre est
 * proportionnelle à la valeur maximale de la série ; une série entièrement à 0
 * affiche des barres vides — pas d'état trompeur.
 */
export function MiniBarChart({
  data,
  tone = "primary",
  valueSuffix = "",
  className,
}: {
  data: AdminStatPoint[];
  tone?: BarTone;
  valueSuffix?: string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <ul className={cn("space-y-2.5", className)}>
      {data.map((point) => {
        const pct = Math.round((point.value / max) * 100);
        return (
          <li key={point.label} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-[0.75rem] font-medium text-ink-400">
              {point.label}
            </span>
            <span className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-canvas">
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  TONE_BAR[tone],
                )}
                style={{ width: `${point.value === 0 ? 0 : Math.max(pct, 4)}%` }}
              />
            </span>
            <span className="w-12 shrink-0 text-right text-fine font-semibold tabular-nums text-ink-700">
              {point.value}
              {valueSuffix}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
