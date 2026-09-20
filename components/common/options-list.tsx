"use client";

import { Toggle } from "@/components/ui/toggle";

export interface ToggleOption {
  id: string;
  label: string;
}

/**
 * Liste d'interrupteurs on/off — section « Options supplémentaires »
 * commune aux trois outils.
 */
export function OptionsList({
  options,
  values,
  onChange,
  idPrefix,
}: {
  options: readonly ToggleOption[];
  values: Record<string, boolean>;
  onChange: (id: string, next: boolean) => void;
  idPrefix: string;
}) {
  return (
    <ul className="divide-y divide-line-soft rounded-xl border border-line">
      {options.map((option) => (
        <li
          key={option.id}
          className="flex items-center justify-between gap-4 px-3.5 py-3"
        >
          <label
            htmlFor={`${idPrefix}-${option.id}`}
            className="text-fine font-medium text-ink-700"
          >
            {option.label}
          </label>
          <Toggle
            id={`${idPrefix}-${option.id}`}
            checked={values[option.id] ?? false}
            onChange={(next) => onChange(option.id, next)}
            label={option.label}
          />
        </li>
      ))}
    </ul>
  );
}
