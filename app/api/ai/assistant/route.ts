import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasUnlimitedAccess } from "@/lib/data/user";
import {
  consumeCredits,
  getCreditWallet,
  refundCredits,
} from "@/lib/data/credits";
import { askAssistant } from "@/lib/ai/generate";
import { getLatestCourseSummary } from "@/lib/data/summary";
import { saveAssistantConversation } from "@/lib/data/assistant-conversation";
import { assistantRequestSchema } from "@/lib/ai/schemas";
import { describeAIError } from "@/lib/ai/errors";
import { OPENAI_MODEL } from "@/lib/ai/openai-client";
import { logAiUsage } from "@/lib/ai/usage";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import type { CreditDebitResult } from "@/types";

/** Réponse parfois longue à générer — laisse la fonction respirer en serverless. */
export const maxDuration = 60;

/**
 * « Assistant IA » : reçoit l'historique de conversation construit par
 * `AssistantWorkspace` (JSON : `{ messages }`), envoie la question à OpenAI
 * **côté serveur** (même client/modèle que Résumer / Générer / Corriger) et
 * renvoie la réponse texte libre de l'Assistant.
 *
 * Le client renvoie l'historique complet à chaque message (source de vérité
 * pendant la frappe) ; une fois la réponse générée avec succès, l'échange
 * complet est persisté dans `assistant_conversations`
 * (`lib/data/assistant-conversation.ts`) pour être restauré à la prochaine
 * visite de `/assistant` — voir `DELETE /api/ai/assistant/conversation` pour
 * « Nouvelle conversation ».
 *
 * Coût : 1 crédit par message envoyé (donc par appel à cette route), prélevé
 * atomiquement AVANT l'appel OpenAI — sauf l'admin/propriétaire (accès
 * illimité). Remboursé si la génération échoue ensuite.
 */
export async function POST(request: Request) {
  const [user, dict, locale] = await Promise.all([
    getCurrentUser(),
    getDictionary(),
    getLocale(),
  ]);
  const t = dict.ai;

  if (!user) {
    return NextResponse.json({ error: t.notSignedIn }, { status: 401 });
  }

  const unlimited = hasUnlimitedAccess(user);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }

  const parsed = assistantRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }

  let debit: CreditDebitResult | null = null;

  try {
    if (!unlimited) {
      debit = await db.transaction((tx) => consumeCredits(tx, user.id, "assistant"));
      if (!debit.ok) {
        return NextResponse.json(
          { error: dict.credits.insufficientMessage, code: "INSUFFICIENT_CREDITS" },
          { status: 402 },
        );
      }
    }

    // Contexte optionnel : le dernier cours résumé par l'élève, pour ancrer
    // les réponses quand la question s'y rapporte (réutilise `getLatestCourseSummary`,
    // déjà utilisé par « Résumer mes cours » — aucune nouvelle plomberie de données).
    const { document } = await getLatestCourseSummary();
    const context = document.subject.trim()
      ? {
          subject: document.subject,
          level: document.level,
          chapter: document.chapter,
          theme: document.theme,
        }
      : null;

    const { reply, usage } = await askAssistant(
      parsed.data.messages,
      context,
      dict,
      locale,
    );

    await logAiUsage({
      userId: user.id,
      kind: "assistant",
      model: OPENAI_MODEL,
      status: "success",
      tokens: usage,
    });

    // Sauvegarde l'historique réellement échangé (question + réponse IA
    // effective) — restauré tel quel à la prochaine visite de /assistant.
    await saveAssistantConversation(user.id, [
      ...parsed.data.messages,
      { role: "assistant", content: reply },
    ]);

    const credits = unlimited ? null : await getCreditWallet(user.id);
    return NextResponse.json({ reply, credits });
  } catch (error) {
    console.error("[/api/ai/assistant] échec de la génération :", error);
    if (debit?.ok) {
      const { drawnFromSubscription, drawnFromRecharge } = debit;
      await db.transaction((tx) =>
        refundCredits(tx, user.id, drawnFromSubscription, drawnFromRecharge, "assistant"),
      );
    }
    await logAiUsage({
      userId: user.id,
      kind: "assistant",
      model: OPENAI_MODEL,
      status: "error",
    });
    const { status, message } = describeAIError(error, dict);
    return NextResponse.json({ error: message }, { status });
  }
}
