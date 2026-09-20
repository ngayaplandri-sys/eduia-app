import { cn } from "@/lib/utils/cn";

/**
 * Section numérotée d'un panneau de configuration (« 1. Importer ton cours »).
 * Structure commune aux trois outils : Résumer / Générer / Corriger.
 */
export function ConfigSection({
  step,
  title,
  description,
  children,
  className,
}: {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3.5", className)}>
      <div className="flex items-center gap-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-fine font-bold text-white shadow-[0_2px_8px_-2px_rgb(28_67_115/0.5)]">
          {step}
        </span>
        <h2 className="text-title-sm font-bold text-ink-900">{title}</h2>
      </div>
      {description ? (
        <p className="-mt-2 text-fine text-ink-400">{description}</p>
      ) : null}
      {children}
    </section>
  );
}
