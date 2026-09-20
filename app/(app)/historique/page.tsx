import type { Metadata } from "next";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { ActivityHistory } from "@/components/historique/activity-history";
import { getActivityHistory } from "@/lib/data/activity";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.historique.metaTitle,
    description: dict.historique.metaDescription,
  };
}

export default async function HistoriquePage() {
  const [items, dict] = await Promise.all([
    getActivityHistory(),
    getDictionary(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: dict.common.home, href: "/dashboard" },
          { label: dict.historique.metaTitle },
        ]}
      />

      <ActivityHistory items={items} />
    </div>
  );
}
