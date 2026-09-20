import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { getAdminUserDetail } from "@/lib/data/admin";
import { formatActivityDate, formatShortDate } from "@/lib/utils/format";
import { roleLabel } from "@/lib/roles";
import {
  ONBOARDING_GOAL_LABELS_FR,
  LEARNING_STYLE_LABELS_FR,
  type OnboardingGoalId,
  type LearningStyleId,
} from "@/lib/config/onboarding";

export const metadata: Metadata = { title: "Fiche utilisateur" };

function planLabel(plan: string): string {
  return plan === "premium_plus" ? "Premium+" : plan === "premium" ? "Premium" : "Gratuit";
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line-soft py-2.5 last:border-0 last:pb-0">
      <span className="shrink-0 text-fine font-medium text-ink-500">
        {label}
      </span>
      <span className="min-w-0 text-right text-sm font-semibold text-ink-900">
        {value}
      </span>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-3 text-title-sm font-bold text-ink-900">{title}</h2>
      {children}
    </Card>
  );
}

const goalLabel = (id: string) =>
  ONBOARDING_GOAL_LABELS_FR[id as OnboardingGoalId] ?? id;
const styleLabel = (id: string) =>
  LEARNING_STYLE_LABELS_FR[id as LearningStyleId] ?? id;

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAdminUserDetail(id);
  if (!user) notFound();

  const { counts } = user;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Tous les utilisateurs
      </Link>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <Avatar src={null} name={user.name} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-ink-900">{user.name}</p>
          <p className="truncate text-sm text-ink-500">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role === "admin" ? (
            <Badge tone="primary" size="sm">
              {roleLabel(user.role)}
            </Badge>
          ) : (
            <Badge tone="neutral" size="sm">
              {roleLabel(user.role)}
            </Badge>
          )}
          <Badge tone={user.plan === "free" ? "neutral" : "warning"} size="sm">
            {planLabel(user.plan)}
          </Badge>
          <Badge tone={user.emailVerified ? "success" : "neutral"} size="sm">
            {user.emailVerified ? "E-mail vérifié" : "E-mail non vérifié"}
          </Badge>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Profil">
          <div className="space-y-0">
            <InfoRow label="Identifiant" value={<code className="text-[0.75rem] text-ink-500">{user.id}</code>} />
            <InfoRow label="Inscription" value={formatShortDate(user.createdAt)} />
            <InfoRow label="Dernière mise à jour" value={formatShortDate(user.updatedAt)} />
          </div>
        </Panel>

        <Panel title="Onboarding">
          {user.onboarding ? (
            <div className="space-y-0">
              <InfoRow label="Prénom" value={user.onboarding.firstName} />
              <InfoRow label="Niveau" value={user.onboarding.schoolLevel} />
              <InfoRow
                label="Matières"
                value={user.onboarding.subjects.join(", ") || "—"}
              />
              <InfoRow label="Objectif" value={goalLabel(user.onboarding.goal)} />
              <InfoRow
                label="Progresser en"
                value={user.onboarding.improveSubjects.join(", ") || "—"}
              />
              <InfoRow
                label="Préférence"
                value={styleLabel(user.onboarding.learningStyle)}
              />
              <InfoRow
                label="Terminé le"
                value={formatShortDate(user.onboarding.completedAt)}
              />
            </div>
          ) : (
            <p className="text-sm text-ink-400">Onboarding non complété.</p>
          )}
        </Panel>

        <Panel title="Contenu & activité">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Activités", value: counts.activities },
              { label: "Documents", value: counts.documents },
              { label: "Résumés", value: counts.summaries },
              { label: "Épreuves", value: counts.exams },
              { label: "Corrections", value: counts.corrections },
              { label: "Générations IA", value: counts.aiGenerations },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-line-soft py-3"
              >
                <p className="text-lg font-extrabold text-ink-900">
                  {item.value}
                </p>
                <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-ink-400">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Abonnement">
          <div className="space-y-0">
            <InfoRow
              label="Plan"
              value={planLabel(user.plan)}
            />
            <InfoRow
              label="Résumé gratuit utilisé"
              value={
                user.subscription?.freeGenerationUsedAt
                  ? formatShortDate(user.subscription.freeGenerationUsedAt)
                  : "Non"
              }
            />
            <InfoRow
              label="Premium activé le"
              value={
                user.subscription?.premiumActivatedAt
                  ? formatShortDate(user.subscription.premiumActivatedAt)
                  : "—"
              }
            />
            <InfoRow
              label="Fournisseur de paiement"
              value={user.subscription?.paymentProvider ?? "Non connecté"}
            />
          </div>
        </Panel>
      </div>

      <Panel title="Activité récente">
        {user.recentActivity.length > 0 ? (
          <ul className="divide-y divide-line-soft">
            {user.recentActivity.map((activity) => (
              <li
                key={activity.id}
                className="flex items-center justify-between gap-4 py-2.5"
              >
                <span className="min-w-0 truncate text-sm text-ink-700">
                  {activity.title}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge tone="neutral" size="sm">
                    {activity.type}
                  </Badge>
                  <span className="text-[0.75rem] text-ink-400">
                    {formatActivityDate(activity.occurredAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-400">Aucune activité enregistrée.</p>
        )}
      </Panel>
    </div>
  );
}
