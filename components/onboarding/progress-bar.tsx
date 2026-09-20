"use client";

import { useI18n } from "@/lib/i18n/client";

export function OnboardingProgressBar({
  step,
  total,
}: {
  step: number;
  total: number;
}) {
  const percent = Math.round((step / total) * 100);
  const { dict } = useI18n();

  return (
    <div>
      <div className="flex items-center justify-between text-fine font-medium text-ink-500">
        <span>{dict.onboarding.stepOf(step, total)}</span>
        <span>{percent}%</span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={dict.onboarding.header}
      >
        <div
          className="h-full rounded-full bg-primary-600 transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
