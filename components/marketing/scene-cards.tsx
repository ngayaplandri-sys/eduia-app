import { Bot, Check, FilePenLine, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Cartes d'interface EduIA posées dans les scènes photo (hero, « Pourquoi
 * EduIA ») : mêmes formes, couleurs et icônes que l'application.
 *
 * Couleurs volontairement fixes (pas de tokens) : ces cartes représentent
 * l'interface claire d'EduIA flottant devant une photo ; elles ne doivent pas
 * s'inverser avec le thème sombre du site (sinon texte clair sur verre clair).
 * Purement décoratives : le conteneur parent porte `aria-hidden`.
 */

const INK = "text-[#1b1f2a]";
const MUTED = "text-[#666c7c]";

function CardShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("glass-panel rounded-2xl p-3.5", className)}>{children}</div>
  );
}

function CardLabel({
  icon: Icon,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  tone: "green" | "violet" | "orange";
}) {
  const tones = {
    green: "bg-[#d3f4e1] text-[#12723f]",
    violet: "bg-[#ebe4f7] text-[#553087]",
    orange: "bg-[#fde3cd] text-[#b74a10]",
  } as const;
  return (
    <div className="flex items-center gap-2">
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
        <Icon className="size-[0.95rem]" strokeWidth={2.2} />
      </span>
      <span className={cn("text-[0.72rem] font-semibold", MUTED)}>{label}</span>
    </div>
  );
}

/** « Résumé généré » : titre + plan numéroté esquissé (comme les vrais résumés). */
export function SummaryCard({
  label,
  title,
  meta,
  className,
}: {
  label: string;
  title: string;
  meta: string;
  className?: string;
}) {
  return (
    <CardShell className={cn("w-[15.5rem]", className)}>
      <div className="flex items-center justify-between gap-2">
        <CardLabel icon={FileText} label={label} tone="green" />
        <span className="flex size-5 items-center justify-center rounded-full bg-[#158f52] text-white">
          <Check className="size-3" strokeWidth={3} />
        </span>
      </div>
      <p className={cn("mt-2.5 text-[0.95rem] font-bold leading-tight", INK)}>{title}</p>
      <p className={cn("mt-0.5 text-[0.7rem] font-medium", MUTED)}>{meta}</p>
      <div className="mt-3 space-y-1.5">
        {[
          ["1", "w-[72%]"],
          ["1.1", "w-[58%]"],
          ["2", "w-[66%]"],
        ].map(([n, width]) => (
          <div key={n} className="flex items-center gap-2">
            <span className="w-5 text-[0.62rem] font-bold tabular-nums text-[#693fa8]">{n}</span>
            <span className={cn("h-1.5 rounded-full bg-[#e6e8ee]", width)} />
          </div>
        ))}
      </div>
    </CardShell>
  );
}

/** « Épreuve créée » : parties lettrées A à D, comme les vraies épreuves. */
export function ExamCard({
  label,
  title,
  meta,
  className,
}: {
  label: string;
  title: string;
  meta: string;
  className?: string;
}) {
  return (
    <CardShell className={cn("w-[14.5rem]", className)}>
      <CardLabel icon={FilePenLine} label={label} tone="violet" />
      <p className={cn("mt-2.5 text-[0.92rem] font-bold leading-tight", INK)}>{title}</p>
      <p className={cn("mt-0.5 text-[0.7rem] font-medium", MUTED)}>{meta}</p>
      <div className="mt-3 flex gap-1.5">
        {["A", "B", "C", "D"].map((letter) => (
          <span
            key={letter}
            className="flex size-7 items-center justify-center rounded-md bg-[#f6f4fb] text-[0.7rem] font-extrabold text-[#553087] ring-1 ring-[#d8cbef]"
          >
            {letter}
          </span>
        ))}
      </div>
    </CardShell>
  );
}

/**
 * Anneau de score (même rendu que le rapport de correction). Le texte suit
 * `currentColor` et la piste `trackClassName` : utilisable sur une carte
 * claire fixe (scènes photo) comme sur une carte tokenisée (thème sombre).
 */
export function ScoreRing({
  score,
  className,
  trackClassName = "stroke-[#e6e8ee]",
}: {
  score: string;
  className?: string;
  trackClassName?: string;
}) {
  const [got, total] = score.split("/").map(Number);
  const ratio = total ? Math.max(0, Math.min(1, got / total)) : 0;
  return (
    <svg viewBox="0 0 36 36" className={cn("size-14 shrink-0 text-[#1b1f2a]", className)} aria-hidden>
      <circle cx="18" cy="18" r="15.9155" fill="none" className={trackClassName} strokeWidth="3.4" />
      <circle
        cx="18"
        cy="18"
        r="15.9155"
        fill="none"
        stroke="#1fb268"
        strokeWidth="3.4"
        strokeDasharray={`${ratio * 100} 100`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
      <text
        x="18"
        y="20.4"
        textAnchor="middle"
        fill="currentColor"
        style={{ font: "800 7.4px var(--font-sans)" }}
      >
        {score}
      </text>
    </svg>
  );
}

/** « Correction détaillée » : score + appréciation. */
export function CorrectionCard({
  label,
  score,
  praise,
  className,
}: {
  label: string;
  score: string;
  praise: string;
  className?: string;
}) {
  return (
    <CardShell className={cn("flex w-[15rem] items-center gap-3", className)}>
      <ScoreRing score={score} />
      <div className="min-w-0">
        <p className={cn("text-[0.72rem] font-semibold", MUTED)}>{label}</p>
        <p className="mt-1 flex items-center gap-1 text-[0.85rem] font-bold text-[#12723f]">
          <Sparkles className="size-3.5" strokeWidth={2.2} />
          {praise}
        </p>
      </div>
    </CardShell>
  );
}

/** Bulle de question à l'Assistant IA (verre sombre, posée sur la scène). */
export function AssistantBubble({
  label,
  question,
  tone = "dark",
  className,
}: {
  label: string;
  question: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "flex max-w-[16rem] items-start gap-2.5 rounded-2xl rounded-br-md px-3.5 py-3",
        dark ? "glass-dark text-white" : "glass-panel",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          dark ? "bg-[#7c4fbe] text-white" : "bg-[#ebe4f7] text-[#553087]",
        )}
      >
        <Bot className="size-4" strokeWidth={2.1} />
      </span>
      <div className="min-w-0">
        <p className={cn("text-[0.66rem] font-semibold", dark ? "text-white/60" : MUTED)}>
          {label}
        </p>
        <p className={cn("mt-0.5 text-[0.82rem] font-medium leading-snug", dark ? "text-white" : INK)}>
          {question}
        </p>
      </div>
    </div>
  );
}
