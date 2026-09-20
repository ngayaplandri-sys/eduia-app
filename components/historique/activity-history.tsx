"use client";

import * as React from "react";
import { Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { SegmentedControl } from "@/components/common/segmented-control";
import { useI18n } from "@/lib/i18n/client";
import type { ActivityItem, ActivityType } from "@/types";
import { HistoryList } from "./history-list";

type Filter = "Tous" | ActivityType;

export function ActivityHistory({ items }: { items: ActivityItem[] }) {
  const { dict } = useI18n();
  const t = dict.historique;
  const filters: { key: Filter; label: string }[] = [
    { key: "Tous", label: t.filterAll },
    { key: "Résumé", label: t.filterSummaries },
    { key: "Épreuve", label: t.filterExams },
    { key: "Correction", label: t.filterCorrections },
  ];

  const [filter, setFilter] = React.useState<Filter>("Tous");
  const [list, setList] = React.useState(items);

  const handleDelete = React.useCallback((id: string) => {
    setList((current) => current.filter((item) => item.id !== id));
  }, []);

  const visible = React.useMemo(
    () =>
      filter === "Tous" ? list : list.filter((item) => item.type === filter),
    [list, filter],
  );

  return (
    <Card className="p-5 sm:p-6">
      {/* Barre d'outils */}
      <div className="flex flex-col gap-3 border-b border-line-soft pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-title-sm font-bold text-ink-900">
            {t.heading}
          </h2>
          <span className="rounded-full bg-canvas px-2 py-0.5 text-[0.6875rem] font-semibold text-ink-500">
            {visible.length}
          </span>
        </div>

        <SegmentedControl
          options={filters}
          value={filter}
          onChange={setFilter}
          columns="grid-cols-2 sm:grid-cols-4"
        />
      </div>

      <div className="mt-4">
        {list.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t.emptyTitle}
            description={t.emptyBody}
            action={{ label: t.emptyCta, href: "/resumer" }}
            className="border-0 py-12"
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t.noneOfTypeTitle}
            description={t.noneOfTypeBody}
            className="border-0 py-12"
          />
        ) : (
          <HistoryList items={visible} onDelete={handleDelete} />
        )}
      </div>
    </Card>
  );
}
