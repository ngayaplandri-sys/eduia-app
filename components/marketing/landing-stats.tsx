import { Reveal } from "@/components/motion/reveal";
import { CountUp } from "@/components/motion/count-up";
import { marketingStatIcons } from "@/lib/config/marketing";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Bande d'indicateurs à cheval sur le bas du hero : premier contact avec la
 * partie claire de la page. Valeurs qualitatives du dictionnaire (aucun
 * chiffre inventé), qui « comptent » à leur apparition.
 */
export async function LandingStats() {
  const dict = await getDictionary();
  const t = dict.marketing;
  const stats = t.stats.map((stat, i) => ({ ...stat, icon: marketingStatIcons[i] }));

  return (
    <section aria-label={t.statsLabel} className="relative z-10 -mt-14 px-4 sm:-mt-16 sm:px-6 lg:px-8">
      <Reveal variant="up" className="mx-auto max-w-6xl">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 rounded-[1.6rem] bg-surface/90 px-5 py-6 shadow-[var(--shadow-elevated)] ring-1 ring-line backdrop-blur-xl sm:px-8 sm:py-7 lg:grid-cols-4 lg:gap-x-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <li
                key={stat.label}
                className="lg:border-l lg:border-line-soft lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
              >
                <Reveal
                  variant="up"
                  delayMs={150 + i * 110}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100">
                    <Icon className="size-5" strokeWidth={2} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-[1.9rem] font-medium leading-none tracking-[-0.01em] text-ink-900 tabular-nums">
                      <CountUp value={stat.value} />
                    </p>
                    <p className="mt-1.5 text-fine leading-snug text-ink-500">{stat.label}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </Reveal>
    </section>
  );
}
