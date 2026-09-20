"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export function PremiumCard({ className }: { className?: string }) {
  const { dict } = useI18n();
  const t = dict.layout;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-primary-100/70 p-4 text-center ring-1 ring-primary-200/60 shadow-[var(--shadow-glow-lg)]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 z-0 size-24 rounded-full bg-warning-200/40 blur-2xl"
      />
      <div className="relative z-10">
        <span className="mx-auto mb-2 flex size-9 items-center justify-center rounded-full bg-primary-200/70 text-primary-600">
          <Crown className="size-5" strokeWidth={2} aria-hidden />
        </span>
        <p className="text-sm font-bold text-ink-900">{t.premiumCardTitle}</p>
        <p className="mx-auto mt-1 max-w-[13rem] text-[0.72rem] leading-snug text-ink-500">
          {t.premiumCardBody}
        </p>
        <Link
          href="/premium"
          className={cn(
            buttonVariants({ variant: "primary", size: "sm", block: true }),
            "mt-3",
          )}
        >
          {t.premiumCardCta}
        </Link>
      </div>
    </div>
  );
}
