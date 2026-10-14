import type { Metadata } from "next";
import { Users, TrendingUp, Sparkles, Flag } from "lucide-react";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminSection } from "@/components/admin/admin-section";
import { MiniBarChart } from "@/components/admin/mini-bar-chart";
import { getAdminStats } from "@/lib/data/admin";
import { formatCompactNumber } from "@/lib/admin/constants";
import type { AdminStatPoint } from "@/types";

export const metadata: Metadata = { title: "Statistiques" };

function Distribution({
  rows,
}: {
  rows: { label: string; value: number; tone: string }[];
}) {
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const pct = total === 0 ? 0 : Math.round((r.value / total) * 100);
        return (
          <li key={r.label}>
            <div className="flex items-center justify-between text-fine">
              <span className="font-medium text-ink-700">{r.label}</span>
              <span className="tabular-nums text-ink-500">
                {formatCompactNumber(r.value)} · {pct}%
              </span>
            </div>
            <span className="mt-1.5 block h-2.5 overflow-hidden rounded-full bg-canvas">
              <span
                className={`block h-full rounded-full ${r.tone}`}
                style={{ width: `${pct}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default async function AdminStatsPage() {
  const stats = await getAdminStats();

  const contentPoints: AdminStatPoint[] = [
    { label: "Résumés", value: stats.contentTotals.summaries },
    { label: "Épreuves", value: stats.contentTotals.exams },
    { label: "Corrections", value: stats.contentTotals.corrections },
    { label: "Documents", value: stats.contentTotals.documents },
  ];
  const newLast4 = stats.signupsByWeek
    .slice(-4)
    .reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">
        Indicateurs calculés en direct depuis la base Neon. Le compte de
        démonstration est exclu. Toutes les séries affichent des zéros tant
        qu&apos;aucune donnée réelle n&apos;existe.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          icon={Users}
          label="Utilisateurs"
          value={formatCompactNumber(stats.totalUsers)}
          tone="primary"
        />
        <AdminStatCard
          icon={TrendingUp}
          label="Inscriptions (4 sem.)"
          value={formatCompactNumber(newLast4)}
          tone="success"
        />
        <AdminStatCard
          icon={Sparkles}
          label="Générations IA"
          value={formatCompactNumber(
            stats.aiByKind.reduce((sum, k) => sum + k.value, 0),
          )}
          tone="info"
        />
        <AdminStatCard
          icon={Flag}
          label="Signalements résolus"
          value={formatCompactNumber(stats.reportsByStatus.resolved)}
          hint={`${stats.reportsByStatus.new} nouveaux · ${stats.reportsByStatus.in_progress} en cours`}
          tone="neutral"
        />
      </div>

      <AdminSection
        title="Inscriptions par semaine"
        description="8 dernières semaines glissantes (comptes réels)."
      >
        <MiniBarChart data={stats.signupsByWeek} tone="primary" />
      </AdminSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminSection
          title="Répartition des plans"
          description="Part des comptes gratuits et Premium (Premium+ : ancienne offre, plus vendue)."
        >
          <Distribution
            rows={[
              {
                label: "Gratuit",
                value: stats.planSplit.free,
                tone: "bg-ink-400",
              },
              {
                label: "Premium",
                value: stats.planSplit.premium,
                tone: "bg-warning-500",
              },
              {
                label: "Premium+ (ancienne offre)",
                value: stats.planSplit.premium_plus,
                tone: "bg-primary-500",
              },
            ]}
          />
        </AdminSection>

        <AdminSection
          title="Générations IA par type"
          description="Appels réussis ou non aux fonctionnalités IA."
        >
          <MiniBarChart data={stats.aiByKind} tone="info" />
        </AdminSection>
      </div>

      <AdminSection
        title="Contenus créés"
        description="Total des artefacts générés par les comptes réels."
      >
        <MiniBarChart data={contentPoints} tone="success" />
      </AdminSection>
    </div>
  );
}
