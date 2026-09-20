import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type ActionTone = "success" | "primary" | "warning";

export interface ActionCardData {
  tone: ActionTone;
  icon: LucideIcon;
  title: string;
  description: string;
  cta: { label: string; href: string };
  /** Une seule carte du groupe en avant — casse le clonage à 3 boîtes
   * strictement identiques (le pattern générique n°1 du skill de refonte). */
  spotlight?: boolean;
}

const badgeToneClass: Record<ActionTone, string> = {
  success: "bg-success-100 text-success-600",
  primary: "bg-primary-100 text-primary-600",
  warning: "bg-warning-100 text-warning-600",
};

const spotlightToneClass: Record<ActionTone, string> = {
  success: "border-success-200 bg-success-50/50 shadow-[var(--shadow-elevated)]",
  primary: "border-primary-200 bg-primary-50/50 shadow-[var(--shadow-elevated)]",
  warning: "border-warning-200 bg-warning-50/50 shadow-[var(--shadow-elevated)]",
};

const buttonToneVariant: Record<ActionTone, NonNullable<ButtonProps["variant"]>> =
  {
    success: "success",
    primary: "primary",
    warning: "warning",
  };

export function ActionCard({
  tone,
  icon: Icon,
  title,
  description,
  cta,
  spotlight,
}: ActionCardData) {
  return (
    <Card
      variant="interactive"
      className={cn(
        "flex h-full flex-col p-5 lg:p-6",
        spotlight && spotlightToneClass[tone],
      )}
    >
      <div className="flex-1">
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-xl",
            badgeToneClass[tone],
          )}
        >
          <Icon className="size-6" strokeWidth={2} aria-hidden />
        </span>

        <h3 className="mt-4 text-title-sm font-bold tracking-[-0.01em] text-ink-900">
          {title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
          {description}
        </p>
      </div>

      <Link
        href={cta.href}
        className={cn(
          buttonVariants({
            variant: buttonToneVariant[tone],
            size: "md",
            block: true,
          }),
          "mt-5",
        )}
      >
        {cta.label}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Card>
  );
}
