import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type StatTone = "primary" | "success" | "info" | "warning" | "danger" | "neutral";

const TONE_CLASSES: Record<StatTone, string> = {
  primary: "bg-primary-100 text-primary-600",
  success: "bg-success-100 text-success-700",
  info: "bg-info-100 text-info-600",
  warning: "bg-warning-100 text-warning-700",
  danger: "bg-danger-100 text-danger-600",
  neutral: "bg-canvas text-ink-500",
};

export function AdminStatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: StatTone;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            TONE_CLASSES[tone],
          )}
        >
          <Icon className="size-[1.1rem]" aria-hidden />
        </span>
        <span className="text-meta font-semibold uppercase tracking-wide text-ink-400">
          {label}
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-[-0.02em] text-ink-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-fine leading-snug text-ink-500">{hint}</p> : null}
    </div>
  );
}
