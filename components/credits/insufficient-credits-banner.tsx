"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";

/**
 * Bandeau « crédits insuffisants » — distinct de `InlineErrorBanner` (qui n'a
 * pas d'emplacement pour des boutons d'action) : affiché quand une route IA
 * renvoie `code: "INSUFFICIENT_CREDITS"`, avec un raccourci direct vers
 * l'offre Premium sur `/premium` (seule offre payante).
 */
export function InsufficientCreditsBanner({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  const { dict } = useI18n();
  const t = dict.credits;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-danger-100 bg-danger-50/70 px-3.5 py-3",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-fine font-semibold text-danger-700">{t.insufficientTitle}</p>
          <p className="mt-0.5 text-fine leading-snug text-danger-600">{message}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/premium"
          className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
        >
          {t.upgradeCta}
        </Link>
      </div>
    </div>
  );
}
