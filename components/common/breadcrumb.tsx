import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Fil d'Ariane"
      className={cn("flex flex-wrap items-center gap-1.5 text-sm", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={item.label} className="flex items-center gap-1.5">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="font-medium text-ink-500 transition-colors hover:text-ink-900"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast ? "text-ink-400" : "font-medium text-ink-500",
                )}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast ? (
              <ChevronRight className="size-3.5 text-ink-400" aria-hidden />
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
