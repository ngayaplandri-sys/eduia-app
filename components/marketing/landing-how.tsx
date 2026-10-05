import { Reveal } from "@/components/motion/reveal";
import { getDictionary } from "@/lib/i18n/server";
import { InteractivePhone } from "./interactive-phone";
import { SummarizeScreens, GradeScreens } from "./how-phone-screens";
import { SectionHeading } from "./marketing-ui";

/**
 * « Comment ça marche ? » — deux iPhone réalistes en perspective encadrent les
 * trois étapes (ordinateur : grille `auto | 1fr | auto`). Les téléphones
 * entrent avec un léger mouvement, leurs écrans se remplissent quand ils
 * deviennent visibles ; les étapes apparaissent une par une, reliées par un
 * trait qui se dessine.
 *
 * Mobile/tablette : titre et étapes d'abord, puis les deux téléphones en duo
 * superposé (l'un devant l'autre), au lieu de deux colonnes réduites.
 */
export async function LandingHow() {
  const dict = await getDictionary();
  const t = dict.marketing.how;

  const phoneLeft = (
    <InteractivePhone ariaLabel={t.phoneAriaSummarize}>
      <SummarizeScreens t={t.mockup} />
    </InteractivePhone>
  );
  const phoneRight = (
    <InteractivePhone ariaLabel={t.phoneAriaGrade}>
      <GradeScreens t={t.mockup} />
    </InteractivePhone>
  );

  return (
    <section
      id="comment-ca-marche"
      className="relative isolate scroll-mt-20 overflow-hidden bg-canvas pb-24 pt-24 sm:pb-28 sm:pt-28 lg:pb-32 lg:pt-32"
    >
      {/* Lumière d'ambiance : deux halos lavande derrière les téléphones. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-1/3 size-[32rem] rounded-full bg-primary-200/40 blur-[120px] dark:bg-primary-300/20" />
        <div className="absolute -right-32 bottom-0 size-[30rem] rounded-full bg-primary-100/70 blur-[120px] dark:bg-primary-200/25" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-4 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-8 lg:px-8 xl:gap-14">
        {/* Téléphone gauche (ordinateur). */}
        <Reveal variant="scale" className="hidden justify-center lg:flex">
          <div className="[transform:perspective(1600px)_rotateY(16deg)_rotateZ(-2deg)]">
            {phoneLeft}
          </div>
        </Reveal>

        <div className="mx-auto w-full max-w-xl">
          <SectionHeading
            before={t.heading}
            accent={t.headingAccent}
            after={t.headingSuffix}
            subtitle={t.subtitle}
            align="center"
          />

          <Reveal variant="fade" className="relative mx-auto mt-12 max-w-md">
            {/* Trait reliant les étapes, dessiné à l'apparition. */}
            <span
              aria-hidden
              className="draw-line-y absolute bottom-8 left-[1.375rem] top-8 w-px bg-gradient-to-b from-primary-300 via-primary-200 to-transparent"
            />
            <ol className="space-y-8">
              {t.steps.map((step, i) => (
                <li key={step.title}>
                  <Reveal delayMs={150 + i * 160} className="relative flex gap-5">
                    <span className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full bg-surface font-display text-[1.05rem] font-medium tabular-nums text-primary-600 shadow-[var(--shadow-card)] ring-1 ring-primary-200">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="pt-1.5">
                      <h3 className="text-[1.02rem] font-bold text-ink-900">{step.title}</h3>
                      <p className="mt-1.5 text-[0.93rem] leading-relaxed text-ink-500">
                        {step.description}
                      </p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>

        {/* Téléphone droit (ordinateur). */}
        <Reveal variant="scale" delayMs={180} className="hidden justify-center lg:flex">
          <div className="[transform:perspective(1600px)_rotateY(-16deg)_rotateZ(2deg)]">
            {phoneRight}
          </div>
        </Reveal>

        {/* Mobile / tablette : duo superposé. */}
        <div className="relative mx-auto flex h-[30rem] w-full max-w-sm justify-center lg:hidden">
          <Reveal variant="scale" className="absolute left-0 top-0 z-0 sm:left-4">
            <div className="origin-top-left scale-[0.86] [transform:perspective(1400px)_rotateY(14deg)_rotateZ(-4deg)]">
              {phoneLeft}
            </div>
          </Reveal>
          <Reveal variant="scale" delayMs={160} className="absolute right-0 top-10 z-10 sm:right-4">
            <div className="origin-top-right scale-[0.86] [transform:perspective(1400px)_rotateY(-14deg)_rotateZ(3deg)]">
              {phoneRight}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
