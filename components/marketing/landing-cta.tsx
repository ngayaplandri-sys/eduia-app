import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { TiltSurface } from "@/components/motion/tilt-surface";
import { PLAN_CREDITS } from "@/lib/config/credits";
import { getDictionary } from "@/lib/i18n/server";
import { ctaArrowClass, ctaGhostDarkClass, ctaLightClass } from "./marketing-ui";
import { LaptopMockup } from "./laptop-mockup";
import { MiniDashboard } from "./mini-dashboard";
import { ScaledScreen } from "./scaled-screen";

/**
 * Appel final — retour à la scène violette profonde du hero (et du volet de
 * marque des pages connexion/inscription : même fond `bg-scene-auth`, la page
 * d'inscription prolonge directement ce bandeau). À droite, un ordinateur
 * portable montre le vrai tableau de bord d'EduIA ; des halos de lumière
 * dérivent lentement derrière lui.
 */
export async function LandingCta({ isAuthenticated }: { isAuthenticated: boolean }) {
  const dict = await getDictionary();
  const t = dict.marketing.cta;

  return (
    <section className="relative bg-surface px-4 pb-24 sm:px-6 sm:pb-28 lg:px-8">
      <Reveal variant="media" className="mx-auto max-w-7xl">
        <div className="relative isolate overflow-hidden rounded-[2.2rem] bg-scene-auth px-6 py-14 shadow-[var(--shadow-elevated)] sm:px-12 sm:py-16 lg:px-16 lg:py-20">
          {/* Halos lumineux en dérive lente. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="animate-halo-drift absolute -right-24 -top-24 size-[30rem] rounded-full bg-[#9a76cf]/35 blur-[110px]" />
            <div className="animate-halo-drift absolute -bottom-32 left-1/4 size-[26rem] rounded-full bg-[#5a3796]/45 blur-[110px] [animation-delay:-9s]" />
          </div>

          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
            <div>
              <Reveal>
                <h2 className="font-display text-[2.3rem] font-medium leading-[1.06] tracking-[-0.015em] text-white sm:text-[2.9rem] lg:text-[3.2rem]">
                  {t.heading}{" "}
                  <span className="italic text-[#cbb6f3]">{t.headingAccent}</span>
                  {t.headingSuffix}
                </h2>
              </Reveal>
              <Reveal delayMs={120}>
                <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-white/72">
                  {t.subtitle(PLAN_CREDITS.free.signupGrant)}
                </p>
              </Reveal>
              <Reveal delayMs={240}>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link href={isAuthenticated ? "/dashboard" : "/signup"} className={ctaLightClass}>
                    {isAuthenticated ? dict.marketing.header.dashboardCta : t.button}
                    <ArrowRight className={ctaArrowClass} aria-hidden />
                  </Link>
                  <a href="#tarifs" className={ctaGhostDarkClass}>
                    {t.secondary}
                  </a>
                </div>
                <p className="mt-5 text-fine font-medium text-white/60">{t.reassurance}</p>
              </Reveal>
            </div>

            <Reveal variant="right" delayMs={200}>
              <div>
                <TiltSurface maxTilt={3} className="rounded-[1.2rem]">
                  <div className="[transform:perspective(1800px)_rotateY(-12deg)_rotateX(5deg)] lg:[transform:perspective(1800px)_rotateY(-16deg)_rotateX(6deg)]">
                    <LaptopMockup ariaLabel={t.laptopAria}>
                      <ScaledScreen baseWidth={1280} baseHeight={800}>
                        <MiniDashboard dict={dict} name={t.sampleName} />
                      </ScaledScreen>
                    </LaptopMockup>
                  </div>
                </TiltSurface>
              </div>
            </Reveal>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
