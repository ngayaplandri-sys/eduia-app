import type { LucideIcon } from "lucide-react";
import { Check, X } from "lucide-react";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export interface PlanFeature {
  label: string;
  included: boolean;
}

interface PlanCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  price: string;
  period?: string;
  badge?: string;
  highlighted?: boolean;
  features: PlanFeature[];
  footer: React.ReactNode;
}

export function PlanCard({
  icon: Icon,
  title,
  description,
  price,
  period,
  badge,
  highlighted,
  features,
  footer,
}: PlanCardProps) {
  return (
    <div
      className={cn(
        cardVariants({ variant: highlighted ? "elevated" : "content" }),
        "hover-lift relative flex flex-col p-6 sm:p-7",
        highlighted && "bg-primary-50/40 ring-2 ring-primary-200",
      )}
    >
      {badge ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary-600 px-3.5 py-1 text-badge font-bold uppercase tracking-wide text-white shadow-btn-primary">
          {badge}
        </span>
      ) : null}

      <span
        className={cn(
          "mb-4 flex size-11 items-center justify-center rounded-xl",
          highlighted ? "bg-primary-100 text-primary-600" : "bg-canvas text-ink-500",
        )}
      >
        <Icon className="size-5" strokeWidth={2} aria-hidden />
      </span>

      <h3 className="text-title-sm font-bold text-ink-900">{title}</h3>
      <p className="mt-1 text-sm text-ink-500">{description}</p>

      <div className="mt-5 flex items-end gap-1">
        <span className="text-3xl font-extrabold tracking-[-0.02em] text-ink-900">
          {price}
        </span>
        {period ? (
          <span className="pb-1 text-sm font-medium text-ink-400">{period}</span>
        ) : null}
      </div>

      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {features.map((feature) => (
          <li key={feature.label} className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                feature.included
                  ? "bg-success-100 text-success-700"
                  : "bg-canvas text-ink-400",
              )}
            >
              {feature.included ? (
                <Check className="size-3" strokeWidth={3} aria-hidden />
              ) : (
                <X className="size-3" strokeWidth={3} aria-hidden />
              )}
            </span>
            <span className={feature.included ? "text-ink-700" : "text-ink-400"}>
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-7">{footer}</div>
    </div>
  );
}
