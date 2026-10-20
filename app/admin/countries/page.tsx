import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, Crown, Globe2, Users } from "lucide-react";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminSection } from "@/components/admin/admin-section";
import { AdminTable, type AdminColumn } from "@/components/admin/admin-table";
import { EmptyState } from "@/components/feedback/empty-state";
import { getAdminCountryStats } from "@/lib/data/admin";
import { adminCountryName, formatCompactNumber, formatFcfa } from "@/lib/admin/constants";
import type { AdminCountryRow } from "@/types";

export const metadata: Metadata = { title: "Pays" };

const columns: AdminColumn<AdminCountryRow>[] = [
  {
    key: "country",
    header: "Pays",
    primary: true,
    cell: (r) => (
      <Link
        href={`/admin/users?country=${r.code ?? "unknown"}`}
        className="font-semibold text-ink-900 underline-offset-2 hover:text-primary-700 hover:underline"
      >
        {adminCountryName(r.code)}
      </Link>
    ),
  },
  { key: "users", header: "Élèves", align: "right", cell: (r) => formatCompactNumber(r.users) },
  {
    key: "premium",
    header: "Premium actifs",
    align: "right",
    cell: (r) => formatCompactNumber(r.premiumActive),
  },
  {
    key: "payments",
    header: "Paiements",
    align: "right",
    cell: (r) => formatCompactNumber(r.payments),
  },
  {
    key: "revenue",
    header: "Encaissé",
    align: "right",
    cell: (r) => formatFcfa(r.revenueFcfa),
  },
];

export default async function AdminCountriesPage() {
  const { rows, totals } = await getAdminCountryStats();
  const knownCountries = rows.filter((r) => r.code !== null).length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">
        Pays déclaré par l&apos;élève dans le questionnaire d&apos;accueil, à défaut
        pays de connexion détecté. Pour un paiement, c&apos;est le pays de
        connexion au moment du clic « Payer » qui compte. Seul le pays est
        enregistré, jamais la ville ni la position.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          icon={Globe2}
          label="Pays représentés"
          value={formatCompactNumber(knownCountries)}
          tone="primary"
        />
        <AdminStatCard
          icon={Users}
          label="Élèves"
          value={formatCompactNumber(totals.users)}
          tone="neutral"
        />
        <AdminStatCard
          icon={Crown}
          label="Premium actifs"
          value={formatCompactNumber(totals.premiumActive)}
          tone="warning"
        />
        <AdminStatCard
          icon={Banknote}
          label="Total encaissé"
          value={formatFcfa(totals.revenueFcfa)}
          hint={`${formatCompactNumber(totals.payments)} paiement(s) confirmé(s)`}
          tone={totals.revenueFcfa > 0 ? "success" : "neutral"}
        />
      </div>

      <AdminSection
        title="Répartition par pays"
        description="Cliquer sur un pays affiche ses élèves."
      >
        <AdminTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.code ?? "unknown"}
          empty={
            <EmptyState
              icon={Globe2}
              title="Aucun élève pour l'instant"
              description="Les pays apparaîtront dès les premières inscriptions."
              className="border-0 py-12"
            />
          }
        />
      </AdminSection>
    </div>
  );
}
