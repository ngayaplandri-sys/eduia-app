"use client";

import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

/**
 * Bascule Français / English — interrupteur à deux positions. `setLocale`
 * applique la langue immédiatement (contexte client + cookie), puis
 * rafraîchit les Server Components sans recharger la page.
 * `tone="dark"` : posé sur la scène sombre du hero (en-tête transparent).
 * `full` : noms complets (« Français » / « English ») au lieu des codes.
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
  const { locale, dict, setLocale } = useI18n();
  const dark = tone === "dark";

  return (
    <div
      role="group"
      aria-label={dict.marketing.header.languageAria}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full p-0.5 text-[0.72rem] font-bold tracking-[0.04em] transition-colors duration-300",
        dark ? "bg-white/10 ring-1 ring-white/15" : "bg-ink-900/[0.05] ring-1 ring-line",
        className,
      )}
    >
      {LOCALES.map((code: Locale) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            onClick={() => (active ? undefined : setLocale(code))}
            className={cn(
              "rounded-full px-2.5 py-1 transition-[background-color,color,box-shadow] duration-300",
              full ? "px-3 text-[0.78rem] tracking-normal" : "uppercase",
              active
                ? dark
                  ? "bg-white text-[#43266c] shadow-sm"
                  : "bg-surface text-primary-700 shadow-sm"
                : dark
                  ? "text-white/70 hover:text-white"
                  : "text-ink-500 hover:text-ink-900",
            )}
          >
            {full ? LOCALE_LABELS[code] : code}
          </button>
        );
      })}
    </div>
  );
}
