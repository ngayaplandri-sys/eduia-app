import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { firstName } from "@/lib/utils/format";
import { getDictionary } from "@/lib/i18n/server";
import { HeroIllustration } from "./hero-illustration";

export async function HeroBanner({ userName }: { userName: string }) {
  const dict = await getDictionary();
  const t = dict.dashboard;

  return (
    <section className="overflow-hidden rounded-3xl bg-scene-dashboard p-6 shadow-[var(--shadow-elevated)] sm:p-8 lg:p-10">
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_1.05fr] lg:gap-8">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/70 px-3 py-1 text-fine font-semibold text-primary-700 shadow-sm ring-1 ring-line">
            {t.welcome(firstName(userName))} <span aria-hidden>👋</span>
          </span>

          <h2 className="mt-4 font-display font-medium tracking-[-0.01em] text-ink-900 text-display-sm sm:text-display-md lg:text-display-xl">
            {t.heroTitleBefore}
            <span className="italic text-primary-600">{t.heroTitleAccent}</span>
          </h2>

          <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-ink-500">
            {t.heroBody}
          </p>

          <Link
            href="/resumer"
            className={cn(
              buttonVariants({ variant: "primary", size: "lg" }),
              "mt-6",
            )}
          >
            {t.heroCta}
            <ArrowRight className="size-[1.15rem]" aria-hidden />
          </Link>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}
