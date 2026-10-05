import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CirclePlay, Sparkles } from "lucide-react";
import heroNight from "@/public/landing/hero-night-study.jpg";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils/cn";
import { getDictionary } from "@/lib/i18n/server";
import { LANDING_HERO_END_SENTINEL } from "@/lib/config/marketing";
import { HeroScene } from "./hero-scene";
import { ctaArrowClass, ctaGhostDarkClass, ctaPrimaryClass } from "./marketing-ui";
import { AssistantBubble, CorrectionCard, ExamCard, SummaryCard } from "./scene-cards";

/** Couche de profondeur (souris) + flottement lent, autour d'une carte. */
function FloatingLayer({
  depth,
  floatDelay,
  className,
  children,
}: {
  depth: number;
  floatDelay: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("depth-layer", className)}
      style={{ "--depth": depth } as React.CSSProperties}
    >
      <div className="animate-float-slow" style={{ animationDelay: floatDelay }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Hero cinématographique — « nuit d'étude ».
 *
 * Trois plans : arrière-plan (photo générée pour EduIA, lumière violette,
 * profondeur de champ), plan moyen (l'élève), premier plan (cartes
 * d'interface EduIA en verre, en perspective, qui flottent et réagissent à la
 * souris). En quittant le hero, le texte remonte et s'estompe, la photo se
 * rapproche légèrement (animations liées au scroll, natives).
 *
 * Composition :
 *  - ordinateur (`lg`) : la photo occupe la droite de l'écran et se fond dans
 *    la nuit à gauche, où vit le texte (jamais de texte sur le visage) ;
 *  - mobile/tablette : photo en tête, recadrée sur l'élève, texte dessous.
 */
export async function LandingHero({ isAuthenticated }: { isAuthenticated: boolean }) {
  const dict = await getDictionary();
  const t = dict.marketing.hero;
  const cards = t.cards;

  return (
    <section
      id="accueil"
      className="hero-timeline relative isolate scroll-mt-20 overflow-hidden bg-[#0e0a1b] text-white lg:bg-scene-night"
    >
      {/* Repère observé par l'en-tête : sous lui, l'en-tête est sur fond clair. */}
      <span
        id={LANDING_HERO_END_SENTINEL}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[4.5rem] h-px"
      />

      <HeroScene className="relative flex flex-col lg:block lg:min-h-[max(46rem,100svh)]">
        {/* ── Photo (plan moyen + arrière-plan) ── */}
        <div
          className={cn(
            "relative h-[60svh] min-h-[24rem] max-h-[36rem] w-full",
            "lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:max-h-none lg:w-[60%] xl:w-[62%]",
          )}
        >
          {/* Calque photo : fondu vers la nuit à gauche (desktop). Les cartes
              vivent hors de ce calque pour ne pas être effacées par le masque. */}
          <div className="absolute inset-0 overflow-hidden lg:[mask-image:linear-gradient(to_right,transparent_0%,#000_34%)]">
            <div className="hero-photo-exit absolute inset-0">
              <div
                className="depth-layer absolute -inset-[3%]"
                style={{ "--depth": 10 } as React.CSSProperties}
              >
                <Image
                  src={heroNight}
                  alt={t.imageAlt}
                  fill
                  sizes="(min-width: 1280px) 62vw, (min-width: 1024px) 60vw, 100vw"
                  placeholder="blur"
                  loading="eager"
                  fetchPriority="high"
                  className="object-cover object-[66%_30%] lg:object-[80%_34%]"
                />
              </div>
            </div>

            {/* Lisibilité de l'en-tête (haut) et fondu vers le texte (bas, mobile). */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0e0a1b]/80 to-transparent"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent via-[#0e0a1b]/70 to-[#0e0a1b] lg:h-1/4 lg:via-transparent"
            />
          </div>

          {/* Cartes flottantes — mobile/tablette (deux, discrètes). */}
          <div aria-hidden className="pointer-events-none absolute inset-0 lg:hidden">
            <Reveal variant="scale" delayMs={500} className="absolute left-4 top-24 sm:left-8">
              <SummaryCard
                label={cards.summaryLabel}
                title={cards.summaryTitle}
                meta={cards.summaryMeta}
                className="w-[12.5rem] origin-top-left scale-[0.88] sm:scale-100"
              />
            </Reveal>
            <Reveal variant="scale" delayMs={700} className="absolute bottom-24 right-4 sm:right-8">
              <CorrectionCard
                label={cards.correctionLabel}
                score={cards.correctionScore}
                praise={cards.correctionPraise}
                className="w-[13rem] origin-bottom-right scale-[0.88] sm:scale-100"
              />
            </Reveal>
          </div>

          {/* Cartes flottantes — ordinateur : premier plan en perspective. */}
          <div
            aria-hidden
            className="hero-cards-exit pointer-events-none absolute inset-0 hidden lg:block"
          >
            <Reveal variant="scale" delayMs={650} className="absolute right-[5%] top-[17%]">
              <FloatingLayer depth={22} floatDelay="0s">
                <div className="[transform:perspective(1200px)_rotateY(-16deg)_rotateX(5deg)]">
                  <SummaryCard
                    label={cards.summaryLabel}
                    title={cards.summaryTitle}
                    meta={cards.summaryMeta}
                  />
                </div>
              </FloatingLayer>
            </Reveal>

            <Reveal variant="fade" delayMs={950} className="absolute right-[6%] top-[47%]">
              <FloatingLayer depth={14} floatDelay="-3s">
                <AssistantBubble label={cards.assistantLabel} question={cards.assistantQuestion} />
              </FloatingLayer>
            </Reveal>

            <Reveal variant="scale" delayMs={800} className="absolute bottom-[13%] right-[18%]">
              <FloatingLayer depth={32} floatDelay="-1.5s">
                <div className="[transform:perspective(1200px)_rotateY(-12deg)_rotateX(7deg)]">
                  <CorrectionCard
                    label={cards.correctionLabel}
                    score={cards.correctionScore}
                    praise={cards.correctionPraise}
                  />
                </div>
              </FloatingLayer>
            </Reveal>

            <Reveal
              variant="scale"
              delayMs={1100}
              className="absolute bottom-[25%] left-[25%] hidden xl:block"
            >
              <FloatingLayer depth={40} floatDelay="-5s">
                <div className="[transform:perspective(1200px)_rotateY(12deg)_rotateX(6deg)]">
                  <ExamCard label={cards.examLabel} title={cards.examTitle} meta={cards.examMeta} />
                </div>
              </FloatingLayer>
            </Reveal>
          </div>
        </div>

        {/* Lumière violette diffuse derrière le texte (profondeur, desktop). */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-1/4 hidden size-[38rem] rounded-full bg-[#5a3796]/25 blur-[130px] lg:block"
        />

        {/* ── Texte ── */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:flex lg:min-h-[max(46rem,100svh)] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
          <div className="hero-copy-exit -mt-24 max-w-[36rem] sm:-mt-28 lg:mt-0 lg:max-w-[min(42rem,50%)]">
            <Reveal variant="fade" delayMs={100}>
              <span className="glass-dark inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.8rem] font-medium text-white/85">
                <Sparkles className="size-3.5 text-[#cbb6f3]" aria-hidden />
                {t.badge}
              </span>
            </Reveal>

            <Reveal variant="fade">
              <h1 className="mt-6 font-display text-[2.55rem] font-medium leading-[1.04] tracking-[-0.02em] text-white sm:text-[3.3rem] lg:text-[3.2rem] xl:text-[3.6rem] 2xl:text-[3.85rem]">
                <span className="line-reveal">
                  <span style={{ "--line-delay": "120ms" } as React.CSSProperties}>
                    {t.titleLine1}
                  </span>
                </span>{" "}
                <span className="line-reveal">
                  <span style={{ "--line-delay": "260ms" } as React.CSSProperties}>
                    {t.titleLine2}
                    <span className="italic text-[#cbb6f3]">{t.titleAccent}</span>
                  </span>
                </span>
              </h1>
            </Reveal>

            <Reveal delayMs={420}>
              <p className="mt-6 max-w-[33rem] text-[1.05rem] leading-relaxed text-white/72">
                {t.subtitle}
              </p>
            </Reveal>

            <Reveal delayMs={560}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href={isAuthenticated ? "/dashboard" : "/signup"} className={ctaPrimaryClass}>
                  {isAuthenticated ? dict.marketing.header.dashboardCta : t.ctaPrimary}
                  <ArrowRight className={ctaArrowClass} aria-hidden />
                </Link>
                <a href="#demo" className={ctaGhostDarkClass}>
                  <CirclePlay className="size-[1.15rem] text-[#cbb6f3]" aria-hidden />
                  {t.ctaSecondary}
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </HeroScene>

      {/* Fondu vers la section suivante (la bande d'indicateurs chevauche ce bord). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-canvas"
      />
    </section>
  );
}
