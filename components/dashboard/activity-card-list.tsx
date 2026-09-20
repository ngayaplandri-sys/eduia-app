"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatActivityDate } from "@/lib/utils/format";
import { useI18n } from "@/lib/i18n/client";
import { localizeActivityAction } from "@/lib/i18n/labels";
import type { ActivityItem } from "@/types";
import { ActivityItemCell } from "./activity-item-cell";
import { ActivityTypeBadge, ActivityStatusBadge } from "./activity-badges";
import { ActivityRowMenu } from "./activity-row-menu";

/** Rendu empilé (une carte par activité) — visible en dessous de `lg`. */
export function ActivityCardList({ items }: { items: ActivityItem[] }) {
  const { dict, locale } = useI18n();

  return (
    <ul className="flex flex-col gap-3 lg:hidden">
      {items.map((item) => (
        <li
          key={item.id}
          className="hover-lift rounded-xl border border-line-soft bg-surface p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <ActivityItemCell
                title={item.title}
                meta={item.meta}
                fileKind={item.fileKind}
              />
            </div>
            <ActivityRowMenu item={item} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-400">
                {dict.dashboard.colType}
              </dt>
              <dd className="mt-1">
                <ActivityTypeBadge type={item.type} />
              </dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-400">
                {dict.dashboard.colStatus}
              </dt>
              <dd className="mt-1">
                <ActivityStatusBadge status={item.status} />
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-400">
                {dict.dashboard.colDate}
              </dt>
              <dd className="mt-1 text-meta text-ink-500">
                {formatActivityDate(item.date, locale)}
              </dd>
            </div>
          </dl>

          <Link
            href={item.action.href}
            className={buttonVariants({
              variant: "lavender",
              size: "sm",
              block: true,
            })}
          >
            {localizeActivityAction(item.action.label, dict)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
