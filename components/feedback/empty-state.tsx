import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { buttonVariants } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center",
        className,
      )}
    >
      <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
        <Icon className="size-7" strokeWidth={1.75} />
      </span>
      <h3 className="text-base font-bold text-ink-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>
      {action ? (
        <Link
          href={action.href}
          className={cn(buttonVariants({ variant: "primary", size: "md" }), "mt-6")}
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
