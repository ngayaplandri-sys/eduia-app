"use client";

import { FileText, ClipboardCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import { localizeActivityMeta } from "@/lib/i18n/labels";
import type { ActivityFileKind } from "@/types";

const kindConfig: Record<
  ActivityFileKind,
  { icon: LucideIcon; className: string }
> = {
  pdf: { icon: FileText, className: "bg-danger-100 text-danger-500" },
  doc: { icon: FileText, className: "bg-info-100 text-info-600" },
  exam: { icon: FileText, className: "bg-info-100 text-info-600" },
  correction: { icon: ClipboardCheck, className: "bg-warning-100 text-warning-600" },
};

export function ActivityItemCell({
  title,
  meta,
  fileKind,
}: {
  title: string;
  meta: string;
  fileKind: ActivityFileKind;
}) {
  const { icon: Icon, className } = kindConfig[fileKind];
  const { dict } = useI18n();

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          className,
        )}
      >
        <Icon className="size-[1.15rem]" strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink-900">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-meta text-ink-400">
          {localizeActivityMeta(meta, dict)}
        </span>
      </span>
    </div>
  );
}
