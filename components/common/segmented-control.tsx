"use client";

import { cn } from "@/lib/utils/cn";

export interface SegmentedOption<T extends string> {
  key: T;
  label: string;
}

/**
 * Groupe de segments exclusifs (pilule active violette) — recopié à
 * l'identique dans le filtre de `/historique` et le réglage "Rigueur" de
 * `/corriger` avant cette extraction.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  columns = "grid-cols-3",
  className,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Classes Tailwind du nombre de colonnes (responsive géré par l'appelant). */
  columns?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-1 rounded-lg border border-line p-1",
        columns,
        className,
      )}
    >
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.key)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-fine font-semibold transition-colors",
              active
                ? "bg-primary-600 text-white"
                : "text-ink-500 hover:bg-primary-50 hover:text-ink-900",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
