"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatActivityDate } from "@/lib/utils/format";
import { useI18n } from "@/lib/i18n/client";
import { localizeActivityAction } from "@/lib/i18n/labels";
import type { ActivityItem } from "@/types";
import { ActivityItemCell } from "./activity-item-cell";
import { ActivityTypeBadge, ActivityStatusBadge } from "./activity-badges";
import { ActivityRowMenu } from "./activity-row-menu";

/** Rendu tableau — visible à partir de `lg`. */
export function ActivityTable({ items }: { items: ActivityItem[] }) {
  const { dict, locale } = useI18n();
  const headers = [
    { label: dict.dashboard.colItem, align: "left" as const },
    { label: dict.dashboard.colType, align: "left" as const },
    { label: dict.dashboard.colDate, align: "left" as const },
    { label: dict.dashboard.colStatus, align: "left" as const },
    { label: dict.dashboard.colAction, align: "right" as const },
  ];

  return (
    <div className="hidden lg:block">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header.label}
                scope="col"
                className={cn(
                  "pb-3 text-meta font-semibold uppercase tracking-wide text-ink-400",
                  header.align === "right" ? "text-right" : "text-left",
                )}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="group transition-colors duration-200 hover:bg-primary-50/40"
            >
              <td className="max-w-[22rem] border-t border-line-soft py-4 pr-4">
                <ActivityItemCell
                  title={item.title}
                  meta={item.meta}
                  fileKind={item.fileKind}
                />
              </td>
              <td className="border-t border-line-soft py-4 pr-4">
                <ActivityTypeBadge type={item.type} />
              </td>
              <td className="whitespace-nowrap border-t border-line-soft py-4 pr-4 text-meta text-ink-500">
                {formatActivityDate(item.date, locale)}
              </td>
              <td className="border-t border-line-soft py-4 pr-4">
                <ActivityStatusBadge status={item.status} />
              </td>
              <td className="border-t border-line-soft py-4">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={item.action.href}
                    className={buttonVariants({
                      variant: "tint",
                      size: "sm",
                    })}
                  >
                    {localizeActivityAction(item.action.label, dict)}
                  </Link>
                  <ActivityRowMenu item={item} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
