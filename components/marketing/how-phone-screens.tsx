"use client";

import * as React from "react";
import {
  BatteryFull,
  Bell,
  Check,
  ChevronDown,
  FileImage,
  FileText,
  FileType2,
  Menu,
  Search,
  Signal,
  Sparkles,
  Upload,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";

/**
 * Écrans des smartphones de « Comment ça marche ? », dessinés à la taille d'un
 * vrai écran (390 × 844 points) puis projetés en perspective sur la vitre des
 * téléphones photographiés (voir `phone-shot.tsx`). Même charte que
 * l'application en thème clair (couleurs fixes : un écran de téléphone ne
 * s'inverse pas avec le thème du site), mêmes icônes, mêmes libellés : en-tête
 * mobile réel (menu, titre de page, recherche, cloche, avatar), textes des
 * pages « Résumer mes cours » et « Générer une épreuve ».
 *
 * Chaque écran enchaîne ses états (import → analyse → résumé ; paramètres →
 * épreuve et correction) uniquement quand le téléphone est visible, et se met
 * en pause hors de l'écran (aucun minuteur inutile sur mobile).
 */

const INK = "#1b1f2a";
const MUTED = "#666c7c";
const LINE = "#e6e8ee";
const VIOLET = "#693fa8";

/** Index d'état cyclique, actif seulement quand `ref` est visible. */
function useVisibleCycle(steps: number, intervalMs: number) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [index, setIndex] = React.useState(-1);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Pas de boucle : on montre directement l'état final, le plus parlant.
      const id = window.setTimeout(() => setIndex(steps - 1), 0);
      return () => window.clearTimeout(id);
    }
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearInterval(timer);
        if (!entry.isIntersecting) return;
        setIndex((current) => (current < 0 ? 0 : current));
        timer = window.setInterval(() => {
          setIndex((current) => (current + 1) % steps);
        }, intervalMs);
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [steps, intervalMs]);

  return { ref, index };
}

/** Élément révélé en cascade quand son état devient actif (`.screen-item`). */
function Item({ i, className, children }: { i: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("screen-item", className)} style={{ "--i": i } as React.CSSProperties}>
      {children}
    </div>
  );
}

function StatusBar({ time }: { time: string }) {
  return (
    <div className="relative flex h-[54px] shrink-0 items-center justify-between px-8 pt-1 text-[16px] font-semibold" style={{ color: INK }}>
      <span className="tabular-nums">{time}</span>
      <span aria-hidden className="absolute left-1/2 top-[11px] h-[35px] w-[124px] -translate-x-1/2 rounded-full bg-black" />
      <span className="flex items-center gap-1.5">
        <Signal className="size-[17px]" strokeWidth={2.4} />
        <Wifi className="size-[17px]" strokeWidth={2.4} />
        <BatteryFull className="size-[22px]" strokeWidth={2} />
      </span>
    </div>
  );
}

function AppBar({ title }: { title: string }) {
  return (
    <div className="flex h-[58px] shrink-0 items-center gap-3 border-b px-5" style={{ borderColor: "#eef0f4" }}>
      <Menu className="size-[22px]" style={{ color: MUTED }} />
      <span className="min-w-0 flex-1 truncate text-[19px] font-bold" style={{ color: INK }}>
        {title}
      </span>
      <Search className="size-[20px]" style={{ color: MUTED }} />
      <Bell className="size-[20px]" style={{ color: MUTED }} />
      <span className="flex size-[32px] items-center justify-center rounded-full bg-[#ebe4f7] text-[12px] font-bold text-[#553087]">
        AM
      </span>
    </div>
  );
}

/** États empilés, fondu croisé, aucun saut de mise en page. */
function ScreenStates({
  stackRef,
  active,
  states,
}: {
  stackRef: React.Ref<HTMLDivElement>;
  active: number;
  states: React.ReactNode[];
}) {
  return (
    <div ref={stackRef} className="relative flex-1">
      {states.map((state, i) => (
        <div
          key={i}
          data-active={i === active}
          aria-hidden={i !== active}
          className="absolute inset-0 px-5 pt-5 transition-opacity duration-700 ease-out"
          style={{ opacity: i === active ? 1 : 0 }}
        >
          {state}
        </div>
      ))}
    </div>
  );
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[54px] items-center justify-center gap-2 rounded-[14px] text-[17px] font-semibold text-white shadow-[0_12px_24px_-12px_rgb(105_63_168/0.9)]" style={{ backgroundColor: VIOLET }}>
      {children}
    </div>
  );
}

/* ─────────────────────────── Téléphone gauche : importer un cours ─────────────────────────── */

export function ImportCourseScreen() {
  const { dict } = useI18n();
  const s = dict.marketing.how.screens;
  const summary = dict.marketing.features.previews.summary;
  const { ref, index } = useVisibleCycle(3, 3400);

  const fileTypes = [
    { label: s.formats[0], icon: FileText, tone: "bg-[#fef2f2] text-[#c8332c]" },
    { label: s.formats[1], icon: FileImage, tone: "bg-[#ecfdf3] text-[#158f52]" },
    { label: s.formats[2], icon: FileType2, tone: "bg-[#eef4ff] text-[#2f61c4]" },
  ];

  const importState = (
    <div>
      <Item i={0} className="flex items-center gap-2.5">
        <span className="flex size-[30px] items-center justify-center rounded-full text-[15px] font-bold text-white" style={{ backgroundColor: VIOLET }}>
          1
        </span>
        <span className="text-[19px] font-bold" style={{ color: INK }}>{dict.resumer.step1}</span>
      </Item>
      <Item i={1} className="mt-4 flex flex-col items-center rounded-[20px] border-2 border-dashed border-[#d8cbef] bg-[#f6f4fb] px-4 py-6">
        <span className="flex size-[52px] items-center justify-center rounded-full bg-white shadow-[0_6px_16px_-8px_rgb(16_24_40/0.3)]" style={{ color: VIOLET }}>
          <Upload className="size-[24px]" />
        </span>
        <span className="mt-3 text-center text-[16px] font-semibold" style={{ color: INK }}>{dict.resumer.dropLabel}</span>
        <span className="mt-3 flex gap-2">
          {fileTypes.map((type) => {
            const Icon = type.icon;
            return (
              <span key={type.label} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold", type.tone)}>
                <Icon className="size-[14px]" />
                {type.label}
              </span>
            );
          })}
        </span>
      </Item>
      <Item i={2} className="mt-4 flex items-center gap-3 rounded-[16px] border border-[#e6e8ee] bg-white px-4 py-3.5">
        <span className="flex size-[42px] items-center justify-center rounded-[11px] bg-[#fef2f2] text-[#c8332c]">
          <FileText className="size-[21px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold" style={{ color: INK }}>{s.fileName}</span>
          <span className="block text-[13px]" style={{ color: MUTED }}>
            {s.filePages} · {dict.dropzone.imported}
          </span>
        </span>
        <span className="flex size-[24px] items-center justify-center rounded-full bg-[#158f52] text-white">
          <Check className="size-[15px]" strokeWidth={3} />
        </span>
      </Item>
      <Item i={3} className="mt-4 rounded-[16px] border border-[#e6e8ee] bg-white p-4">
        <p className="text-[13px] font-semibold" style={{ color: MUTED }}>{s.previewLabel}</p>
        <div className="mt-3 flex gap-3">
          <div className="h-[118px] w-[88px] shrink-0 rounded-[8px] border border-[#e6e8ee] bg-white p-2.5 shadow-[0_8px_18px_-12px_rgb(16_24_40/0.35)]" style={{ borderColor: LINE }}>
            <div className="h-[6px] w-[70%] rounded-full bg-[#1b1f2a]" />
            <div className="mt-2 space-y-1.5">
              {["w-full", "w-[90%]", "w-full", "w-[76%]", "w-[88%]"].map((w, k) => (
                <div key={k} className={cn("h-[4px] rounded-full bg-[#e6e8ee]", w)} />
              ))}
            </div>
            <div className="mt-2 h-[22px] rounded-[4px] bg-[#ebe4f7]" />
          </div>
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="h-[8px] w-[80%] rounded-full bg-[#1b1f2a]/80" />
            {["w-full", "w-[92%]", "w-[70%]", "w-[86%]", "w-[60%]"].map((w, k) => (
              <div key={k} className={cn("h-[6px] rounded-full bg-[#e6e8ee]", w)} />
            ))}
          </div>
        </div>
      </Item>
      <Item i={4} className="mt-5">
        <PrimaryButton>
          <Sparkles className="size-[19px]" />
          {s.analyze}
        </PrimaryButton>
      </Item>
    </div>
  );

  const analyzingState = (
    <div>
      <Item i={0} className="flex items-center gap-3 rounded-[16px] border border-[#e6e8ee] bg-white px-4 py-3.5">
        <span className="flex size-[42px] items-center justify-center rounded-[11px] bg-[#fef2f2] text-[#c8332c]">
          <FileText className="size-[21px]" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[16px] font-semibold" style={{ color: INK }}>{s.fileName}</span>
      </Item>
      <Item i={1} className="mt-6 flex flex-col items-center text-center">
        <span className="relative flex size-[86px] items-center justify-center rounded-full bg-[#f6f4fb]">
          <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-[#ebe4f7] border-t-[#693fa8] [animation-duration:1.4s]" />
          <Sparkles className="size-[32px]" style={{ color: VIOLET }} />
        </span>
        <span className="mt-4 text-[18px] font-bold" style={{ color: INK }}>{s.analyzing}</span>
      </Item>
      <Item i={2} className="mt-6 space-y-3 rounded-[16px] border border-[#e6e8ee] bg-white p-4">
        {["w-[85%]", "w-full", "w-[72%]", "w-[90%]", "w-[64%]"].map((w, k) => (
          <div key={k} className={cn("skeleton h-[9px] rounded-full", w)} />
        ))}
      </Item>
      <Item i={3} className="mt-5 h-[8px] overflow-hidden rounded-full bg-[#ebe4f7]">
        <div className="h-full w-[68%] rounded-full" style={{ backgroundColor: VIOLET }} />
      </Item>
    </div>
  );

  const summaryState = (
    <div>
      <Item i={0} className="flex items-center gap-2">
        <span className="flex size-[22px] items-center justify-center rounded-full bg-[#158f52] text-white">
          <Check className="size-[13px]" strokeWidth={3} />
        </span>
        <span className="text-[15px] font-bold text-[#158f52]">{s.summaryReady}</span>
      </Item>
      <Item i={1} className="mt-3 overflow-hidden rounded-[18px] border border-[#e6e8ee] bg-white">
        <div className="h-[4px] bg-gradient-to-r from-[#9a76cf] via-[#693fa8] to-[#9a76cf]" />
        <div className="px-4 pb-4 pt-3">
          <p className="border-b-2 pb-2 text-center text-[15px] font-extrabold uppercase tracking-[0.04em]" style={{ color: INK, borderColor: INK }}>
            {summary.title}
          </p>
          <div className="mt-3 flex flex-col items-center">
            <span className="flex size-[26px] items-center justify-center rounded-full bg-[#ebe4f7] text-[13px] font-bold text-[#553087]">1</span>
            <p className="mt-1.5 text-center text-[14px] font-extrabold uppercase tracking-[0.03em]" style={{ color: INK }}>{summary.part1}</p>
          </div>
          <p className="mt-3 text-center text-[14px] font-bold" style={{ color: INK }}>
            <span className="mr-1.5" style={{ color: VIOLET }}>1.1</span>
            {summary.sub1}
          </p>
          <p className="mt-1.5 text-[13px] leading-[1.45]" style={{ color: "#3a4051" }}>{summary.sub1Body}</p>
          <p className="mt-3 text-center text-[14px] font-bold" style={{ color: INK }}>
            <span className="mr-1.5" style={{ color: VIOLET }}>1.2</span>
            {summary.sub2}
          </p>
          <p className="mx-auto mt-1.5 w-fit rounded-[8px] bg-[#f6f4fb] px-3 py-1 text-[12.5px] font-semibold text-[#553087]">
            6 CO2 + 6 H2O → C6H12O6 + 6 O2
          </p>
        </div>
      </Item>
      <Item i={2} className="mt-4">
        <p className="text-[14px] font-bold" style={{ color: INK }}>{dict.resumer.blockKeyConcepts}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {s.keyPoints.map((point) => (
            <span key={point} className="rounded-[9px] border border-[#d8cbef] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#553087]">
              {point}
            </span>
          ))}
        </div>
      </Item>
    </div>
  );

  return (
    <div className="flex size-full flex-col bg-[#f6f7f9] font-sans text-[#1b1f2a]">
      <StatusBar time={s.time} />
      <AppBar title={dict.nav.resumer} />
      <ScreenStates stackRef={ref} active={index} states={[importState, analyzingState, summaryState]} />
    </div>
  );
}

/* ─────────────────────────── Téléphone droit : générer une épreuve ─────────────────────────── */

function Field({ label, value, i }: { label: string; value: string; i: number }) {
  return (
    <Item i={i}>
      <p className="text-[13px] font-semibold" style={{ color: MUTED }}>{label}</p>
      <div className="mt-1.5 flex h-[48px] items-center justify-between rounded-[12px] border border-[#e6e8ee] bg-white px-4 text-[16px] font-semibold" style={{ borderColor: LINE, color: INK }}>
        {value}
        <ChevronDown className="size-[18px]" style={{ color: "#9aa1ac" }} />
      </div>
    </Item>
  );
}

function ScoreRing({ score }: { score: string }) {
  const [got, total] = score.split("/").map(Number);
  const ratio = total ? got / total : 0;
  return (
    <svg viewBox="0 0 36 36" className="size-[92px] shrink-0" aria-hidden>
      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e6e8ee" strokeWidth="3.4" />
      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#1fb268" strokeWidth="3.4" strokeDasharray={`${ratio * 100} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
      <text x="18" y="20.6" textAnchor="middle" fill={INK} style={{ font: "800 7.6px var(--font-sans)" }}>
        {score}
      </text>
    </svg>
  );
}

export function GenerateExamScreen() {
  const { dict } = useI18n();
  const s = dict.marketing.how.screens;
  const g = dict.generer;
  const exam = dict.marketing.features.previews.exam;
  const correction = dict.marketing.features.previews.correction;
  const { ref, index } = useVisibleCycle(2, 4200);

  const formState = (
    <div>
      <Item i={0} className="flex items-center gap-2.5">
        <span className="flex size-[30px] items-center justify-center rounded-full text-[15px] font-bold text-white" style={{ backgroundColor: VIOLET }}>
          2
        </span>
        <span className="text-[19px] font-bold" style={{ color: INK }}>{g.step2}</span>
      </Item>
      <div className="mt-4 space-y-3.5">
        <Field i={1} label={g.subject} value={s.subjectValue} />
        <Field i={2} label={g.level} value={s.levelValue} />
        <div className="grid grid-cols-2 gap-3">
          <Field i={3} label={g.questionCount} value={s.questionsValue} />
          <Field i={4} label={g.duration} value={s.durationValue} />
        </div>
        <Field i={5} label={g.totalPoints} value={s.totalPointsValue} />
      </div>
      <Item i={6} className="mt-6">
        <PrimaryButton>
          <Sparkles className="size-[19px]" />
          {g.submit}
        </PrimaryButton>
      </Item>
    </div>
  );

  const resultState = (
    <div>
      <Item i={0} className="flex items-center gap-2">
        <span className="flex size-[22px] items-center justify-center rounded-full bg-[#158f52] text-white">
          <Check className="size-[13px]" strokeWidth={3} />
        </span>
        <span className="text-[15px] font-bold text-[#158f52]">{s.examReady}</span>
      </Item>
      <Item i={1} className="mt-3 rounded-[16px] border-2 border-[#1b1f2a] bg-white">
        <div className="rounded-[14px]">
          <p className="px-4 pt-3 text-center text-[16px] font-extrabold uppercase tracking-[0.03em]" style={{ color: INK }}>{exam.title}</p>
          <p className="pb-3 text-center text-[13px] font-medium" style={{ color: MUTED }}>{s.examMeta}</p>
          <div className="flex justify-center gap-2 border-t px-4 py-3" style={{ borderColor: LINE }}>
            {["A", "B", "C", "D"].map((letter) => (
              <span key={letter} className="flex size-[34px] items-center justify-center rounded-[9px] bg-[#f6f4fb] text-[15px] font-extrabold text-[#553087] ring-1 ring-[#d8cbef]">
                {letter}
              </span>
            ))}
          </div>
        </div>
      </Item>
      <Item i={2} className="mt-4 rounded-[18px] border border-[#e6e8ee] bg-white p-4">
        <p className="text-[14px] font-bold" style={{ color: INK }}>{s.correctionLabel}</p>
        <div className="mt-2 flex items-center gap-4">
          <ScoreRing score={correction.score} />
          <div>
            <p className="text-[13px] font-semibold" style={{ color: MUTED }}>{correction.scoreLabel}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[16px] font-bold text-[#12723f]">
              <Sparkles className="size-[16px]" />
              {s.praise}
            </p>
          </div>
        </div>
      </Item>
      <div className="mt-3 space-y-2">
        {correction.rows.map((row, k) => (
          <Item key={row.question} i={3 + k} className="flex items-center gap-3 rounded-[14px] border border-[#e6e8ee] bg-white px-3.5 py-2.5">
            <span className="flex h-[28px] min-w-[42px] items-center justify-center rounded-[8px] bg-[#ebe4f7] text-[13px] font-bold text-[#553087]">
              {row.question}
            </span>
            <span className={cn("rounded-full px-2.5 py-1 text-[12.5px] font-semibold", k === 1 ? "bg-[#fff4ec] text-[#b74a10]" : "bg-[#ecfdf3] text-[#12723f]")}>
              {row.verdict}
            </span>
            <span className="ml-auto text-[14px] font-bold tabular-nums" style={{ color: INK }}>{row.points}</span>
          </Item>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex size-full flex-col bg-[#f6f7f9] font-sans text-[#1b1f2a]">
      <StatusBar time={s.time} />
      <AppBar title={dict.nav.generer} />
      <ScreenStates stackRef={ref} active={index} states={[formState, resultState]} />
    </div>
  );
}
