import { Bot, Clock3, FileText, FolderOpen, History } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { TiltSurface } from "@/components/motion/tilt-surface";
import { cn } from "@/lib/utils/cn";
import { marketingJourneyIcons, type MarketingTone } from "@/lib/config/marketing";
import { getDictionary } from "@/lib/i18n/server";
import { SectionHeading } from "./marketing-ui";
import { FeatureJourney, type JourneyStep } from "./feature-journey";
import {
  CoursePreview,
  CorrectionPreview,
  ExamPreview,
  ProgressPreview,
  SummaryPreview,
} from "./feature-previews";

const TONE_PILL: Record<MarketingTone, string> = {
  primary: "bg-primary-100 text-primary-700",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  info: "bg-info-100 text-info-700",
  danger: "bg-danger-100 text-danger-600",
};

/**
 * Fonctionnalités, racontées comme un parcours : Cours → Résumé → Épreuve →
 * Correction → Progression (aperçus des vrais écrans d'EduIA), puis les
 * outils qui accompagnent ce parcours (Assistant IA, Documents, Historique)
 * dans une grille asymétrique à trois cases.
 */
export async function LandingFeatures() {
  const dict = await getDictionary();
  const t = dict.marketing.features;

  const previews = [
    <CoursePreview key="course" t={t.previews.course} />,
    <SummaryPreview key="summary" t={t.previews.summary} />,
    <ExamPreview key="exam" t={t.previews.exam} />,
    <CorrectionPreview key="correction" t={t.previews.correction} />,
    <ProgressPreview key="progress" t={t.previews.progress} />,
  ];

  const steps: JourneyStep[] = t.steps.map((step, i) => {
    const { icon: Icon, tone } = marketingJourneyIcons[i];
    return {
      ...step,
      icon: <Icon className="size-[1.15rem]" strokeWidth={2} aria-hidden />,
      iconClassName: TONE_PILL[tone],
      preview: previews[i],
    };
  });

  const [assistant, documents, history] = t.extras;
  const x = t.extrasPreview;

  return (
    <section
      id="fonctionnalites"
      className="relative isolate scroll-mt-20 bg-canvas pb-24 pt-24 sm:pb-28 sm:pt-28 lg:pb-32 lg:pt-32"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-surface to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading before={t.heading} accent={t.headingAccent} subtitle={t.subtitle} />

        <div className="mt-14 lg:mt-8">
          <FeatureJourney steps={steps} label={t.stepsLabel} />
        </div>

        {/* ── Outils qui accompagnent le parcours ── */}
        <div className="mt-24 lg:mt-28">
          <Reveal>
            <h3 className="font-display text-[1.7rem] font-medium tracking-[-0.01em] text-ink-900 sm:text-[2rem]">
              {t.extrasHeading}
            </h3>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:grid-rows-2">
            {/* Assistant IA : grande case, fond violet profond. */}
            <Reveal variant="media" className="lg:col-span-7 lg:row-span-2">
              <TiltSurface
                maxTilt={2.5}
                className="flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-scene-auth p-7 text-white shadow-[var(--shadow-elevated)] sm:p-9"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20">
                  <Bot className="size-5" aria-hidden />
                </span>
                <h4 className="mt-5 text-[1.35rem] font-bold">{assistant.title}</h4>
                <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-white/75">{assistant.body}</p>

                <div className="mt-8 flex flex-1 flex-col justify-end gap-3" aria-hidden>
                  <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-white px-4 py-3 text-sm font-medium text-[#1b1f2a] shadow-lg">
                    {x.assistantQuestion}
                  </div>
                  <div className="flex max-w-[88%] items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#7c4fbe] ring-2 ring-white/20">
                      <Bot className="size-4" />
                    </span>
                    <div className="glass-dark rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed text-white/90">
                      {x.assistantAnswer}
                    </div>
                  </div>
                </div>
              </TiltSurface>
            </Reveal>

            {/* Documents. */}
            <Reveal variant="media" delayMs={120} className="lg:col-span-5">
              <TiltSurface
                maxTilt={3}
                className="h-full rounded-[1.75rem] bg-surface p-7 shadow-[var(--shadow-card)] ring-1 ring-line"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="flex size-10 items-center justify-center rounded-xl bg-info-50 text-info-600">
                      <FolderOpen className="size-5" aria-hidden />
                    </span>
                    <h4 className="mt-4 text-[1.12rem] font-bold text-ink-900">{documents.title}</h4>
                    <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink-500">{documents.body}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary-100 px-3 py-1 text-fine font-semibold text-primary-700">
                    {x.documentsFilter}
                  </span>
                </div>
                <ul className="mt-5 space-y-2" aria-hidden>
                  {x.documents.map((file) => (
                    <li key={file} className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2.5">
                      <FileText className="size-4 shrink-0 text-ink-400" />
                      <span className="truncate text-fine font-medium text-ink-700">{file}</span>
                    </li>
                  ))}
                </ul>
              </TiltSurface>
            </Reveal>

            {/* Historique. */}
            <Reveal variant="media" delayMs={220} className="lg:col-span-5">
              <TiltSurface
                maxTilt={3}
                className="h-full rounded-[1.75rem] bg-[linear-gradient(160deg,var(--color-primary-50),var(--color-surface))] p-7 shadow-[var(--shadow-card)] ring-1 ring-primary-100"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                  <History className="size-5" aria-hidden />
                </span>
                <h4 className="mt-4 text-[1.12rem] font-bold text-ink-900">{history.title}</h4>
                <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink-500">{history.body}</p>
                <ol className="mt-5 space-y-3" aria-hidden>
                  {x.history.map((item, i) => (
                    <li key={item.label} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-full ring-4",
                          i === 0 ? "bg-primary-600 ring-primary-100" : "bg-primary-300 ring-transparent",
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate text-fine font-medium text-ink-800">{item.label}</span>
                      <span className="flex items-center gap-1 text-[0.72rem] text-ink-400">
                        <Clock3 className="size-3" />
                        {item.time}
                      </span>
                    </li>
                  ))}
                </ol>
              </TiltSurface>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
