import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n/server";

export async function FaqSection() {
  const dict = await getDictionary();
  const t = dict.aide;
  const items = [t.faq.import, t.faq.summarize, t.faq.generate, t.faq.grade, t.faq.account];

  return (
    <Card id="faq" className="scroll-mt-24 p-5 sm:p-6">
      <h2 className="text-title-sm font-bold text-ink-900">{t.faqTitle}</h2>
      <p className="mt-0.5 text-sm text-ink-500">{t.faqSubtitle}</p>

      <div className="mt-4 space-y-1">
        {items.map((item) => (
          <details
            key={item.q}
            className="group rounded-lg px-3.5 py-3 transition-colors open:bg-primary-50/40 hover:bg-canvas"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
              {item.q}
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-400 transition-[transform,background-color,color] duration-200 group-open:rotate-180 group-open:bg-primary-100 group-open:text-primary-600">
                <ChevronDown className="size-3.5" aria-hidden />
              </span>
            </summary>
            <p className="mt-2 pr-8 text-sm leading-relaxed text-ink-500">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </Card>
  );
}
