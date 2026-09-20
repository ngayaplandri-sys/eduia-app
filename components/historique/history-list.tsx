"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { buttonVariants } from "@/components/ui/button";
import { formatActivityDate } from "@/lib/utils/format";
import { useI18n } from "@/lib/i18n/client";
import { localizeActivityAction } from "@/lib/i18n/labels";
import type { ActivityItem } from "@/types";
import { ActivityItemCell } from "@/components/dashboard/activity-item-cell";
import {
  ActivityTypeBadge,
  ActivityStatusBadge,
} from "@/components/dashboard/activity-badges";
import { ActivityRowMenu } from "@/components/dashboard/activity-row-menu";

/**
 * Colonnes alignées à partir de `lg` ; empilé en dessous.
 * Réutilisé par l'en-tête et par chaque ligne pour garantir l'alignement.
 */
const GRID =
  "lg:grid lg:grid-cols-[minmax(0,30rem)_5.5rem_7.5rem_6rem_6.5rem_minmax(0,1fr)] lg:items-center lg:gap-x-3";

/**
 * Journal d'activité — liste simple (nom, type, date, statut, action).
 * Bâtie sur les mêmes composants que « Activité récente » du tableau de bord.
 */
export function HistoryList({
  items,
  onDelete,
}: {
  items: ActivityItem[];
  onDelete?: (id: string) => void;
}) {
  const { dict, locale } = useI18n();
  const t = dict.dashboard;

  return (
    <div>
      {/* En-tête de colonnes (desktop) */}
      <div
        className={cn(
          "hidden pb-3 text-meta font-semibold uppercase tracking-wide text-ink-400",
          GRID,
        )}
      >
        <span>{t.colItem}</span>
        <span>{t.colType}</span>
        <span>{t.colDate}</span>
        <span>{t.colStatus}</span>
        <span className="text-right">{t.colAction}</span>
      </div>

      <ul className="divide-y divide-line-soft lg:border-t lg:border-line-soft">
        {items.map((item) => (
          <li key={item.id} className={cn("flex flex-col gap-3 py-4", GRID)}>
            <ActivityItemCell
              title={item.title}
              meta={item.meta}
              fileKind={item.fileKind}
            />

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 lg:contents">
              <ActivityTypeBadge type={item.type} />
              <span className="whitespace-nowrap text-meta text-ink-500">
                {formatActivityDate(item.date, locale)}
              </span>
              <ActivityStatusBadge status={item.status} />
            </div>

            <div className="flex items-center gap-1 lg:justify-end">
              <Link
                href={item.action.href}
                className={cn(
                  buttonVariants({ variant: "lavender", size: "sm" }),
                  "flex-1 justify-center sm:flex-none",
                )}
              >
                {localizeActivityAction(item.action.label, dict)}
              </Link>
              <ActivityRowMenu item={item} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
