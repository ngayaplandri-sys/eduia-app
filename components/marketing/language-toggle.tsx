"use client";

import { ChevronDown, Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS, isLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

/**
 * Choix de la langue du site (18 langues, celles du Professeur vocal) : une
 * pastille « 🌐 FR ▾ » posée sur une liste native (pratique au doigt sur
 * mobile). `setLocale` applique la langue dès que son dictionnaire est chargé,
 * puis rafraîchit les Server Components sans recharger la page.
 * `tone="dark"` : posé sur la scène sombre du hero (en-tête transparent).
 * `full` : nom complet de la langue (« Français ») au lieu du code.
 */
export function LanguageToggle({
  tone = "light",
  full = false,
  className,
}: {
  tone?: "light" | "dark";
  full?: boolean;
  className?: string;
}) {
  const { locale, dict, setLocale, pending } = useI18n();
  const dark = tone === "dark";

  return (
    <label
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-bold transition-colors duration-300 focus-within:outline-2 focus-within:outline-offset-2",
        full ? "text-[0.8rem]" : "text-[0.72rem] uppercase tracking-[0.04em]",
        dark
          ? "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15"
          : "bg-ink-900/[0.05] text-ink-700 ring-1 ring-line hover:bg-ink-900/[0.08]",
        pending && "opacity-70",
        className,
      )}
    >
      <Globe className="size-3.5 shrink-0" aria-hidden />
      <span aria-hidden lang={locale}>
        {full ? LOCALE_LABELS[locale] : locale}
      </span>
      <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
      <select
        value={locale}
        aria-label={dict.marketing.header.languageAria}
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value);
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} lang={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
