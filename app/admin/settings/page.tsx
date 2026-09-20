import type { Metadata } from "next";
import { ShieldCheck, Terminal, CreditCard, Infinity as InfinityIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/data/user";
import { OPENAI_MODEL } from "@/lib/ai/openai-client";
import { PLAN_CREDITS } from "@/lib/config/credits";
import { formatFcfa } from "@/lib/admin/constants";

const ADMIN_UNLIMITED_CREDITS = process.env.ADMIN_UNLIMITED_CREDITS === "true";

export const metadata: Metadata = { title: "Paramètres" };

function SettingRow({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3.5 border-b border-line-soft py-4 last:border-0 last:pb-0 first:pt-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
        <Icon className="size-[1.05rem]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <div className="mt-1 text-fine leading-relaxed text-ink-500">
          {children}
        </div>
      </div>
    </div>
  );
}

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-ink-500">
        Réglages de l&apos;espace d&apos;administration. Connecté en tant que{" "}
        <span className="font-medium text-ink-700">{admin.email}</span>.
      </p>

      <Card className="p-5 sm:p-6">
        <SettingRow icon={ShieldCheck} title="Attribuer le rôle administrateur">
          Le rôle admin ne peut jamais être choisi à l&apos;inscription. Il
          s&apos;attribue uniquement en ligne de commande sur le serveur :
          <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-900 px-3 py-2 text-[0.75rem] text-white">
            npm run set-admin -- adresse@exemple.com
          </pre>
          <span className="mt-1 block">
            Retrait du rôle :{" "}
            <code>npm run set-admin -- adresse@exemple.com --revoke</code>
          </span>
        </SettingRow>

        <SettingRow icon={Terminal} title="Modèle OpenAI actif">
          <code>{OPENAI_MODEL}</code> — défini par la variable
          d&apos;environnement <code>OPENAI_MODEL</code> (serveur uniquement).
          Aucune clé n&apos;est exposée dans cette interface.
        </SettingRow>

        <SettingRow icon={CreditCard} title="Forfaits & crédits">
          Premium :{" "}
          <span className="font-semibold text-ink-700">
            {formatFcfa(PLAN_CREDITS.premium.priceFcfa)} / mois — {PLAN_CREDITS.premium.monthly} crédits
          </span>
          . Premium+ :{" "}
          <span className="font-semibold text-ink-700">
            {formatFcfa(PLAN_CREDITS.premium_plus.priceFcfa)} / mois — {PLAN_CREDITS.premium_plus.monthly} crédits
          </span>
          . Le paiement est actuellement <strong>simulé</strong> (validation
          immédiate, aucun encaissement réel) — les commandes sont
          enregistrées dans <code>credit_orders</code>, prête à recevoir un
          vrai fournisseur de paiement sans changement de schéma.
        </SettingRow>

        <SettingRow icon={InfinityIcon} title="Crédits illimités pour les admins">
          <Badge tone={ADMIN_UNLIMITED_CREDITS ? "warning" : "success"} size="sm">
            {ADMIN_UNLIMITED_CREDITS ? "Activé" : "Désactivé (par défaut)"}
          </Badge>
          <span className="mt-1.5 block">
            {ADMIN_UNLIMITED_CREDITS
              ? "Les comptes admin n'utilisent aucun crédit sur Résumer / Générer / Corriger / Assistant."
              : "Les comptes admin consomment leurs crédits exactement comme un compte élève."}{" "}
            Réglable via la variable d&apos;environnement serveur{" "}
            <code>ADMIN_UNLIMITED_CREDITS</code> (<code>true</code> pour
            activer l&apos;illimité, absente ou toute autre valeur pour le
            désactiver).
          </span>
        </SettingRow>
      </Card>
    </div>
  );
}
