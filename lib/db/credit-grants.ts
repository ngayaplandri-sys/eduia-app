import { sql } from "drizzle-orm";
import { db, schema } from "./client";
import { PLAN_CREDITS } from "@/lib/config/credits";

/**
 * Octroi des 20 crédits gratuits de bienvenue — extrait de `lib/data/credits.ts`
 * (qui a `server-only`) dans ce module SANS `server-only`, comme `./client`,
 * spécifiquement parce que `lib/auth.ts` doit rester chargeable par la CLI
 * Better Auth et par les scripts de vérification `scripts/_*.ts` (contextes
 * Node hors React, où `server-only` lève une erreur). Ne pas ajouter d'autre
 * logique ici : c'est le seul point d'entrée crédits autorisé à ne pas avoir
 * `server-only`, réexporté par `lib/data/credits.ts` pour le reste de l'appli.
 */
export async function grantSignupCredits(userId: string): Promise<void> {
  const amount = PLAN_CREDITS.free.signupGrant;

  const [wallet] = await db
    .insert(schema.creditWallets)
    .values({ userId, subscriptionBalance: 0, rechargeBalance: amount })
    .onConflictDoUpdate({
      target: schema.creditWallets.userId,
      set: {
        rechargeBalance: sql`${schema.creditWallets.rechargeBalance} + ${amount}`,
        updatedAt: new Date(),
      },
    })
    .returning({
      subscriptionBalance: schema.creditWallets.subscriptionBalance,
      rechargeBalance: schema.creditWallets.rechargeBalance,
    });

  await db.insert(schema.creditLedger).values({
    userId,
    kind: "signup_grant",
    amount,
    bucket: "recharge",
    balanceAfter: wallet.subscriptionBalance + wallet.rechargeBalance,
  });
}
