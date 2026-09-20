import type { Metadata } from "next";
import Link from "next/link";
import { Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { AdminSection } from "@/components/admin/admin-section";
import {
  ReportStatusBadge,
  REPORT_STATUS_LABELS,
  REPORT_TYPE_LABELS,
} from "@/components/admin/report-status-badge";
import { ReportStatusControl } from "@/components/admin/report-status-control";
import { getAdminReports, getAdminReportCounts } from "@/lib/data/admin";
import { formatActivityDate } from "@/lib/utils/format";
import type { ReportStatus } from "@/types";

export const metadata: Metadata = { title: "Signalements" };

const STATUS_TABS: { value: ReportStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "new", label: REPORT_STATUS_LABELS.new },
  { value: "in_progress", label: REPORT_STATUS_LABELS.in_progress },
  { value: "resolved", label: REPORT_STATUS_LABELS.resolved },
];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const raw = typeof sp.status === "string" ? sp.status : "all";
  const status: ReportStatus | undefined =
    raw === "new" || raw === "in_progress" || raw === "resolved"
      ? raw
      : undefined;

  const [reports, counts] = await Promise.all([
    getAdminReports(status ? { status } : undefined),
    getAdminReportCounts(),
  ]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">
        Problèmes signalés par les élèves depuis la page « Aide &amp; support ».
        {" "}
        {counts.new} nouveau{counts.new > 1 ? "x" : ""} · {counts.in_progress} en
        cours · {counts.resolved} résolu{counts.resolved > 1 ? "s" : ""}.
      </p>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const active = (status ?? "all") === tab.value;
          return (
            <Link
              key={tab.value}
              href={
                tab.value === "all"
                  ? "/admin/reports"
                  : `/admin/reports?status=${tab.value}`
              }
              className={
                active
                  ? "rounded-full bg-primary-600 px-3.5 py-1.5 text-fine font-semibold text-white"
                  : "rounded-full border border-line bg-surface px-3.5 py-1.5 text-fine font-medium text-ink-600 transition-colors hover:bg-canvas"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="Aucun signalement"
          description={
            status
              ? "Aucun signalement dans ce statut."
              : "Les signalements envoyés par les élèves apparaîtront ici."
          }
          className="py-14"
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <AdminSection
              key={report.id}
              title={REPORT_TYPE_LABELS[report.type] ?? report.type}
              description={`${report.userName ?? report.userEmail ?? "Utilisateur supprimé"} · ${formatActivityDate(report.createdAt)}`}
              action={
                <ReportStatusControl id={report.id} status={report.status} />
              }
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                {report.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ReportStatusBadge status={report.status} />
                {report.userEmail ? (
                  <Badge tone="neutral" size="sm">
                    {report.userEmail}
                  </Badge>
                ) : null}
              </div>
            </AdminSection>
          ))}
        </div>
      )}
    </div>
  );
}
