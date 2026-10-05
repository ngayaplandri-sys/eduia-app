import { Reveal } from "@/components/motion/reveal";
import { TiltSurface } from "@/components/motion/tilt-surface";
import { cn } from "@/lib/utils/cn";
import { marketingSubjects, type MarketingTone } from "@/lib/config/marketing";
import { getDictionary } from "@/lib/i18n/server";
import { SectionHeading } from "./marketing-ui";

const TONE: Record<MarketingTone, { tile: string; icon: string }> = {
  primary: { tile: "hover:ring-primary-200", icon: "bg-primary-100 text-primary-600" },
  success: { tile: "hover:ring-success-200", icon: "bg-success-100 text-success-700" },
  warning: { tile: "hover:ring-warning-200", icon: "bg-warning-100 text-warning-700" },
  info: { tile: "hover:ring-info-200", icon: "bg-info-100 text-info-600" },
  danger: { tile: "hover:ring-danger-100", icon: "bg-danger-100 text-danger-600" },
};

/**
 * Matières — mosaïque asymétrique de 10 tuiles (4 colonnes sur ordinateur :
 * Mathématiques et « toutes les autres » occupent deux colonnes). EduIA ne se
 * limite à aucune liste : matière et niveau sont saisis librement dans les
 * outils, la dernière tuile le rappelle.
 */
export async function LandingSubjects() {
  const dict = await getDictionary();
  const t = dict.marketing.subjects;
  const last = t.items.length - 1;

  return (
    <section className="relative isolate overflow-hidden bg-surface pb-24 pt-24 sm:pb-28 sm:pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading before={t.heading} accent={t.headingAccent} subtitle={t.subtitle} />

        <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {t.items.map((item, i) => {
            const { icon: Icon, tone } = marketingSubjects[i];
            const wide = i === 0 || i === last;
            return (
              <li key={item.name} className={cn(wide && "col-span-2")}>
                <Reveal variant="up" delayMs={(i % 4) * 90 + Math.floor(i / 4) * 60} className="h-full">
                  <TiltSurface
                    maxTilt={3}
                    className={cn(
                      "group flex h-full min-h-[8.5rem] flex-col justify-between overflow-hidden rounded-[1.4rem] p-5 ring-1 transition-[box-shadow,background-color] duration-500 sm:p-6",
                      i === last
                        ? "bg-scene-auth text-white ring-white/10"
                        : cn("bg-canvas ring-line hover:shadow-[var(--shadow-card-hover)]", TONE[tone].tile),
                    )}
                  >
                    {/* Motif typographique discret sur la grande tuile Mathématiques. */}
                    {i === 0 ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -bottom-3 right-4 font-display text-[4.5rem] italic leading-none text-primary-200/70 transition-transform duration-700 ease-out group-hover:-translate-y-1 sm:text-[5.5rem] dark:text-primary-300/40"
                      >
                        f(x) = ax + b
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "relative flex size-11 items-center justify-center rounded-xl transition-transform duration-500 ease-out group-hover:-rotate-6 group-hover:scale-110 motion-reduce:group-hover:rotate-0 motion-reduce:group-hover:scale-100",
                        i === last ? "bg-white/15 text-white ring-1 ring-white/20" : TONE[tone].icon,
                      )}
                    >
                      <Icon className="size-5" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="relative mt-6 block">
                      <span className={cn("block text-[1.02rem] font-bold", i === last ? "text-white" : "text-ink-900")}>
                        {item.name}
                      </span>
                      <span className={cn("mt-1 block text-fine leading-snug", i === last ? "text-white/70" : "text-ink-500")}>
                        {item.topics}
                      </span>
                    </span>
                  </TiltSurface>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
