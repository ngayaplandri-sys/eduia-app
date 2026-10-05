"use client";

import * as React from "react";
import { FileText, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { observeOnce } from "@/lib/motion/observe-once";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type MockupDict = Dictionary["marketing"]["how"]["mockup"];

/**
 * Avance d'un cran toutes les `intervalMs`, en boucle, mais seulement une fois
 * le téléphone entré dans le viewport (avant : `-1`, l'écran se remplit sous
 * les yeux du visiteur). Sous `prefers-reduced-motion` : premier écran affiché
 * tout de suite, jamais de boucle infinie. Anime les mini-écrans des mockups
 * iPhone de « Comment ça marche ? » : import → résumé, génération → correction.
 */
function useScreenCycle(steps: number, intervalMs: number) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [index, setIndex] = React.useState(-1);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = window.setTimeout(() => setIndex(0), 0);
      return () => window.clearTimeout(id);
    }
    let timer = 0;
    const stop = observeOnce(node, () => {
      setIndex(0);
      timer = window.setInterval(() => {
        setIndex((current) => (current + 1) % steps);
      }, intervalMs);
    });
    return () => {
      stop();
      window.clearInterval(timer);
    };
  }, [steps, intervalMs]);

  return { ref, index };
}

/**
 * Fondu croisé entre écrans empilés (aucun saut de mise en page). L'écran
 * actif porte `data-active` : ses éléments `.screen-item` apparaissent alors
 * un par un (voir app/globals.css).
 */
function ScreenStack({
  stackRef,
  activeIndex,
  screens,
}: {
  stackRef: React.Ref<HTMLDivElement>;
  activeIndex: number;
  screens: React.ReactNode[];
}) {
  return (
    <div ref={stackRef} className="relative size-full">
      {screens.map((screen, i) => (
        <div
          key={i}
          aria-hidden={i !== activeIndex}
          data-active={i === activeIndex}
          className="absolute inset-0 px-3.5 pb-4 pt-2 transition-opacity duration-700 ease-out"
          style={{ opacity: i === activeIndex ? 1 : 0 }}
        >
          {screen}
        </div>
      ))}
    </div>
  );
}

/** Élément d'écran révélé en cascade quand son écran devient actif. */
function Item({
  i,
  className,
  children,
}: {
  i: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("screen-item", className)} style={{ "--i": i } as React.CSSProperties}>
      {children}
    </div>
  );
}

function ScreenHeader({ label }: { label: string }) {
  return (
    <p className="text-center text-[0.62rem] font-semibold uppercase tracking-wide text-[#9aa1ac]">
      {label}
    </p>
  );
}

/** Écran 1 du flux Résumer : import + analyse du document en cours. */
function SummarizeImportScreen({ t }: { t: MockupDict }) {
  return (
    <div>
      <Item i={0}>
        <ScreenHeader label={t.resumeImporting} />
      </Item>
      <Item
        i={1}
        className="mt-3 flex items-center gap-2 rounded-lg border border-[#e6e8ee] bg-white px-2.5 py-2 shadow-[0_1px_2px_rgb(16_24_40_/_0.04)]"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#f6f4fb] text-[#693fa8]">
          <FileText className="size-3.5" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.65rem] font-semibold text-[#1b1f2a]">
          {t.resumeFileName}
        </span>
      </Item>
      <Item i={2}>
        <p className="mt-3 text-[0.62rem] font-medium text-[#666c7c]">{t.resumeAnalyzing}</p>
      </Item>
      <Item i={3} className="mt-2 space-y-1.5">
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-[85%]" />
        <Skeleton className="h-2 w-[60%]" />
      </Item>
      <Item i={4} className="mt-4 rounded-lg bg-[#f6f4fb] px-2.5 py-2">
        <div className="flex items-center justify-between text-[0.6rem]">
          <span className="font-medium text-[#666c7c]">{t.resumePagesRead}</span>
          <span className="font-bold tabular-nums text-[#1b1f2a]">{t.resumePagesCount}</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#ebe4f7]">
          <div className="h-full w-[60%] rounded-full bg-[#693fa8]" />
        </div>
      </Item>
      <Item i={5} className="mt-3 flex flex-wrap gap-1">
        {t.resumeFormats.map((format) => (
          <span
            key={format}
            className="rounded-md border border-[#e6e8ee] bg-white px-1.5 py-0.5 text-[0.56rem] font-semibold text-[#3a4051]"
          >
            {format}
          </span>
        ))}
      </Item>
    </div>
  );
}

/** Écran 2 du flux Résumer : résumé structuré généré. */
function SummarizeResultScreen({ t }: { t: MockupDict }) {
  const points = [t.resumePoint1, t.resumePoint2, t.resumePoint3];
  return (
    <div>
      <Item i={0} className="flex items-center justify-center gap-1.5">
        <span className="flex size-4 items-center justify-center rounded-full bg-[#158f52] text-white">
          <Check className="size-2.5" strokeWidth={3} aria-hidden />
        </span>
        <p className="text-center text-[0.62rem] font-semibold uppercase tracking-wide text-[#158f52]">
          {t.resumeBadge}
        </p>
      </Item>
      <Item i={1}>
        <p className="mt-2 text-center text-[0.72rem] font-bold text-[#1b1f2a]">{t.resumeTitle}</p>
      </Item>
      <ul className="mt-2.5 space-y-1.5">
        {points.map((point, index) => (
          <li key={point}>
            <Item
              i={index + 2}
              className="flex items-start gap-1.5 rounded-lg bg-[#f6f4fb] px-2 py-1.5 text-[0.62rem] leading-snug text-[#3a4051]"
            >
              <span className="mt-[0.2rem] size-1 shrink-0 rounded-full bg-[#693fa8]" aria-hidden />
              {point}
            </Item>
          </li>
        ))}
      </ul>
      <Item
        i={5}
        className="mt-2.5 rounded-lg bg-[#693fa8] py-2 text-center text-[0.62rem] font-semibold text-white"
      >
        {t.resumeCta}
      </Item>
    </div>
  );
}

/** Mini-écrans du mockup « Résumer mes cours » : cycle import → résumé. */
export function SummarizeScreens({ t }: { t: MockupDict }) {
  const { ref, index } = useScreenCycle(2, 3600);
  return (
    <ScreenStack
      stackRef={ref}
      activeIndex={index}
      screens={[<SummarizeImportScreen key="import" t={t} />, <SummarizeResultScreen key="result" t={t} />]}
    />
  );
}

function ScoreRing({ scoreAria, scoreLabel }: { scoreAria: string; scoreLabel: string }) {
  return (
    <svg viewBox="0 0 36 36" className="mx-auto size-20" role="img" aria-label={scoreAria}>
      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e6e8ee" strokeWidth="3.2" />
      <circle
        cx="18"
        cy="18"
        r="15.9155"
        fill="none"
        stroke="#1fb268"
        strokeWidth="3.2"
        strokeDasharray="80 100"
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
      <text x="18" y="19" textAnchor="middle" fill="#1b1f2a" style={{ font: "700 7px var(--font-sans)" }}>
        16/20
      </text>
      <text
        x="18"
        y="24.5"
        textAnchor="middle"
        fill="#9aa1ac"
        style={{ font: "700 3.2px var(--font-sans)", letterSpacing: "0.4px" }}
      >
        {scoreLabel}
      </text>
    </svg>
  );
}

/** Écran 1 du flux Corriger : configuration de l'épreuve générée. */
function GenerateExamScreen({ t }: { t: MockupDict }) {
  const fields: [string, string][] = [
    [t.subject, t.subjectValue],
    [t.level, t.levelValue],
    [t.examType, t.examTypeValue],
    [t.questionCount, t.questionCountValue],
    [t.totalPoints, t.totalPointsValue],
    [t.language, t.languageValue],
  ];
  return (
    <div>
      <Item i={0}>
        <ScreenHeader label={t.generateExamLabel} />
      </Item>
      <div className="mt-2.5 space-y-1.5">
        {fields.map(([label, value], index) => (
          <Item key={label} i={index + 1}>
            <p className="text-[0.58rem] font-medium text-[#9aa1ac]">{label}</p>
            <div className="mt-0.5 flex items-center justify-between rounded-lg border border-[#e6e8ee] bg-white px-2 py-1.5 text-[0.65rem] font-semibold text-[#262b38]">
              {value}
              <span className="text-[#9aa1ac]">▾</span>
            </div>
          </Item>
        ))}
      </div>
      <Item
        i={7}
        className="mt-2.5 rounded-lg bg-[#693fa8] py-2 text-center text-[0.62rem] font-semibold text-white"
      >
        {t.generateExamCta}
      </Item>
    </div>
  );
}

/** Écran 2 du flux Corriger : résultat + score de la correction. */
function CorrectionResultScreen({ t }: { t: MockupDict }) {
  const rows: [string, string][] = [
    [t.goodAnswers, "16"],
    [t.errors, "4"],
    [t.percentage, "80 %"],
  ];
  return (
    <div>
      <Item i={0}>
        <ScreenHeader label={t.correctionResultLabel} />
      </Item>
      <Item i={1} className="mt-1.5">
        <ScoreRing scoreAria={t.scoreAria} scoreLabel={t.scoreLabel} />
      </Item>
      <Item i={2}>
        <p className="mt-0.5 text-center text-[0.68rem] font-bold text-[#12723f]">{t.praise}</p>
      </Item>
      <div className="mt-2 space-y-1.5">
        {rows.map(([k, v], index) => (
          <Item
            key={k}
            i={index + 3}
            className="flex items-center justify-between rounded-lg bg-[#f6f7f9] px-2 py-1.5 text-[0.62rem]"
          >
            <span className="text-[#666c7c]">{k}</span>
            <span className="font-bold text-[#1b1f2a]">{v}</span>
          </Item>
        ))}
      </div>
      <Item
        i={6}
        className="mt-2.5 rounded-lg bg-[#693fa8] py-2 text-center text-[0.62rem] font-semibold text-white"
      >
        {t.viewDetailedCorrection}
      </Item>
    </div>
  );
}

/** Mini-écrans du mockup « Générer une épreuve » : cycle génération → correction. */
export function GradeScreens({ t }: { t: MockupDict }) {
  const { ref, index } = useScreenCycle(2, 3600);
  return (
    <ScreenStack
      stackRef={ref}
      activeIndex={index}
      screens={[<GenerateExamScreen key="generate" t={t} />, <CorrectionResultScreen key="correction" t={t} />]}
    />
  );
}
