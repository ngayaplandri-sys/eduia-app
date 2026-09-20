import { ArrowUpRight, Clock, Mail, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { supportConfig } from "@/lib/config/support";
import { getDictionary } from "@/lib/i18n/server";
import { ContactEmailButton } from "./contact-email-button";

export async function ContactMethods() {
  const dict = await getDictionary();
  const t = dict.aide;
  const whatsappUrl = `https://wa.me/${supportConfig.whatsappNumber}?text=${encodeURIComponent(
    t.prefilledMessage,
  )}`;

  return (
    <Card id="contact" className="scroll-mt-24 p-5 sm:p-6">
      <h2 className="text-title-sm font-bold text-ink-900">
        {t.contactTitle}
      </h2>
      <p className="mt-0.5 text-sm text-ink-500">{t.responseTime}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="flex flex-col rounded-xl border border-line-soft p-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-success-100 text-success-700">
            <MessageCircle className="size-[1.15rem]" aria-hidden />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-ink-900">
            {t.contactWhatsapp}
          </h3>
          <p className="mt-1 flex-1 text-fine leading-snug text-ink-500">
            {t.contactWhatsappDesc}
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "success", size: "sm" }),
              "mt-4 self-start",
            )}
          >
            {t.contactWhatsappCta}
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </div>

        <div className="flex flex-col rounded-xl border border-line-soft p-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-info-100 text-info-600">
            <Mail className="size-[1.15rem]" aria-hidden />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-ink-900">
            {t.contactEmail}
          </h3>
          <p className="mt-1 flex-1 text-fine leading-snug text-ink-500">
            {t.contactEmailDesc}
          </p>
          <ContactEmailButton
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-4 self-start",
            )}
          />
        </div>

        <div className="flex flex-col rounded-xl border border-line-soft p-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
            <Clock className="size-[1.15rem]" aria-hidden />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-ink-900">
            {t.contactHoursTitle}
          </h3>
          <p className="mt-1 flex-1 text-fine leading-snug text-ink-500">
            {t.supportDays}
            <br />
            {t.supportHours}
          </p>
          <span className="mt-4 inline-flex w-fit items-center rounded-full bg-info-50 px-2.5 py-1 text-[0.6875rem] font-semibold text-info-700">
            {t.timezoneLabel}
          </span>
        </div>
      </div>
    </Card>
  );
}
