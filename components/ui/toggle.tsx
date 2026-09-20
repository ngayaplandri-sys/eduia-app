"use client";

import { cn } from "@/lib/utils/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Libellé accessible (le bouton n'a pas de texte visible). */
  label: string;
  id?: string;
  disabled?: boolean;
}

/** Interrupteur on/off accessible (`role="switch"`). */
export function Toggle({ checked, onChange, label, id, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-55",
        checked ? "bg-primary-600" : "bg-line",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
