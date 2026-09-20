import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { cardVariants } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type Tone = "success" | "warning" | "info" | "primary" | "danger" | "neutral";

/**
 * En-tête d'un panneau de résultat : titre + statut à gauche, barre d'actions à
 * droite. Masqué à l'impression (`data-print-hide`).
 */
export function ResultHeader({
  title,
  status,
  statusTone = "success",
  actions,
}: {
  title: string;
  status?: string;
  statusTone?: Tone;
  actions?: React.ReactNode;
}) {
  return (
    <div
      data-print-hide
      className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <h2 className="min-w-0 break-words text-title-sm font-bold text-ink-900">
          {title}
        </h2>
        {status ? <Badge tone={statusTone}>{status}</Badge> : null}
      </div>
      {/* `min-w-0` (et non `shrink-0`) : en ligne (xl), la barre d'actions peut
          rétrécir et ses boutons passent à la ligne plutôt que de déborder. */}
      {actions ? <div className="min-w-0">{actions}</div> : null}
    </div>
  );
}

/** Feuille blanche imprimable — le « document » généré. */
export function DocumentSheet({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-print-root
      className={cn(
        cardVariants({ variant: "content" }),
        "relative overflow-hidden p-6 sm:p-8 lg:p-10",
        className,
      )}
    >
      {/* Filet d'accent en tête de feuille — signature discrète du « document
          généré », dans l'esprit d'un en-tête officiel. Décoratif uniquement :
          survit à l'impression (ce n'est pas une bordure de carte, que le CSS
          d'impression neutralise). */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400"
      />
      <div className="mx-auto max-w-[46rem]">{children}</div>
    </div>
  );
}

/** Titre principal du document, centré, avec filet de séparation. */
export function DocumentTitle({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <header className="border-b-2 border-ink-900 pb-3 text-center">
      <h3 className="text-lg font-extrabold uppercase tracking-[0.02em] text-ink-900 [overflow-wrap:anywhere] sm:text-xl">
        {children}
      </h3>
      {subtitle ? (
        <p className="mt-1 break-words text-fine font-medium text-ink-500">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

export interface MetaItem {
  label: string;
  value: React.ReactNode;
}

/** Grille d'informations d'en-tête (Niveau, Matière, Durée, Date…). */
export function DocumentMetaGrid({ items }: { items: MetaItem[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2 border-b border-line py-4 text-fine sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="flex gap-2">
          <dt className="shrink-0 font-semibold text-ink-700">{item.label} :</dt>
          <dd className="min-w-0 flex-1 break-words text-ink-900">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Bloc « PARTIE 1 : QCM » — titre d'accent violet + consigne. */
export function DocumentPart({
  title,
  points,
  instructions,
  children,
}: {
  title: string;
  points?: number;
  instructions?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7 border-l-2 border-primary-100 pl-4 first:mt-6">
      <h4 className="break-words text-[0.9rem] font-bold uppercase tracking-[0.02em] text-primary-600">
        {title}
        {typeof points === "number" ? (
          <span className="text-primary-400"> ({points} points)</span>
        ) : null}
      </h4>
      {instructions ? (
        <p className="mt-1 text-fine italic text-ink-500">
          {instructions}
        </p>
      ) : null}
      <div className="mt-3.5 space-y-4">{children}</div>
    </section>
  );
}

/** Numéro de question dans une pastille violette. */
export function QuestionNumber({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary-100 text-badge font-bold text-primary-700">
      {children}
    </span>
  );
}

/** Bloc thématique encadré (définitions, points forts, conseils…). */
export function DocumentBlock({
  title,
  icon: Icon,
  tone = "primary",
  children,
}: {
  title: string;
  icon?: LucideIcon;
  tone?: "primary" | "success" | "warning";
  children: React.ReactNode;
}) {
  const tones = {
    primary: "border-primary-200 bg-primary-50/60 text-primary-700",
    success: "border-success-200 bg-success-50/60 text-success-700",
    warning: "border-warning-200 bg-warning-50/70 text-warning-700",
  } as const;

  return (
    <section className={cn("rounded-xl border p-4", tones[tone])}>
      <h4 className="flex items-center gap-1.5 text-[0.9rem] font-bold">
        {Icon ? <Icon className="size-4" aria-hidden /> : null}
        {title}
      </h4>
      <div className="mt-2 text-ink-700">{children}</div>
    </section>
  );
}

/** Pied de document, centré. */
export function DocumentFooter({ children }: { children: React.ReactNode }) {
  return (
    <footer className="mt-8 border-t border-line pt-4 text-center text-fine font-semibold text-ink-500">
      {children}
    </footer>
  );
}
