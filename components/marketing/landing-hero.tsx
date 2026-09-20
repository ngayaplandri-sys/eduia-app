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
      {/* Fond du hero : même dégradé lavande que le bloc hero du dashboard et
          l'encart CTA → l'illustration partage exactement le fond de la page. */}
      <div aria-hidden className="absolute inset-0 -z-20 bg-hero-gradient" />
      {/* Halo d'ambiance derrière l'illustration (desktop) — lumière diffuse,
          aucun bord ni rectangle. */}
      <div
        aria-hidden
        className="absolute -right-32 top-4 -z-10 hidden size-[42rem] rounded-full bg-primary-200/45 blur-[120px] lg:block"
      />
      {/* Raccord doux vers la section suivante (bg-canvas) — pas de ligne nette. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-canvas"
      />

      <HeroSpotlight className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:px-8 lg:py-28">
        <div className="relative z-[1]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/75 px-3 py-1 text-fine font-semibold text-primary-700 shadow-sm ring-1 ring-primary-100 backdrop-blur-sm">
            <Star className="size-3.5 fill-current" aria-hidden />
            {t.badge}
          </span>

          <h1
            aria-label={t.titleAria}
            className="mt-5 font-display font-medium tracking-[-0.01em] text-ink-900 text-display-md sm:text-display-lg lg:text-display-xl"
          >
            <HeroTypewriter
              lines={[
                { text: t.titleLine1 },
                {
                  text: t.titleLine2,
                  className: "italic text-primary-600",
                },
              ]}
            />
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-500">
            {t.subtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              {t.ctaPrimary}
              <ArrowRight className="size-[1.15rem]" aria-hidden />
            </Link>
            <a
              href="#comment-ca-marche"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "gap-2.5 bg-surface/60 backdrop-blur-sm",
              )}
            >
              <CirclePlay className="size-[1.2rem] text-primary-600" aria-hidden />
              {t.ctaSecondary}
            </a>
          </div>
        </div>

        {/* Clair : l'illustration n'a plus de cadre — son fond lavande se confond
            avec celui de la section, les 4 bords sont fondus au masque.
            Sombre : le visuel (fond clair) est posé dans une carte `surface`
            discrète pour rester lisible sans « bloc collé ». */}
        <div className="relative z-[1] dark:rounded-[1.75rem] dark:bg-surface dark:p-3 dark:shadow-card dark:ring-1 dark:ring-line">
          <div
            aria-hidden
            className="absolute inset-6 -z-10 rounded-[3rem] bg-primary-100/50 blur-3xl dark:hidden"
          />
          <Image
            src={heroStudents}
            alt={t.imageAlt}
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 40rem, 92vw"
            className={cn(
              "h-auto w-full",
              // Fond de l'image ≈ fond de la section (en clair) → un fondu léger
              // des bords suffit à effacer le rectangle du JPG sans rogner le
              // sujet ni les icônes flottantes.
              "[mask-image:linear-gradient(to_right,transparent_0,#000_5%,#000_95%,transparent_100%),linear-gradient(to_bottom,transparent_0,#000_4%,#000_96%,transparent_100%)]",
              "[mask-composite:intersect] [-webkit-mask-composite:source-in]",
              "[filter:drop-shadow(0_24px_48px_rgb(76_29_149/0.14))]",
              // En sombre : pas de fondu (il révélerait le fond noir), coins
              // arrondis suivant la carte.
              "dark:rounded-[1.15rem] dark:[filter:none] dark:[mask-image:none]",
            )}
          />
        </div>
      </HeroSpotlight>
    </section>
  );
}
