import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CirclePlay, Star } from "lucide-react";
import heroStudents from "@/public/illustrations/hero-student.jpg";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { getDictionary } from "@/lib/i18n/server";
import { HeroTypewriter } from "./hero-typewriter";
import { HeroSpotlight } from "./hero-spotlight";

export async function LandingHero() {
  const dict = await getDictionary();
  const t = dict.marketing.hero;

  return (
    <section
      id="accueil"
      className="relative isolate scroll-mt-20 overflow-hidden"
    >
      {/* Fond du hero : bande navy cinématographique, volontairement sombre
          quel que soit le thème clair/sombre du site (comme un hero
          photo/vidéo avec overlay) — le texte et les surfaces de cette
          section utilisent donc des teintes fixes claires, pas les tokens
          réactifs au thème. */}
      <div aria-hidden className="absolute inset-0 -z-20 bg-hero-gradient" />
      {/* Halo d'ambiance derrière l'illustration (desktop) — lumière diffuse,
          aucun bord ni rectangle. */}
      <div
        aria-hidden
        className="absolute -right-32 top-4 -z-10 hidden size-[42rem] rounded-full bg-primary-400/25 blur-[120px] lg:block"
      />
      {/* Raccord doux vers la section suivante (bg-canvas) — pas de ligne nette. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-canvas"
      />

      <HeroSpotlight className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:px-8 lg:py-28">
        <div className="relative z-[1]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-fine font-semibold text-white shadow-sm ring-1 ring-white/20 backdrop-blur-sm">
            <Star className="size-3.5 fill-current text-accent-400" aria-hidden />
            {t.badge}
          </span>

          <h1
            aria-label={t.titleAria}
            className="mt-5 font-display font-medium tracking-[-0.01em] text-white text-display-md sm:text-display-lg lg:text-display-xl"
          >
            <HeroTypewriter
              lines={[
                { text: t.titleLine1 },
                {
                  text: t.titleLine2,
                  className: "italic text-accent-400",
                },
              ]}
            />
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70">
            {t.subtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className={buttonVariants({ variant: "accent", size: "lg" })}
            >
              {t.ctaPrimary}
              <ArrowRight className="size-[1.15rem]" aria-hidden />
            </Link>
            <a
              href="#comment-ca-marche"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "gap-2.5 border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15 hover:text-white",
              )}
            >
              <CirclePlay className="size-[1.2rem] text-white" aria-hidden />
              {t.ctaSecondary}
            </a>
          </div>
        </div>

        {/* La photo (fond clair) est posée dans une carte `surface` — la scène
            est désormais toujours sombre, donc ce traitement en « îlot clair »
            s'applique dans les deux thèmes (plus de fondu de masque, qui ne
            fonctionnait que quand le fond de section était clair lui aussi).
            Léger voile navy en overlay (mix-blend-mode) pour rapprocher les
            teintes de la photo (violet/lavande d'origine) de la nouvelle
            identité, sans regénérer l'image. */}
        <div className="relative z-[1] overflow-hidden rounded-[1.75rem] bg-surface p-3 shadow-[var(--shadow-elevated)] ring-1 ring-white/10">
          <div className="relative overflow-hidden rounded-[1.15rem]">
            <Image
              src={heroStudents}
              alt={t.imageAlt}
              priority
              placeholder="blur"
              sizes="(min-width: 1024px) 40rem, 92vw"
              className="h-auto w-full"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-primary-700/25 via-transparent to-accent-500/10 mix-blend-multiply"
            />
          </div>
        </div>
      </HeroSpotlight>
    </section>
  );
}
