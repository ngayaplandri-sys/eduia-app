import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  Gift,
  Crown,
  TrendingUp,
  Banknote,
  Sparkles,
  Cpu,
  Flag,
} from "lucide-react";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { PaymentNotice } from "@/components/admin/payment-notice";
import { getAdminOverviewStats } from "@/lib/data/admin";
import { formatFcfa, formatCompactNumber, DEMO_EMAIL } from "@/lib/admin/constants";

export const metadata: Metadata = { title: "Vue d'ensemble" };

export default async function AdminOverviewPage() {
  const stats = await getAdminOverviewStats();

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">
        Chiffres calculés en direct depuis la base Neon. Le compte de
        démonstration (<span className="font-medium">{DEMO_EMAIL}</span>) est
        exclu de toutes les statistiques.
      </p>

      <section>
        <h2 className="mb-3 text-[0.8rem] font-semibold uppercase tracking-wide text-ink-400">
          Utilisateurs
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            icon={Users}
            label="Total utilisateurs"
            value={formatCompactNumber(stats.totalUsers)}
            tone="primary"
          />
          <AdminStatCard
            icon={Gift}
            label="Comptes gratuits"
            value={formatCompactNumber(stats.freeUsers)}
            tone="neutral"
          />
          <AdminStatCard
            icon={Crown}
            label="Comptes Premium"
            value={formatCompactNumber(stats.premiumUsers)}
            tone="warning"
          />
          <AdminStatCard
            icon={TrendingUp}
            label="Nouveaux (7 j)"
            value={formatCompactNumber(stats.newUsers7d)}
            tone="success"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[0.8rem] font-semibold uppercase tracking-wide text-ink-400">
          Revenus &amp; IA
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            icon={Banknote}
            label="Revenu mensuel estimé"
            value={formatFcfa(stats.estimatedMonthlyRevenueFcfa)}
            hint="Théorique — aucun paiement encaissé"
            tone="success"
          />
          <AdminStatCard
            icon={Sparkles}
            label="Générations IA"
            value={formatCompactNumber(stats.aiGenerations)}
            hint="Appels OpenAI réussis"
            tone="primary"
          />
          <AdminStatCard
            icon={Cpu}
            label="Tokens OpenAI"
            value={formatCompactNumber(stats.openAiTokens)}
            hint="Cumul input + output"
            tone="info"
          />
          <AdminStatCard
            icon={Flag}
            label="Signalements en attente"
            value={formatCompactNumber(stats.pendingReports)}
            tone={stats.pendingReports > 0 ? "danger" : "neutral"}
          />
        </div>
      </section>

      <PaymentNotice />

      <nav className="flex flex-wrap gap-x-3 gap-y-2">
        {[
          { href: "/admin/users", label: "Gérer les utilisateurs" },
          { href: "/admin/stats", label: "Voir les statistiques" },
          { href: "/admin/payments", label: "Suivi des paiements" },
          { href: "/admin/activity", label: "Journal d'activité" },
          { href: "/admin/content", label: "Gestion des contenus" },
          { href: "/admin/reports", label: "Voir les signalements" },
        ].map((link, i) => (
          <span key={link.href} className="flex items-center gap-3">
            {i > 0 ? (
              <span className="text-ink-400" aria-hidden>
                ·
              </span>
            ) : null}
            <Link
              href={link.href}
              className="text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700"
            >
              {link.label} →
            </Link>
          </span>
        ))}
      </nav>
    </div>
  );
}
