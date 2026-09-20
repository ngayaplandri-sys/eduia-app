"use client";

import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ChoiceButtonProps {
  label: string;
  description?: string;
  icon?: LucideIcon;
  selected: boolean;
  onClick: () => void;
  /** `pill` = matières (compact, en nuage) · `card` = objectif / style (une ligne par option). */
  variant?: "pill" | "card";
}

/** Bouton de sélection (unique ou multiple) réutilisé par toutes les étapes de l'onboarding. */
export function ChoiceButton({
  label,
  description,
  icon: Icon,
  selected,
  onClick,
  variant = "card",
}: ChoiceButtonProps) {
  if (variant === "pill") {
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={onClick}
        className={cn(
          "rounded-full border px-4 py-2 text-fine font-semibold transition-[background-color,border-color,color,transform] duration-200 ease-out motion-reduce:hover:translate-y-0",
          selected
            ? "border-primary-600 bg-primary-600 text-white"
            : "border-line bg-surface text-ink-700 hover:-translate-y-px hover:border-primary-200 hover:bg-primary-50 active:translate-y-0",
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out motion-reduce:hover:translate-y-0",
        selected
          ? "border-primary-300 bg-primary-50 ring-2 ring-primary-100"
          : "border-line bg-surface hover:-translate-y-px hover:border-primary-200 hover:bg-primary-50/50 hover:shadow-card active:translate-y-0",
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            selected ? "bg-primary-600 text-white" : "bg-canvas text-ink-500",
          )}
        >
          <Icon className="size-[1.1rem]" aria-hidden />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-semibold",
            selected ? "text-primary-700" : "text-ink-900",
          )}
        >
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-fine text-ink-500">{description}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary-600 bg-primary-600 text-white" : "border-line-soft",
        )}
        aria-hidden
      >
        {selected ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}
