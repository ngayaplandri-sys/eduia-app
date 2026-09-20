import { FileText, FilePenLine, ClipboardCheck } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";
import { ActionCard, type ActionCardData } from "./action-card";

export async function ActionCardsGrid() {
  const dict = await getDictionary();
  const t = dict.dashboard;

  const actions: ActionCardData[] = [
    {
      tone: "success",
      icon: FileText,
      title: t.actionResumerTitle,
      description: t.actionResumerBody,
      cta: { label: t.actionResumerCta, href: "/resumer" },
      spotlight: true,
    },
    {
      tone: "primary",
      icon: FilePenLine,
      title: t.actionGenererTitle,
      description: t.actionGenererBody,
      cta: { label: t.actionGenererCta, href: "/generer" },
    },
    {
      tone: "warning",
      icon: ClipboardCheck,
      title: t.actionCorrigerTitle,
      description: t.actionCorrigerBody,
      cta: { label: t.actionCorrigerCta, href: "/corriger" },
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-3 lg:gap-6">
      {actions.map((action) => (
        <ActionCard key={action.title} {...action} />
      ))}
    </div>
  );
}
