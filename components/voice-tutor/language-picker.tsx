"use client";

import * as React from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import {
  VOICE_TUTOR_LANGUAGES,
  voiceTutorLanguage,
  type VoiceTutorLanguage,
} from "@/lib/config/voice-tutor";

/**
 * Drapeaux simplifiés (sans armoiries), dessinés en SVG : les émojis drapeaux
 * ne s'affichent pas sous Windows. L'arabe, parlé dans de nombreux pays, est
 * représenté par sa lettre « ع » plutôt que par le drapeau d'un pays.
 */
function LanguageFlag({ code, className }: { code: VoiceTutorLanguage; className?: string }) {
  const id = React.useId();
  const frame = cn("h-[0.95rem] w-[1.4rem] shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10", className);

  if (code === "ar") {
    return (
      <span
        aria-hidden
        className={cn(frame, "inline-flex items-center justify-center bg-primary-100 text-[0.7rem] font-bold leading-none text-primary-700")}
      >
        ع
      </span>
    );
  }

  return (
    <svg aria-hidden viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" className={frame}>
      {code === "fr" ? (
        <>
          <rect width="10" height="20" fill="#002654" />
          <rect x="10" width="10" height="20" fill="#fff" />
          <rect x="20" width="10" height="20" fill="#ce1126" />
        </>
      ) : code === "de" ? (
        <>
          <rect width="30" height="6.67" fill="#000" />
          <rect y="6.67" width="30" height="6.67" fill="#dd0000" />
          <rect y="13.33" width="30" height="6.67" fill="#ffce00" />
        </>
      ) : code === "es" ? (
        <>
          <rect width="30" height="20" fill="#aa151b" />
          <rect y="5" width="30" height="10" fill="#f1bf00" />
        </>
      ) : code === "pt" ? (
        <>
          <rect width="12" height="20" fill="#046a38" />
          <rect x="12" width="18" height="20" fill="#da291c" />
          <circle cx="12" cy="10" r="4.2" fill="#ffe900" />
          <circle cx="12" cy="10" r="2.7" fill="#da291c" />
          <circle cx="12" cy="10" r="1.6" fill="#fff" />
        </>
      ) : code === "tr" ? (
        <>
          <rect width="30" height="20" fill="#e30a17" />
          <circle cx="11" cy="10" r="5" fill="#fff" />
          <circle cx="12.25" cy="10" r="4" fill="#e30a17" />
          <polygon
            fill="#fff"
            points="14.9,10 16.556,9.459 16.558,7.717 17.584,9.125 19.242,8.589 18.22,10 19.242,11.411 17.584,10.875 16.558,12.283 16.556,10.541"
          />
        </>
      ) : (
        // Royaume-Uni (anglais).
        <g transform="scale(0.5 0.6667)">
          <clipPath id={`${id}-t`}>
            <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
          </clipPath>
          <rect width="60" height="30" fill="#012169" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
          <path
            d="M0,0 L60,30 M60,0 L0,30"
            clipPath={`url(#${id}-t)`}
            stroke="#c8102e"
            strokeWidth="4"
          />
          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
          <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
        </g>
      )}
    </svg>
  );
}

/**
 * Sélecteur de langue en carte (« Langue du document », « Langue de réponse ») :
 * une vraie liste déroulante native, transparente, couvre la carte — clavier,
 * lecteur d'écran et sélecteur mobile du système fonctionnent tels quels.
 */
export function LanguagePicker({
  id,
  icon: Icon,
  label,
  value,
  onChange,
  disabled,
  className,
}: {
  id: string;
  icon: LucideIcon;
  label: string;
  value: VoiceTutorLanguage;
  onChange: (value: VoiceTutorLanguage) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { locale } = useI18n();
  const names = React.useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "language" });
    } catch {
      return null;
    }
  }, [locale]);
  const selected = voiceTutorLanguage(value);

  return (
    <div
      className={cn(
        "relative flex min-w-0 items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 shadow-card ring-1 ring-line-soft transition-[box-shadow,background-color] focus-within:ring-2 focus-within:ring-primary-300 hover:ring-primary-200 sm:px-3.5",
        disabled && "opacity-60",
        className,
      )}
    >
      <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 sm:flex">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-meta font-semibold text-ink-700">{label}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2">
          <LanguageFlag code={value} />
          <span className="truncate text-sm font-bold text-ink-900" lang={value}>
            {selected.label}
          </span>
          <ChevronDown className="size-4 shrink-0 text-ink-400" aria-hidden />
        </span>
      </span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as VoiceTutorLanguage)}
        aria-label={label}
        className="absolute inset-0 size-full cursor-pointer appearance-none rounded-2xl opacity-0 disabled:cursor-not-allowed"
      >
        {VOICE_TUTOR_LANGUAGES.map((language) => {
          const localized = names?.of(language.code);
          const extra =
            localized && localized.toLowerCase() !== language.label.toLowerCase()
              ? ` (${localized})`
              : "";
          return (
            <option key={language.code} value={language.code}>
              {language.label}
              {extra}
            </option>
          );
        })}
      </select>
    </div>
  );
}
