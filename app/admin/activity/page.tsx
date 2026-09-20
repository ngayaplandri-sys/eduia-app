import type { Metadata } from "next";
import {
  Activity,
  UserPlus,
  Sparkles,
  Flag,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { FeedPager } from "@/components/admin/feed-pager";
import { getAdminActivityFeed } from "@/lib/data/admin";
import { formatActivityDate } from "@/lib/utils/format";
import type { AdminActivityKind } from "@/types";

export const metadata: Metadata = { title: "Activité" };

const KIND_META: Record<
  AdminActivityKind,
  { icon: LucideIcon; className: string }
> = {
  activity: { icon: FileText, className: "bg-primary-100 text-primary-600" },
  signup: { icon: UserPlus, className: "bg-success-100 text-success-700" },
  ai: { icon: Sparkles, className: "bg-info-100 text-info-600" },
  report: { icon: Flag, className: "bg-warning-100 text-warning-700" },
};

function asNumber(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1;
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const feed = await getAdminActivityFeed({ page: asNumber(sp.page) });

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">
        Journal en direct de la plateforme : inscriptions, activités, générations
        IA et signalements des comptes réels (démo exclue).
      </p>

      {feed.items.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Aucune activité pour l'instant"
          description="Les événements de la plateforme s'afficheront ici dès les premières interactions."
          className="py-14"
        />
      ) : (
        <Card className="p-5 sm:p-6">
          <ul className="divide-y divide-line-soft">
            {feed.items.map((item) => {
              const meta = KIND_META[item.kind];
              const Icon = meta.icon;
              return (
                <li key={item.id} className="flex gap-3.5 py-3.5 first:pt-0 last:pb-0">
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${meta.className}`}
                  >
                    <Icon className="size-[1.05rem]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-fine text-ink-500">
                      {item.userLabel ?? "—"}
                      {item.detail ? ` · ${item.detail}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.75rem] text-ink-400">
                    {formatActivityDate(item.occurredAt)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 border-t border-line-soft pt-4">
            <FeedPager page={feed.page} hasMore={feed.hasMore} />
          </div>
        </Card>
      )}
    </div>
  );
}
