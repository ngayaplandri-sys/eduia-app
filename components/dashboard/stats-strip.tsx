import { Folder, Sparkles, Activity, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n/server";
import { cn } from "@/lib/utils/cn";
import type { DocumentStats } from "@/types";

type StatTone = "primary" | "success" | "info";

const toneClass: Record<StatTone, string> = {
  primary: "bg-primary-50 text-primary-600",
  success: "bg-success-50 text-success-600",
  info: "bg-info-50 text-info-600",
};

/**
 * Bande de statistiques réelles au-dessus des cartes d'action — le dashboard
 * n'affichait auparavant aucun chiffre, juste bannière → 3 cartes → tableau.
 * Données déjà disponibles sans nouvelle requête serveur dédiée : `stats`
 * vient de `getDocuments()` (déjà utilisé par `/documents`), `activityCount`
 * de la longueur de `getActivityHistory()` (déjà utilisé par `/historique`).
 */
export async function StatsStrip({
  stats,
  activityCount,
}: {
  stats: DocumentStats;
  activityCount: number;
}) {
  const dict = await getDictionary();
  const t = dict.dashboard;

  const tiles: { icon: LucideIcon; tone: StatTone; value: number; label: string }[] = [
    { icon: Folder, tone: "primary", value: stats.totalCount, label: t.statsDocumentsLabel },
    { icon: Sparkles, tone: "success", value: stats.summariesGenerated, label: t.statsSummariesLabel },
    { icon: Activity, tone: "info", value: activityCount, label: t.statsActivityLabel },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tiles.map((tile) => (
        <Card
          key={tile.label}
          variant="stat"
          className="flex items-center gap-3.5 p-4"
        >
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              toneClass[tile.tone],
            )}
          >
            <tile.icon className="size-5" strokeWidth={1.9} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-2xl font-extrabold tracking-[-0.01em] text-ink-900">
              {tile.value}
            </p>
            <p className="truncate text-fine text-ink-500">{tile.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
