import {
  Check,
  ClipboardCheck,
  FileImage,
  FilePenLine,
  FileText,
  FileType2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { ScoreRing } from "./scene-cards";

type Previews = Dictionary["marketing"]["features"]["previews"];

/**
 * Aperçus des vrais écrans d'EduIA (versions miniatures des composants de
 * l'application : dépôt de fichiers, résumé numéroté 1 / 1.1, épreuve en
 * parties A/B, rapport de correction, historique). Construits avec les tokens
 * du design system : ils suivent le thème clair/sombre comme l'application.
 */

function PreviewCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-surface p-5 shadow-[0_30px_70px_-30px_rgb(43_27_74/0.45),0_10px_24px_-14px_rgb(16_24_40/0.18)] ring-1 ring-line sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── 1. Cours ─────────────────────────────────────────────────────────────── */

const FILE_TYPES = [
  { icon: FileText, className: "bg-danger-50 text-danger-600" },
  { icon: FileType2, className: "bg-info-50 text-info-600" },
  { icon: FileImage, className: "bg-success-50 text-success-600" },
];

export function CoursePreview({ t }: { t: Previews["course"] }) {
  return (
    <PreviewCard>
      <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/50 px-4 py-6 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-surface text-primary-600 shadow-[var(--shadow-card)]">
          <Upload className="size-5" aria-hidden />
        </span>
        <p className="mt-3 text-sm font-semibold text-ink-900">{t.dropTitle}</p>
        <p className="mt-1 text-fine text-ink-500">{t.dropHint}</p>
      </div>
      <ul className="mt-4 space-y-2">
        {t.files.map((file, i) => {
          const type = FILE_TYPES[i % FILE_TYPES.length];
          const Icon = type.icon;
          return (
            <li key={file} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", type.className)}>
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate text-fine font-semibold text-ink-800">{file}</span>
              <span className="flex size-5 items-center justify-center rounded-full bg-success-600 text-white">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center justify-between text-fine">
        <span className="font-medium text-ink-500">{t.reading}</span>
        <span className="font-semibold tabular-nums text-ink-900">{t.readingCount}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-100">
        <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-primary-500 to-primary-600" />
      </div>
    </PreviewCard>
  );
}

/* ── 2. Résumé ────────────────────────────────────────────────────────────── */

export function SummaryPreview({ t }: { t: Previews["summary"] }) {
  return (
    <PreviewCard className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400" />
      <p className="border-b-2 border-ink-900 pb-2.5 text-center text-sm font-extrabold uppercase tracking-[0.04em] text-ink-900">
        {t.title}
      </p>
      <div className="mt-5 flex flex-col items-center text-center">
        <span className="grid size-7 place-items-center rounded-full bg-primary-100 text-fine font-bold text-primary-700 ring-1 ring-primary-200">
          1
        </span>
        <p className="mt-2 text-[0.82rem] font-extrabold uppercase tracking-[0.04em] text-ink-900">
          {t.part1}
        </p>
        <span className="mt-2 h-0.5 w-10 rounded-full bg-primary-300" />
      </div>
      <p className="mt-4 text-center text-[0.86rem] font-bold text-ink-900">
        <span className="mr-1.5 tabular-nums text-primary-600">1.1</span>
        {t.sub1}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-fine leading-relaxed text-ink-700">{t.sub1Body}</p>
      <p className="mt-4 text-center text-[0.86rem] font-bold text-ink-900">
        <span className="mr-1.5 tabular-nums text-primary-600">1.2</span>
        {t.sub2}
      </p>
      <p className="mx-auto mt-2 w-fit rounded-lg bg-primary-50 px-3 py-1.5 text-fine font-semibold text-primary-700">
        6 CO2 + 6 H2O → C6H12O6 + 6 O2
      </p>
      <div className="relative mt-5 flex flex-col items-center text-center opacity-60 [mask-image:linear-gradient(to_bottom,#000,transparent)]">
        <span className="grid size-7 place-items-center rounded-full bg-primary-100 text-fine font-bold text-primary-700">
          2
        </span>
        <p className="mt-2 text-[0.82rem] font-extrabold uppercase tracking-[0.04em] text-ink-900">
          {t.part2}
        </p>
      </div>
    </PreviewCard>
  );
}

/* ── 3. Épreuve ───────────────────────────────────────────────────────────── */

export function ExamPreview({ t }: { t: Previews["exam"] }) {
  return (
    <PreviewCard>
      <div className="rounded-lg border-2 border-ink-900">
        <p className="px-4 py-3 text-center text-sm font-extrabold uppercase tracking-[0.03em] text-ink-900">
          {t.title}
        </p>
        <div className="grid grid-cols-3 gap-2 border-t border-ink-900 px-3 py-2 text-[0.68rem] font-semibold text-ink-700 max-sm:grid-cols-1 max-sm:gap-0.5">
          <span>{t.level}</span>
          <span className="text-center max-sm:text-left">{t.duration}</span>
          <span className="text-right max-sm:text-left">{t.scale}</span>
        </div>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3 border-b-2 border-ink-900 pb-1.5">
        <div>
          <p className="text-badge font-extrabold uppercase tracking-[0.14em] text-primary-600">{t.partLabel}</p>
          <p className="mt-1 text-[0.82rem] font-extrabold uppercase tracking-[0.03em] text-ink-900">{t.partTitle}</p>
        </div>
        <span className="text-fine font-bold tabular-nums text-ink-700">{t.partPoints}</span>
      </div>
      <div className="mt-4 flex items-start gap-2.5">
        <span className="inline-flex h-6 min-w-9 shrink-0 items-center justify-center rounded-md bg-primary-100 px-1.5 text-badge font-bold text-primary-700">
          A.1
        </span>
        <p className="min-w-0 flex-1 text-fine font-medium text-ink-900">{t.question}</p>
        <span className="shrink-0 rounded-md bg-primary-50 px-1.5 py-0.5 text-[0.68rem] font-semibold text-primary-700">
          {t.points}
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-1 gap-1.5 pl-11">
        {t.choices.map((choice, i) => (
          <span key={choice} className="flex min-w-0 items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[0.72rem] text-ink-700">
            <span className="size-3 shrink-0 rounded-full border border-ink-400" />
            <span className="font-semibold text-ink-900">{String.fromCharCode(65 + i)}.</span>
            <span className="min-w-0 truncate">{choice}</span>
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-2.5">
        <span className="inline-flex h-6 min-w-9 shrink-0 items-center justify-center rounded-md bg-primary-100 px-1.5 text-badge font-bold text-primary-700">
          A.2
        </span>
        <p className="min-w-0 flex-1 text-fine font-medium text-ink-900">{t.question2}</p>
        <span className="shrink-0 rounded-md bg-primary-50 px-1.5 py-0.5 text-[0.68rem] font-semibold text-primary-700">
          {t.points}
        </span>
      </div>
      <div className="mt-1.5 pl-11" aria-hidden>
        <div className="h-5 border-b border-dotted border-ink-400/70" />
        <div className="h-5 border-b border-dotted border-ink-400/70" />
      </div>
    </PreviewCard>
  );
}

/* ── 4. Correction ────────────────────────────────────────────────────────── */

export function CorrectionPreview({ t }: { t: Previews["correction"] }) {
  return (
    <PreviewCard>
      <div className="flex items-center gap-4 rounded-xl bg-success-50/70 p-4 ring-1 ring-success-200">
        <ScoreRing score={t.score} className="size-20 text-ink-900" trackClassName="stroke-line" />
        <div>
          <p className="text-fine font-semibold text-ink-500">{t.scoreLabel}</p>
          <p className="mt-0.5 font-display text-[2rem] font-medium leading-none text-ink-900 tabular-nums">
            {t.score}
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {t.rows.map((row, i) => {
          const partial = i === 1;
          return (
            <li key={row.question} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
              <span className="inline-flex h-6 min-w-9 items-center justify-center rounded-md bg-primary-100 px-1.5 text-badge font-bold text-primary-700">
                {row.question}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[0.7rem] font-semibold",
                  partial ? "bg-warning-50 text-warning-700" : "bg-success-50 text-success-700",
                )}
              >
                {row.verdict}
              </span>
              <span className="ml-auto text-fine font-bold tabular-nums text-ink-900">{row.points}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 rounded-xl bg-warning-50/80 px-3.5 py-3 text-fine leading-relaxed text-ink-700 ring-1 ring-warning-200">
        {t.feedback}
      </p>
    </PreviewCard>
  );
}

/* ── 5. Progression ───────────────────────────────────────────────────────── */

const HISTORY_ICONS = [
  { icon: FileText, className: "bg-success-50 text-success-600" },
  { icon: FilePenLine, className: "bg-primary-50 text-primary-600" },
  { icon: ClipboardCheck, className: "bg-warning-50 text-warning-600" },
];

export function ProgressPreview({ t }: { t: Previews["progress"] }) {
  return (
    <PreviewCard>
      <p className="text-sm font-bold text-ink-900">{t.heading}</p>
      <ul className="mt-3 space-y-2">
        {t.items.map((item, i) => {
          const type = HISTORY_ICONS[i % HISTORY_ICONS.length];
          const Icon = type.icon;
          return (
            <li key={`${item.type}-${item.title}`} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", type.className)}>
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.7rem] font-semibold text-ink-400">{item.type}</span>
                <span className="block truncate text-fine font-semibold text-ink-900">{item.title}</span>
              </span>
              <span className="rounded-full bg-success-50 px-2 py-0.5 text-[0.7rem] font-semibold text-success-700">
                {item.status}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 rounded-xl bg-primary-50/70 p-4 ring-1 ring-primary-100">
        <div className="flex items-center justify-between text-fine">
          <span className="font-medium text-ink-500">{t.creditsLabel}</span>
          <span className="font-bold tabular-nums text-ink-900">{t.creditsValue}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-100">
          <div className="h-full w-[93%] rounded-full bg-gradient-to-r from-primary-500 to-primary-600" />
        </div>
      </div>
    </PreviewCard>
  );
}
