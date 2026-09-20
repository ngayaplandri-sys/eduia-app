"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/feedback/error-state";
import { useI18n } from "@/lib/i18n/client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { dict } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title={dict.feedback.dashboardErrorTitle}
      description={dict.feedback.dashboardErrorBody}
      onRetry={reset}
    />
  );
}
