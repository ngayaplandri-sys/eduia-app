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

/** Étoile à cinq branches (une pointe dirigée selon `rotation`, en degrés). */
function starPoints(cx: number, cy: number, outer: number, rotation = 0): string {
  const inner = outer * 0.382;
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = ((rotation - 90 + index * 36) * Math.PI) / 180;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

/** Petite étoile du drapeau chinois, une pointe tournée vers la grande étoile. */
function chinaStar(cx: number, cy: number): string {
  const rotation = (Math.atan2(5 - cy, 5 - cx) * 180) / Math.PI + 90;
  return starPoints(cx, cy, 1, rotation);
}

function Stripes({ colors, vertical }: { colors: string[]; vertical?: boolean }) {
  const size = (vertical ? 30 : 20) / colors.length;
  return (
    <>
      {colors.map((color, index) =>
        vertical ? (
          <rect key={color} x={index * size} width={size} height="20" fill={color} />
        ) : (
          <rect key={color} y={index * size} width="30" height={size} fill={color} />
        ),
      )}
    </>
  );
}

/** Trigramme du drapeau coréen, simplifié en trois traits. */
function Trigram({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} fill="#000">
      <rect x="-2" y="-1.6" width="4" height="0.7" />
      <rect x="-2" y="-0.35" width="4" height="0.7" />
      <rect x="-2" y="0.9" width="4" height="0.7" />
    </g>
  );
}

function FlagShapes({ code, id }: { code: VoiceTutorLanguage; id: string }) {
  switch (code) {
    case "fr":
      return <Stripes vertical colors={["#002654", "#fff", "#ce1126"]} />;
    case "de":
      return <Stripes colors={["#000", "#dd0000", "#ffce00"]} />;
    case "it":
      return <Stripes vertical colors={["#009246", "#fff", "#ce2b37"]} />;
    case "nl":
      return <Stripes colors={["#ae1c28", "#fff", "#21468b"]} />;
    case "pl":
      return <Stripes colors={["#fff", "#dc143c"]} />;
    case "ru":
      return <Stripes colors={["#fff", "#0039a6", "#d52b1e"]} />;
    case "es":
      return (
        <>
          <rect width="30" height="20" fill="#aa151b" />
          <rect y="5" width="30" height="10" fill="#f1bf00" />
        </>
      );
    case "pt":
      return (
        <>
          <rect width="12" height="20" fill="#046a38" />
          <rect x="12" width="18" height="20" fill="#da291c" />
          <circle cx="12" cy="10" r="4.2" fill="#ffe900" />
          <circle cx="12" cy="10" r="2.7" fill="#da291c" />
          <circle cx="12" cy="10" r="1.6" fill="#fff" />
        </>
      );
    case "tr":
      return (
        <>
          <rect width="30" height="20" fill="#e30a17" />
          <circle cx="11" cy="10" r="5" fill="#fff" />
          <circle cx="12.25" cy="10" r="4" fill="#e30a17" />
          <polygon
            fill="#fff"
            points="14.9,10 16.556,9.459 16.558,7.717 17.584,9.125 19.242,8.589 18.22,10 19.242,11.411 17.584,10.875 16.558,12.283 16.556,10.541"
          />
        </>
      );
    case "uz":
      // Ouzbékistan : bleu, blanc et vert séparés de filets rouges, croissant et étoiles.
      return (
        <>
          <Stripes colors={["#0099b5", "#fff", "#1eb53a"]} />
          <rect y="6.42" width="30" height="0.5" fill="#ce1126" />
          <rect y="13.08" width="30" height="0.5" fill="#ce1126" />
          <circle cx="4.4" cy="3.2" r="2.3" fill="#fff" />
          <circle cx="5.3" cy="3.2" r="2" fill="#0099b5" />
          <g fill="#fff">
            {[
              [11, 1.3], [12.5, 1.3], [14, 1.3],
              [9.5, 3.1], [11, 3.1], [12.5, 3.1], [14, 3.1],
              [8, 4.9], [9.5, 4.9], [11, 4.9], [12.5, 4.9], [14, 4.9],
            ].map(([cx, cy]) => (
              <polygon key={`${cx}-${cy}`} points={starPoints(cx, cy, 0.55)} />
            ))}
          </g>
        </>
      );
    case "zh":
      return (
        <>
          <rect width="30" height="20" fill="#ee1c25" />
          <g fill="#ffde00">
            <polygon points={starPoints(5, 5, 3)} />
            <polygon points={chinaStar(10, 2)} />
            <polygon points={chinaStar(12, 4)} />
            <polygon points={chinaStar(12, 7)} />
            <polygon points={chinaStar(10, 9)} />
          </g>
        </>
      );
    case "ja":
      return (
        <>
          <rect width="30" height="20" fill="#fff" />
          <circle cx="15" cy="10" r="6" fill="#bc002d" />
        </>
      );
    case "ko":
      return (
        <>
          <rect width="30" height="20" fill="#fff" />
          <g transform="rotate(33.7 15 10)">
            <circle cx="15" cy="10" r="5" fill="#0047a0" />
            <path d="M10,10 a5,5 0 0 1 10,0 z" fill="#cd2e3a" />
            <circle cx="12.5" cy="10" r="2.5" fill="#cd2e3a" />
            <circle cx="17.5" cy="10" r="2.5" fill="#0047a0" />
          </g>
          <Trigram x={5.5} y={4} angle={-56.3} />
          <Trigram x={24.5} y={4} angle={56.3} />
          <Trigram x={5.5} y={16} angle={56.3} />
          <Trigram x={24.5} y={16} angle={-56.3} />
        </>
      );
    case "hi":
      return (
        <>
          <Stripes colors={["#ff9933", "#fff", "#138808"]} />
          <circle cx="15" cy="10" r="2.4" fill="none" stroke="#000080" strokeWidth="0.7" />
          <circle cx="15" cy="10" r="0.6" fill="#000080" />
        </>
      );
    case "sw":
      // Tanzanie, l'un des pays où le swahili est langue nationale.
      return (
        <>
          <polygon points="0,0 30,0 0,20" fill="#1eb53a" />
          <polygon points="30,0 30,20 0,20" fill="#00a3dd" />
          <line x1="0" y1="20" x2="30" y2="0" stroke="#fcd116" strokeWidth="7" />
          <line x1="0" y1="20" x2="30" y2="0" stroke="#000" strokeWidth="4.5" />
        </>
      );
    case "vi":
      return (
        <>
          <rect width="30" height="20" fill="#da251d" />
          <polygon points={starPoints(15, 10, 6)} fill="#ffcd00" />
        </>
      );
    case "en":
    default:
      // Royaume-Uni (anglais).
      return (
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
      );
  }
}

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
      <FlagShapes code={code} id={id} />
    </svg>
  );
}

/**
 * Sélecteur de langue (« Langue du document », « Langue de réponse ») : une
 * vraie liste déroulante native, transparente, couvre le sélecteur — clavier,
 * lecteur d'écran et sélecteur mobile du système fonctionnent tels quels.
 *  - `card` : grande carte avec son libellé ;
 *  - `compact` : pastille pour l'en-tête d'un panneau. Le nom de la langue
 *    s'affiche si le panneau (`@container`) fait au moins 24rem de large, son
 *    code sinon ; `caption` (« Cours », « Réponse ») selon `captionClassName`.
 */
export function LanguagePicker({
  id,
  icon: Icon,
  label,
  value,
  onChange,
  disabled,
  className,
  variant = "card",
  caption,
  captionClassName,
}: {
  id: string;
  icon: LucideIcon;
  label: string;
  value: VoiceTutorLanguage;
  onChange: (value: VoiceTutorLanguage) => void;
  disabled?: boolean;
  className?: string;
  variant?: "card" | "compact";
  caption?: string;
  captionClassName?: string;
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

  const select = (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as VoiceTutorLanguage)}
      aria-label={label}
      className={cn(
        "absolute inset-0 size-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed",
        variant === "compact" ? "rounded-full" : "rounded-2xl",
      )}
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
  );

  if (variant === "compact") {
    return (
      <div
        title={`${label} · ${selected.label}`}
        className={cn(
          "relative inline-flex h-9 min-w-0 shrink-0 items-center gap-1.5 rounded-full bg-canvas pl-2.5 pr-2 ring-1 ring-line-soft transition-[box-shadow,background-color] focus-within:ring-2 focus-within:ring-primary-300 hover:bg-primary-50 hover:ring-primary-200",
          disabled && "opacity-60",
          className,
        )}
      >
        <Icon className="size-3.5 shrink-0 text-primary-600" aria-hidden />
        {caption ? (
          // Pas de `cn` ici : tailwind-merge prendrait `text-meta` (taille) pour une couleur.
          <span className={`hidden text-meta font-medium text-ink-500 ${captionClassName ?? ""}`}>
            {caption}
          </span>
        ) : null}
        <LanguageFlag code={value} />
        <span className="hidden text-fine font-bold text-ink-900 @sm:inline" lang={value}>
          {selected.label}
        </span>
        <span className="text-meta font-bold uppercase text-ink-900 @sm:hidden">{value}</span>
        <ChevronDown className="size-3.5 shrink-0 text-ink-400" aria-hidden />
        {select}
      </div>
    );
  }

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
      {select}
    </div>
  );
}
