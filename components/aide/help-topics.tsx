import { ChevronRight, CircleHelp, Mail, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { getDictionary } from "@/lib/i18n/server";
import { ReportProblemDialog } from "./report-problem-dialog";

type Tone = "primary" | "info" | "success" | "warning";

const TONE_CLASSES: Record<Tone, string> = {
  primary: "bg-primary-100 text-primary-600",
  info: "bg-info-100 text-info-600",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
};

interface Topic {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  description: string;
  href: string;
  external?: boolean;
}

export async function HelpTopics() {
  const dict = await getDictionary();
  const t = dict.aide;

  const topics: Topic[] = [
    {
      icon: CircleHelp,
      tone: "primary",
      title: t.topicFaqTitle,
      description: t.topicFaqDesc,
      href: "#faq",
    },
    {
      icon: Mail,
      tone: "info",
      title: t.topicContactTitle,
      description: t.topicContactDesc,
      href: "#contact",
    },
  ];

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-title-sm font-bold text-ink-900">
        {t.topicsTitle}
      </h2>
      <p className="mt-0.5 text-sm text-ink-500">{t.topicsSubtitle}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => {
          const Icon = topic.icon;
          return (
            <a
              key={topic.title}
              href={topic.href}
              {...(topic.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="hover-lift group flex items-start gap-3 rounded-xl border border-line-soft bg-surface p-4 hover:border-line hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  TONE_CLASSES[topic.tone],
                )}
              >
                <Icon className="size-[1.15rem]" strokeWidth={2} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink-900">
                  {topic.title}
                </span>
                <span className="mt-0.5 block text-fine leading-snug text-ink-500">
                  {topic.description}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 self-center text-ink-400 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </a>
          );
        })}

        <ReportProblemDialog />
      </div>
    </Card>
  );
}
