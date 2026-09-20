import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { getDictionary } from "@/lib/i18n/server";

export async function LandingCta() {
  const dict = await getDictionary();
  const t = dict.marketing.cta;

  return (
    <section className="bg-surface pb-20 sm:pb-24 lg:pb-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Même bande navy cinématographique que le hero (`bg-hero-gradient`,
            toujours sombre) — texte/icône en teintes fixes claires, pas de
            tokens réactifs au thème. */}
        <Reveal className="overflow-hidden rounded-3xl bg-hero-gradient px-6 py-10 shadow-[var(--shadow-elevated)] sm:px-10 sm:py-12">
          <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:justify-between lg:text-left">
            <div className="flex flex-col items-center gap-4 lg:flex-row lg:gap-5">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent-400/20 text-accent-400 ring-1 ring-accent-300/40">
                <Trophy className="size-7" aria-hidden />
              </span>
              <div>
                <h2 className="text-[1.5rem] font-extrabold tracking-[-0.02em] text-white sm:text-[1.75rem]">
                  {t.heading}
                </h2>
                <p className="mt-1.5 max-w-lg text-[0.95rem] text-white/70">
                  {t.subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <Link
                href="/signup"
                className={buttonVariants({ variant: "accent", size: "lg" })}
              >
                {t.button}
                <ArrowRight className="size-[1.15rem]" aria-hidden />
              </Link>
              <p className="text-fine font-medium text-white/60">
                {t.reassurance}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
