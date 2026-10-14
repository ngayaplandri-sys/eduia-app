import type { Metadata } from "next";
import { Crown, Gift, Banknote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminSection } from "@/components/admin/admin-section";
import { PaymentNotice } from "@/components/admin/payment-notice";
import { AdminTable, type AdminColumn } from "@/components/admin/admin-table";
import { getAdminSubscriptions } from "@/lib/data/admin";
import { PLAN_CREDITS } from "@/lib/config/credits";
import { formatFcfa, formatCompactNumber } from "@/lib/admin/constants";
import { formatShortDate } from "@/lib/utils/format";
import type { AdminSubscriptionRow } from "@/types";

export const metadata: Metadata = { title: "Abonnements Premium" };

const columns: AdminColumn<AdminSubscriptionRow>[] = [
  {
    key: "name",
    header: "Utilisateur",
    primary: true,
    cell: (r) => (
      <span>
        <span className="block font-semibold text-ink-900">{r.name}</span>
        <span className="block text-fine text-ink-500">{r.email}</span>
      </span>
    ),
  },
  {
    key: "status",
    header: "Statut",
    cell: (r) => (
      <Badge tone="warning" size="sm">
        {r.plan === "premium_plus" ? "Premium+ actif" : "Premium actif"}
      </Badge>
    ),
  },
  {
    key: "start",
    header: "Depuis",
    cell: (r) =>
      r.premiumActivatedAt
        ? formatShortDate(r.premiumActivatedAt)
        : formatShortDate(r.signedUpAt),
  },
  {
    key: "amount",
    header: "Montant",
    cell: (r) => `${formatFcfa(r.monthlyPriceFcfa)}/mois`,
  },
  {
    key: "payment",
    header: "Paiement",
    cell: (r) =>
      r.paymentProvider ? (
        <span className="text-ink-700">
          {r.paymentProvider}
          {r.paymentReference ? ` · ${r.paymentReference}` : ""}
        </span>
      ) : (
        <span className="text-ink-400">Non connecté</span>
      ),
  },
];

export default async function AdminSubscriptionsPage() {
  const data = await getAdminSubscriptions();

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">
        Répartition des plans et abonnements Premium (compte de démonstration
        exclu).
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard
          icon={Gift}
          label="Comptes gratuits"
          value={formatCompactNumber(data.freeCount)}
          hint="0 FCFA"
          tone="neutral"
        />
        <AdminStatCard
          icon={Crown}
          label="Comptes Premium"
          value={formatCompactNumber(data.premiumCount)}
          hint={`${formatFcfa(PLAN_CREDITS.premium.priceFcfa)} / mois`}
          tone="warning"
        />
        <AdminStatCard
          icon={Banknote}
          label="Revenu mensuel estimé"
          value={formatFcfa(data.estimatedMrrFcfa)}
          hint="Théorique — non encaissé"
          tone="success"
        />
      </div>

      <PaymentNotice />

      <AdminSection
        title="Abonnements Premium"
        description="Paiement simulé actif — les commandes sont enregistrées dans credit_orders, aucun encaissement réel."
      >
        <AdminTable
          columns={columns}
          rows={data.premiumRows}
          getRowKey={(r) => r.userId}
          empty={
            <EmptyState
              icon={Crown}
              title="Aucun abonné Premium"
              description="Les comptes passés en Premium apparaîtront ici."
              className="border-0 py-12"
            />
          }
        />
      </AdminSection>
    </div>
  );
}
