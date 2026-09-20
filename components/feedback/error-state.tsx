"use client";

import { TriangleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title,
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  const { dict } = useI18n();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-line bg-surface px-6 py-16 text-center",
        className,
      )}
    >
      <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-danger-100 text-danger-600">
        <TriangleAlert className="size-7" strokeWidth={1.75} />
      </span>
      <h3 className="text-base font-bold text-ink-900">
        {title ?? dict.feedback.errorTitle}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">
        {description ?? dict.feedback.sectionErrorBody}
      </p>
      {onRetry ? (
        <Button variant="outline" size="md" onClick={onRetry} className="mt-6">
          <RotateCcw className="size-4" />
          {dict.common.retry}
        </Button>
      ) : null}
    </div>
  );
}
