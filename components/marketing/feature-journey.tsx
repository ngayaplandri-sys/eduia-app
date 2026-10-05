"use client";

import * as React from "react";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils/cn";

export interface JourneyStep {
  label: string;
  title: string;
  body: string;
  /** Icône déjà rendue (élément React : les composants ne traversent pas la frontière serveur/client). */
  icon: React.ReactNode;
  /** Classes de la pastille d'icône (ton sémantique). */
  iconClassName: string;
  preview: React.ReactNode;
}

/**
 * Parcours « Cours → Résumé → Épreuve → Correction → Progression » raconté
 * au scroll.
 *
 * Ordinateur : la liste des étapes reste fixe à gauche (`sticky`) pendant que
 * les aperçus défilent à droite ; l'étape dont l'aperçu traverse le centre de
 * l'écran devient active (IntersectionObserver, aucun écouteur de scroll), la
 * barre de progression avance et l'aperçu actif passe au premier plan
 * (« mise au point »), les autres restent légèrement en retrait.
 * Mobile/tablette : chaque étape empile son titre, son texte et son aperçu.
 */
export function FeatureJourney({ steps, label }: { steps: JourneyStep[]; label: string }) {
  const [active, setActive] = React.useState(0);
  const panels = React.useRef<(HTMLDivElement | null)[]>([]);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.step));
          }
        }
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    for (const node of panels.current) if (node) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const progress = steps.length > 1 ? active / (steps.length - 1) : 1;

  return (
    <div className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
      {/* Étapes fixes (ordinateur). */}
      <div className="hidden lg:block">
        <div className="sticky top-32">
          <ol aria-label={label} className="relative">
            <span aria-hidden className="absolute bottom-6 left-[1.3rem] top-6 w-px bg-line" />
            <span
              aria-hidden
              className="absolute left-[1.3rem] top-6 w-px origin-top bg-gradient-to-b from-primary-400 to-primary-600 transition-transform duration-700 ease-out"
              style={{ height: "calc(100% - 3rem)", transform: `scaleY(${progress})` }}
            />
            {steps.map((step, i) => {
              const isActive = i === active;
              const done = i < active;
              return (
                <li key={step.label} className="relative">
                  <a
                    href={`#parcours-${i + 1}`}
                    aria-current={isActive ? "step" : undefined}
                    className="group flex gap-4 rounded-2xl py-3 pr-3 transition-colors"
                  >
                    <span
                      className={cn(
                        "relative z-10 flex size-[2.6rem] shrink-0 items-center justify-center rounded-full ring-1 transition-[background-color,color,box-shadow,transform] duration-500",
                        isActive
                          ? "scale-110 bg-primary-600 text-white shadow-[0_10px_24px_-10px_rgb(105_63_168/0.8)] ring-primary-600"
                          : done
                            ? "bg-primary-100 text-primary-700 ring-primary-200"
                            : "bg-surface text-ink-400 ring-line group-hover:text-primary-600",
                      )}
                    >
                      {step.icon}
                    </span>
                    <span className="min-w-0 pt-1">
                      <span
                        className={cn(
                          "block text-fine font-semibold transition-colors duration-300",
                          isActive ? "text-primary-600" : "text-ink-400",
                        )}
                      >
                        {step.label}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-[1.05rem] font-bold leading-snug transition-colors duration-300",
                          isActive ? "text-ink-900" : "text-ink-500 group-hover:text-ink-700",
                        )}
                      >
                        {step.title}
                      </span>
                      {/* Texte de l'étape active : déplié en douceur. */}
                      <span
                        className={cn(
                          "grid transition-[grid-template-rows,opacity] duration-500 ease-out",
                          isActive ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                        )}
                      >
                        <span className="overflow-hidden">
                          <span className="block pt-2 text-[0.93rem] leading-relaxed text-ink-500">
                            {step.body}
                          </span>
                        </span>
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Aperçus. */}
      <div className="space-y-16 lg:space-y-0">
        {steps.map((step, i) => (
          <div
            key={step.label}
            id={`parcours-${i + 1}`}
            data-step={i}
            ref={(node) => {
              panels.current[i] = node;
            }}
            className="scroll-mt-28 lg:flex lg:min-h-[80vh] lg:items-center"
          >
            <div className="w-full">
              {/* En-tête d'étape (mobile/tablette). */}
              <Reveal className="mb-6 lg:hidden">
                <div className="flex items-center gap-3">
                  <span className={cn("flex size-10 items-center justify-center rounded-full", step.iconClassName)}>
                    {step.icon}
                  </span>
                  <span className="text-fine font-semibold text-primary-600">
                    {String(i + 1).padStart(2, "0")} {step.label}
                  </span>
                </div>
                <h3 className="mt-3 text-[1.2rem] font-bold text-ink-900">{step.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-500">{step.body}</p>
              </Reveal>

              <Reveal variant="media">
                <div
                  className={cn(
                    "relative rounded-[2rem] p-5 transition-[opacity,transform] duration-700 ease-out sm:p-8 lg:p-10",
                    "bg-[radial-gradient(120%_120%_at_0%_0%,var(--color-primary-100),transparent_60%),radial-gradient(90%_90%_at_100%_100%,var(--color-primary-50),transparent_60%)]",
                    i === active ? "lg:scale-100 lg:opacity-100" : "lg:scale-[0.95] lg:opacity-50",
                  )}
                >
                  <div className="mx-auto max-w-md">{step.preview}</div>
                </div>
              </Reveal>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
