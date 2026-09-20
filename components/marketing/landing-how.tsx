import { Reveal } from "@/components/motion/reveal";
import { getDictionary } from "@/lib/i18n/server";
import { InteractivePhone } from "./interactive-phone";
import { SummarizeScreens, GradeScreens } from "./how-phone-screens";

/**
 * Démonstration interactive : deux mockups d'iPhone réalistes encadrant le
 * bloc « Comment ça marche ? », parfaitement centré entre eux (grille 3
 * colonnes `auto | 1fr | auto` à partir de `lg`). En dessous de `lg`, les
 * trois blocs s'empilent dans leur ordre naturel du DOM — téléphone Résumer
 * au-dessus, contenu au centre, téléphone Générer/Corriger en dessous —
 * aucune classe `order` nécessaire.
 */
export async function LandingHow() {
  const dict = await getDictionary();
  const t = dict.marketing.how;

  return (
    <section
      id="comment-ca-marche"
      className="scroll-mt-20 bg-surface py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[auto_1fr_auto] lg:gap-6 lg:px-8 xl:gap-12">
        <Reveal className="flex justify-center">
          <InteractivePhone ariaLabel={t.phoneAriaSummarize} className="-rotate-2">
            <SummarizeScreens t={t.mockup} />
          </InteractivePhone>
        </Reveal>

        <div className="mx-auto max-w-sm text-center lg:max-w-none">
          <span className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-fine font-semibold text-primary-700">
            {t.badge}
          </span>
          <h2 className="mt-4 text-[1.75rem] font-extrabold tracking-[-0.02em] text-ink-900 sm:text-[2.25rem]">
            {t.heading} <span className="text-primary-600">{t.headingAccent}</span> ?
          </h2>

          <ol className="mx-auto mt-8 max-w-xs space-y-6 text-left sm:max-w-sm">
            {t.steps.map((step, i) => (
              <li key={step.title}>
                <Reveal delayMs={i * 90} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-primary-200 text-sm font-extrabold text-primary-600">
                    {i + 1}
                  </span>
                  <div className="pt-1">
                    <h3 className="text-[0.95rem] font-bold text-ink-900">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-500">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>

        <Reveal delayMs={120} className="flex justify-center">
          <InteractivePhone ariaLabel={t.phoneAriaGrade} className="rotate-2">
            <GradeScreens t={t.mockup} />
          </InteractivePhone>
        </Reveal>
      </div>
    </section>
  );
}
