import type { Metadata } from "next";
import { Receipt, Banknote, Wallet, CircleAlert } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminSection } from "@/components/admin/admin-section";
import { PaymentNotice } from "@/components/admin/payment-notice";
import { AdminTable, type AdminColumn } from "@/components/admin/admin-table";
import { getAdminPayments } from "@/lib/data/admin";
import { formatFcfa, formatCompactNumber } from "@/lib/admin/constants";
import { formatShortDate } from "@/lib/utils/format";
import type { AdminPaymentRow } from "@/types";

export const metadata: Metadata = { title: "Paiements" };

const KIND_LABEL: Record<string, string> = {
  subscription_premium: "Abonnement Premium",
  subscription_premium_plus: "Abonnement Premium+",
  recharge_100: "Recharge 100 crédits",
  recharge_250: "Recharge 250 crédits",
  recharge_500: "Recharge 500 crédits",
  recharge_1000: "Recharge 1000 crédits",
};

const columns: AdminColumn<AdminPaymentRow>[] = [
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
    key: "kind",
    header: "Commande",
    cell: (r) => KIND_LABEL[r.kind] ?? r.kind,
  },
  { key: "provider", header: "Fournisseur", cell: (r) => r.provider },
  {
    key: "reference",
    header: "Référence",
    cell: (r) => r.reference ?? <span className="text-ink-300">—</span>,
  },
  {
    key: "paidAt",
    header: "Date",
    cell: (r) =>
      r.paidAt ? formatShortDate(r.paidAt) : <span className="text-ink-300">—</span>,
  },
  {
    key: "amount",
    header: "Montant",
    align: "right",
    cell: (r) => formatFcfa(r.amountFcfa),
  },
];

export default async function AdminPaymentsPage() {
  const data = await getAdminPayments();

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">
        Commandes (abonnements + recharges) enregistrées via le paiement
        simulé. Aucun montant n&apos;est réellement encaissé tant qu&apos;un
        vrai fournisseur de paiement n&apos;est pas branché.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard
          icon={Banknote}
          label="Total simulé"
          value={formatFcfa(data.totalCollectedFcfa)}
          hint="Paiement simulé — non encaissé"
          tone={data.totalCollectedFcfa > 0 ? "success" : "neutral"}
        />
        <AdminStatCard
          icon={Receipt}
          label="Commandes"
          value={formatCompactNumber(data.transactionCount)}
          hint="Lignes credit_orders"
          tone="primary"
        />
        <AdminStatCard
          icon={Wallet}
          label="Premium manuels"
          value={formatCompactNumber(data.manualPremiumCount)}
          hint="Plan changé en base, sans commande"
          tone="warning"
        />
      </div>

      <PaymentNotice />

      <AdminSection
        title="Historique des commandes"
        description="Une ligne par abonnement ou recharge, simulé instantanément."
      >
        <AdminTable
          columns={columns}
          rows={data.rows}
          getRowKey={(r) => `${r.userId}-${r.reference ?? "na"}`}
          empty={
            <EmptyState
              icon={CircleAlert}
              title="Aucune commande enregistrée"
              description="Dès qu'un compte s'abonne ou recharge des crédits, la commande apparaît ici automatiquement."
              className="border-0 py-12"
            />
          }
        />
      </AdminSection>
    </div>
  );
}
