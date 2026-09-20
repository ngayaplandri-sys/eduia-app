import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { getDictionary } from "@/lib/i18n/server";
import type { ActivityItem } from "@/types";
import { ActivityTable } from "./activity-table";
import { ActivityCardList } from "./activity-card-list";

export async function RecentActivitySection({
  items,
}: {
  items: ActivityItem[];
}) {
  const dict = await getDictionary();
  const t = dict.dashboard;

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader>
        <CardTitle>{t.recentActivity}</CardTitle>
      </CardHeader>

      <div className="mt-4">
        {items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t.activityEmptyTitle}
            description={t.activityEmptyBody}
            action={{ label: t.activityImportCta, href: "/resumer" }}
            className="border-0 py-10"
          />
        ) : (
          <>
            <ActivityTable items={items} />
            <ActivityCardList items={items} />
          </>
        )}
      </div>

      {items.length > 0 ? (
        <div className="mt-5 border-t border-line-soft pt-4 text-center">
          <Link
            href="/historique"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700"
          >
            {t.seeAllHistory}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : null}
    </Card>
  );
}
