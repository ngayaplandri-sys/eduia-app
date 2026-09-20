import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Champ texte — même gabarit que `Select` (hauteur, bordure, focus). */
export function Input({
  className,
  type = "text",
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      // Les gestionnaires de mots de passe injectent parfois des attributs
      // (caret-color…) avant l'hydratation — on évite l'avertissement.
      suppressHydrationWarning
      className={cn(
        "h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm text-ink-900 transition-colors placeholder:text-ink-400 hover:border-primary-200 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-line aria-[invalid=true]:border-danger-500 aria-[invalid=true]:focus:ring-danger-100",
        className,
      )}
      {...props}
    />
  );
}
