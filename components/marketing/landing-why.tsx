import Image from "next/image";
import studentDaylight from "@/public/landing/student-daylight.jpg";
import { Reveal } from "@/components/motion/reveal";
import { marketingBenefitIcons } from "@/lib/config/marketing";
import { getDictionary } from "@/lib/i18n/server";
import { SectionHeading } from "./marketing-ui";
import { AssistantBubble, SummaryCard } from "./scene-cards";

/**
 * « Un assistant intelligent pour mieux apprendre » — six avantages en
 * grille d'icônes (pas une liste à puces) face à un portrait d'élève en
 * lumière du jour, qui entre par le côté et dont l'image glisse légèrement
 * dans son cadre au scroll (parallaxe native). Deux cartes d'interface
 * prolongent la scène, le mur clair de la photo leur laisse la place.
 */
export async function LandingWhy() {
  const dict = await getDictionary();
  const t = dict.marketing.why;

  return (
    <section className="relative isolate overflow-hidden bg-canvas pb-24 pt-24 sm:pb-28 sm:pt-28 lg:pb-32 lg:pt-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-40 top-10 size-[36rem] rounded-full bg-primary-100/80 blur-[130px] dark:bg-primary-200/25" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:px-8">
        <div>
          <SectionHeading
            before={t.heading}
            accent={t.headingAccent}
            after={t.headingSuffix}
            subtitle={t.subtitle}
          />

          <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2">
            {t.benefits.map((benefit, i) => {
              const Icon = marketingBenefitIcons[i];
              return (
                <li key={benefit.title}>
                  <Reveal delayMs={100 + i * 90} className="group flex gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-primary-600 shadow-[var(--shadow-card)] ring-1 ring-line transition-transform duration-500 ease-out group-hover:-translate-y-0.5 group-hover:rotate-[-4deg] motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:rotate-0">
                      <Icon className="size-5" strokeWidth={2} aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-[1rem] font-bold text-ink-900">{benefit.title}</h3>
                      <p className="mt-1 text-[0.92rem] leading-relaxed text-ink-500">{benefit.body}</p>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </div>

        <Reveal variant="right" className="relative mx-auto w-full max-w-[30rem] lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-[0_50px_90px_-40px_rgb(43_27_74/0.6)] ring-1 ring-black/5">
            <div className="parallax-y absolute -inset-y-[8%] inset-x-0" style={{ "--parallax-from": "-5%", "--parallax-to": "5%" } as React.CSSProperties}>
              <Image
                src={studentDaylight}
                alt={t.imageAlt}
                fill
                sizes="(min-width: 1024px) 40vw, 90vw"
                placeholder="blur"
                className="object-cover object-[50%_70%]"
              />
            </div>
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#2b1b4a]/25 via-transparent to-transparent" />
          </div>

          {/* Cartes d'interface posées dans la scène (mur clair en haut). */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <Reveal variant="scale" delayMs={350} className="absolute -left-4 top-[9%] sm:-left-10">
              <div className="animate-float-slow">
                <SummaryCard
                  label={t.cards.sheetLabel}
                  title={t.cards.sheetTitle}
                  meta={t.cards.sheetMeta}
                  className="w-[14rem]"
                />
              </div>
            </Reveal>
            <Reveal variant="scale" delayMs={550} className="absolute -right-3 bottom-[8%] sm:-right-8">
              <div className="animate-float-slow [animation-delay:-4s]">
                <AssistantBubble
                  label={t.cards.assistantLabel}
                  question={t.cards.assistantQuestion}
                  tone="light"
                />
              </div>
            </Reveal>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
