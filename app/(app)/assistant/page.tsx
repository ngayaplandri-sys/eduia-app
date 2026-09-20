import type { Metadata } from "next";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { AssistantWorkspace } from "@/components/assistant/assistant-workspace";
import { getDictionary } from "@/lib/i18n/server";
import { getAssistantConversation } from "@/lib/data/assistant-conversation";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.assistant.metaTitle,
    description: dict.assistant.metaDescription,
  };
}

export default async function AssistantPage() {
  const [dict, initialMessages] = await Promise.all([
    getDictionary(),
    getAssistantConversation(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: dict.common.home, href: "/dashboard" },
          { label: dict.assistant.metaTitle },
        ]}
      />
      <p className="max-w-2xl text-sm text-ink-500">{dict.assistant.pageIntro}</p>

      <AssistantWorkspace initialMessages={initialMessages} />
    </div>
  );
}
