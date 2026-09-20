"use client";

import { FileStack, HardDrive, Sparkles, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";
import type { DocumentStats } from "@/types";

function StatShell({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card variant="stat" className="p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="text-meta font-semibold uppercase tracking-wide text-ink-400">
          {label}
        </span>
      </div>
      {children}
    </Card>
  );
}

export function DocumentStatsGrid({ stats }: { stats: DocumentStats }) {
  const percent = Math.round(stats.storageUsedRatio * 100);
  const { dict } = useI18n();
  const t = dict.documents;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatShell icon={FileStack} label={t.statDocuments}>
        <p className="mt-2 text-lg font-bold text-ink-900">{stats.totalCount}</p>
      </StatShell>

      <StatShell icon={HardDrive} label={t.statStorage}>
        <p className="mt-2 text-lg font-bold text-ink-900">
          {stats.storageUsedLabel}
          <span className="text-sm font-medium text-ink-400">
            {" "}
            / {stats.storageTotalLabel}
          </span>
        </p>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary-100"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t.statStorageAria}
        >
          <div
            className="h-full rounded-full bg-primary-600"
            style={{ width: `${percent}%` }}
          />
        </div>
      </StatShell>

      <StatShell icon={Sparkles} label={t.statSummaries}>
        <p className="mt-2 text-lg font-bold text-ink-900">
          {stats.summariesGenerated}
        </p>
      </StatShell>
    </div>
  );
}
