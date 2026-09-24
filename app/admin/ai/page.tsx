import type { Metadata } from "next";
import { Sparkles, CircleCheck, Cpu, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminSection } from "@/components/admin/admin-section";
import { AdminTable, type AdminColumn } from "@/components/admin/admin-table";
import { getAdminAiUsage } from "@/lib/data/admin";
import { formatCompactNumber } from "@/lib/admin/constants";
import { formatActivityDate } from "@/lib/utils/format";
import type { AdminAiUsageUser } from "@/types";

export const metadata: Metadata = { title: "Utilisation IA" };

const KIND_LABELS: Record<string, string> = {
  summary: "Résumés",
  exam: "Épreuves",
  correction: "Corrections",
  assistant: "Assistant IA",
  ocr: "Lecture de photos",
};

const topUsersColumns: AdminColumn<AdminAiUsageUser>[] = [
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
  { key: "total", header: "Générations", cell: (r) => formatCompactNumber(r.total) },
  { key: "tokens", header: "Tokens", cell: (r) => formatCompactNumber(r.tokens) },
];

export default async function AdminAiPage() {
  const data = await getAdminAiUsage();

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">
        Suivi des appels aux routes <code>/api/ai/*</code> (OpenAI). Aucune clé
        ni aucun contenu n&apos;est stocké — uniquement des compteurs.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          icon={Sparkles}
          label="Requêtes IA"
          value={formatCompactNumber(data.totalRequests)}
          hint={`${data.totalErrors} en erreur`}
          tone="primary"
        />
        <AdminStatCard
          icon={CircleCheck}
          label="Réussies"
          value={formatCompactNumber(data.totalSuccess)}
          tone="success"
        />
        <AdminStatCard
          icon={Cpu}
          label="Tokens consommés"
          value={formatCompactNumber(data.totalTokens)}
          hint="Input + output"
          tone="info"
        />
        <AdminStatCard
          icon={Coins}
          label="Coût estimé"
          value={`≈ ${data.estimatedCostUsd.toFixed(2)} $`}
          hint="Tarif indicatif — voir OpenAI"
          tone="neutral"
        />
      </div>

      <AdminSection
        title="Par type de génération"
        description="Répartition des appels et des tokens."
      >
        {data.totalRequests === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Aucune génération pour l'instant"
            description="Les appels aux fonctionnalités IA d'EduIA seront comptés ici."
            className="border-0 py-12"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {data.byKind.map((k) => (
              <div
                key={k.kind}
                className="rounded-xl border border-line-soft p-4"
              >
                <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-ink-400">
                  {KIND_LABELS[k.kind] ?? k.kind}
                </p>
                <p className="mt-2 text-xl font-extrabold text-ink-900">
                  {formatCompactNumber(k.total)}
                </p>
                <p className="mt-1 text-fine text-ink-500">
                  {k.success} réussies · {formatCompactNumber(k.tokens)} tokens
                </p>
              </div>
            ))}
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Utilisateurs les plus actifs"
        description="Top 10 par nombre de générations."
      >
        <AdminTable
          columns={topUsersColumns}
          rows={data.topUsers}
          getRowKey={(r) => r.userId}
          empty={
            <EmptyState
              icon={Sparkles}
              title="Pas encore de données"
              description="Aucun utilisateur n'a encore lancé de génération IA."
              className="border-0 py-12"
            />
          }
        />
      </AdminSection>

      {data.recent.length > 0 ? (
        <AdminSection title="Derniers appels">
          <ul className="divide-y divide-line-soft">
            {data.recent.map((call) => (
              <li
                key={call.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-fine"
              >
                <span className="min-w-0">
                  <span className="font-medium text-ink-800">
                    {KIND_LABELS[call.kind] ?? call.kind}
                  </span>{" "}
                  <span className="text-ink-400">· {call.userEmail}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge
                    tone={call.status === "success" ? "success" : "danger"}
                    size="sm"
                  >
                    {call.status === "success" ? "OK" : "Erreur"}
                  </Badge>
                  {call.tokens !== null ? (
                    <span className="text-ink-400">{call.tokens} tk</span>
                  ) : null}
                  <span className="text-ink-400">
                    {formatActivityDate(call.createdAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </AdminSection>
      ) : null}
    </div>
  );
}
