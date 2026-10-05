import { Reveal } from "@/components/motion/reveal";
import { getDictionary } from "@/lib/i18n/server";
import { marketingDemoVideo } from "@/lib/config/marketing";
import { SectionHeading } from "./marketing-ui";
import { VideoShowcase } from "./video-showcase";

/**
 * Démonstration — la vidéo existante d'EduIA, mise en scène comme un écran
 * haut de gamme : cadre d'appareil sombre, halo violet, reflet au sol. En
 * entrant dans le viewport, l'écran se redresse (légère perspective → face
 * caméra, animation liée au scroll quand le navigateur la gère).
 */
export async function LandingDemo() {
  const dict = await getDictionary();
  const t = dict.marketing.demo;

  return (
    <section
      id="demo"
      className="relative isolate scroll-mt-20 overflow-hidden bg-surface pb-24 pt-24 sm:pb-32 sm:pt-28"
    >
      {/* Halo violet derrière l'écran + fondu depuis la section précédente. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-canvas to-transparent" />
        <div className="absolute left-1/2 top-[42%] h-[34rem] w-[70rem] max-w-[120%] -translate-x-1/2 rounded-[50%] bg-primary-300/35 blur-[140px] dark:bg-primary-300/20" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading before={t.heading} accent={t.headingAccent} subtitle={t.subtitle} align="center" />

        <Reveal variant="media" className="mt-12 sm:mt-16">
          <div className="screen-rise mx-auto max-w-5xl">
            {/* Cadre d'écran : bord métallique fin + biseau lumineux. */}
            <div className="rounded-[1.5rem] bg-[linear-gradient(160deg,#3b3550_0%,#16121f_45%,#0b0814_100%)] p-[0.45rem] shadow-[0_50px_100px_-40px_rgb(43_27_74/0.75),0_24px_48px_-28px_rgb(105_63_168/0.55)] ring-1 ring-white/10 sm:rounded-[1.8rem] sm:p-2.5">
              <VideoShowcase
                src={marketingDemoVideo.src}
                poster={marketingDemoVideo.poster}
                durationLabel={marketingDemoVideo.durationLabel}
                playLabel={t.play}
                ariaLabel={t.video.aria}
                fallback={t.video.fallback}
              />
            </div>
            {/* Reflet au sol, très discret. */}
            <div
              aria-hidden
              className="mx-auto mt-3 h-8 w-[86%] rounded-[50%] bg-primary-700/20 blur-2xl dark:bg-black/50"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
