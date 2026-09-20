"use client";

import * as React from "react";
import { FileText, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type MockupDict = Dictionary["marketing"]["how"]["mockup"];

/**
 * Avance d'un cran toutes les `intervalMs`, en boucle — neutralisé sous
 * `prefers-reduced-motion` (reste sur la première étape, jamais de boucle
 * infinie pour ce réglage d'accessibilité). Anime les mini-écrans des
 * mockups iPhone de la section « Comment ça marche ? » : import → résumé,
 * génération → correction.
 */
function useScreenCycle(steps: number, intervalMs: number) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % steps);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [steps, intervalMs]);

  return index;
}

/** Fondu croisé entre écrans empilés — évite tout saut de mise en page. */
function ScreenStack({ activeIndex, screens }: { activeIndex: number; screens: React.ReactNode[] }) {
  return (
    <div className="relative size-full">
      {screens.map((screen, i) => (
        <div
          key={i}
          aria-hidden={i !== activeIndex}
          className="absolute inset-0 px-3.5 pb-4 pt-2 transition-opacity duration-700 ease-out"
          style={{ opacity: i === activeIndex ? 1 : 0 }}
        >
          {screen}
        </div>
      ))}
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
      <ScreenHeader label={t.resumeImporting} />
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#e6e8ee] bg-white px-2.5 py-2 shadow-[0_1px_2px_rgb(16_24_40_/_0.04)]">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#eef3fa] text-[#1c4373]">
          <FileText className="size-3.5" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.65rem] font-semibold text-[#1b1f2a]">
          {t.resumeFileName}
        </span>
      </div>
      <p className="mt-3 text-[0.62rem] font-medium text-[#666c7c]">{t.resumeAnalyzing}</p>
      <div className="mt-2 space-y-1.5">
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-[85%]" />
        <Skeleton className="h-2 w-[60%]" />
      </div>
    </div>
  );
}

/** Écran 2 du flux Résumer : résumé structuré généré. */
function SummarizeResultScreen({ t }: { t: MockupDict }) {
  const points = [t.resumePoint1, t.resumePoint2, t.resumePoint3];
  return (
    <div>
      <div className="flex items-center justify-center gap-1.5">
        <span className="flex size-4 items-center justify-center rounded-full bg-[#158f52] text-white">
          <Check className="size-2.5" strokeWidth={3} aria-hidden />
        </span>
        <p className="text-center text-[0.62rem] font-semibold uppercase tracking-wide text-[#158f52]">
          {t.resumeBadge}
        </p>
      </div>
      <p className="mt-2 text-center text-[0.72rem] font-bold text-[#1b1f2a]">{t.resumeTitle}</p>
      <ul className="mt-2.5 space-y-1.5">
        {points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-1.5 rounded-lg bg-[#eef3fa] px-2 py-1.5 text-[0.62rem] leading-snug text-[#3a4051]"
          >
            <span className="mt-[0.2rem] size-1 shrink-0 rounded-full bg-[#1c4373]" aria-hidden />
            {point}
          </li>
        ))}
      </ul>
      <div className="mt-2.5 rounded-lg bg-[#1c4373] py-2 text-center text-[0.62rem] font-semibold text-white">
        {t.resumeCta}
      </div>
    </div>
  );
}

/** Mini-écrans du mockup « Résumer mes cours » — cycle import → résumé. */
export function SummarizeScreens({ t }: { t: MockupDict }) {
  const active = useScreenCycle(2, 3400);
  return (
    <ScreenStack
      activeIndex={active}
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
  ];
  return (
    <div>
      <ScreenHeader label={t.generateExamLabel} />
      <div className="mt-2.5 space-y-1.5">
        {fields.map(([label, value]) => (
          <div key={label}>
            <p className="text-[0.58rem] font-medium text-[#9aa1ac]">{label}</p>
            <div className="mt-0.5 flex items-center justify-between rounded-lg border border-[#e6e8ee] bg-white px-2 py-1.5 text-[0.65rem] font-semibold text-[#262b38]">
              {value}
              <span className="text-[#9aa1ac]">▾</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 rounded-lg bg-[#1c4373] py-2 text-center text-[0.62rem] font-semibold text-white">
        {t.generateExamCta}
      </div>
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
      <ScreenHeader label={t.correctionResultLabel} />
      <div className="mt-1.5">
        <ScoreRing scoreAria={t.scoreAria} scoreLabel={t.scoreLabel} />
      </div>
      <p className="mt-0.5 text-center text-[0.68rem] font-bold text-[#12723f]">{t.praise}</p>
      <dl className="mt-2 space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-lg bg-[#f6f7f9] px-2 py-1.5 text-[0.62rem]">
            <dt className="text-[#666c7c]">{k}</dt>
            <dd className="font-bold text-[#1b1f2a]">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2.5 rounded-lg bg-[#1c4373] py-2 text-center text-[0.62rem] font-semibold text-white">
        {t.viewDetailedCorrection}
      </div>
    </div>
  );
}

/** Mini-écrans du mockup « Générer une épreuve » — cycle génération → correction. */
export function GradeScreens({ t }: { t: MockupDict }) {
  const active = useScreenCycle(2, 3400);
  return (
    <ScreenStack
      activeIndex={active}
      screens={[<GenerateExamScreen key="generate" t={t} />, <CorrectionResultScreen key="correction" t={t} />]}
    />
  );
}
