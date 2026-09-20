import { ArrowRight, Lightbulb } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { getDictionary } from "@/lib/i18n/server";

export async function FaqTipBanner() {
  const dict = await getDictionary();
  const t = dict.aide;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-primary-100/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-start gap-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
          <Lightbulb className="size-[1.15rem]" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-ink-900">{t.tipTitle}</p>
          <p className="mt-0.5 text-fine text-ink-500">{t.tipBody}</p>
        </div>
      </div>

      <a
        href="#faq"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "shrink-0 self-start sm:self-auto",
        )}
      >
        {t.tipCta}
        <ArrowRight className="size-4" aria-hidden />
      </a>
    </div>
  );
}
