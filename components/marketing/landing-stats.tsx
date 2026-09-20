import { Reveal } from "@/components/motion/reveal";
import { marketingStatIcons } from "@/lib/config/marketing";
import { getDictionary } from "@/lib/i18n/server";

export async function LandingStats() {
  const dict = await getDictionary();
  const stats = dict.marketing.stats.map((stat, i) => ({
    ...stat,
    icon: marketingStatIcons[i],
  }));

  return (
    <section className="bg-canvas pb-20 sm:pb-24 lg:pb-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="rounded-3xl border border-primary-100/70 bg-primary-50 px-6 py-9 sm:px-10 sm:py-11">
          <dl className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-start gap-3.5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface text-primary-600 shadow-card">
                    <Icon className="size-[1.35rem]" strokeWidth={2} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <dd className="text-2xl font-extrabold tracking-[-0.02em] text-ink-900">
                      {stat.value}
                    </dd>
                    <dt className="mt-1 text-fine leading-snug text-ink-500">
                      {stat.label}
                    </dt>
                  </div>
                </div>
              );
            })}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
