import type { Metadata } from "next";
import { HelpTopics } from "@/components/aide/help-topics";
import { ContactMethods } from "@/components/aide/contact-methods";
import { FaqTipBanner } from "@/components/aide/faq-tip-banner";
import { FaqSection } from "@/components/aide/faq-section";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.aide.metaTitle,
    description: dict.aide.metaDescription,
  };
}

export default async function AidePage() {
  const dict = await getDictionary();

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">{dict.aide.pageIntro}</p>

      <HelpTopics />
      <ContactMethods />
      <FaqTipBanner />
      <FaqSection />
    </div>
  );
}
