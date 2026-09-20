import type { Metadata } from "next";
import Link from "next/link";
import {
  Library,
  BookText,
  GraduationCap,
  ClipboardCheck,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminSection } from "@/components/admin/admin-section";
import { getAdminContentOverview } from "@/lib/data/admin";
import { formatCompactNumber } from "@/lib/admin/constants";
import { formatShortDate } from "@/lib/utils/format";
import type { AdminContentKind } from "@/types";

export const metadata: Metadata = { title: "Gestion des contenus" };

const KIND_META: Record<
  AdminContentKind,
  { label: string; icon: LucideIcon; tone: "primary" | "success" | "warning" | "info" }
> = {
  summary: { label: "Résumé", icon: BookText, tone: "success" },
  exam: { label: "Épreuve", icon: GraduationCap, tone: "primary" },
  correction: { label: "Correction", icon: ClipboardCheck, tone: "warning" },
  document: { label: "Document", icon: FileText, tone: "info" },
};

export default async function AdminContentPage() {
  const data = await getAdminContentOverview();

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">
        Contenus générés ou importés par les comptes réels d&apos;EducAI. Vue en
        lecture seule — le compte de démonstration est exclu.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          icon={BookText}
          label="Résumés"
          value={formatCompactNumber(data.totals.summaries)}
          tone="success"
        />
        <AdminStatCard
          icon={GraduationCap}
          label="Épreuves"
          value={formatCompactNumber(data.totals.exams)}
          tone="primary"
        />
        <AdminStatCard
          icon={ClipboardCheck}
          label="Corrections"
          value={formatCompactNumber(data.totals.corrections)}
          tone="warning"
        />
        <AdminStatCard
          icon={FileText}
          label="Documents"
          value={formatCompactNumber(data.totals.documents)}
          tone="info"
        />
      </div>

      <AdminSection
        title="Contenus récents"
        description="Les 20 derniers artefacts, tous types confondus."
      >
        {data.recent.length === 0 ? (
          <EmptyState
            icon={Library}
            title="Aucun contenu"
            description="Les résumés, épreuves, corrections et documents créés par les utilisateurs apparaîtront ici."
            className="border-0 py-12"
          />
        ) : (
          <ul className="divide-y divide-line-soft">
            {data.recent.map((item) => {
              const meta = KIND_META[item.kind];
              const Icon = meta.icon;
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink-500">
                    <Icon className="size-[1.05rem]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-fine text-ink-500">
                      {item.detail ? `${item.detail} · ` : ""}
                      {item.ownerId ? (
                        <Link
                          href={`/admin/users/${item.ownerId}`}
                          className="underline-offset-2 hover:text-primary-700 hover:underline"
                        >
                          {item.ownerName || item.ownerEmail}
                        </Link>
                      ) : (
                        (item.ownerName ?? item.ownerEmail ?? "—")
                      )}
                    </p>
                  </div>
                  <Badge tone={meta.tone} size="sm">
                    {meta.label}
                  </Badge>
                  <span className="shrink-0 text-[0.75rem] text-ink-400">
                    {formatShortDate(item.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>

      <Card className="p-5 sm:p-6">
        <p className="text-fine leading-relaxed text-ink-500">
          La suppression ou la modération de contenu depuis cette interface
          n&apos;est pas encore activée. Les artefacts restent gérés par chaque
          utilisateur depuis son propre espace.
        </p>
      </Card>
    </div>
  );
}
