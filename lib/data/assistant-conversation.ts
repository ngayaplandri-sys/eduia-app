import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { AssistantMessage } from "@/types";
import { getCurrentUser } from "./user";

/**
 * Conversation en cours de l'utilisateur connecté avec l'Assistant IA
 * (`assistant_conversations`, une ligne par compte). `[]` si personne n'est
 * connecté ou si aucune conversation n'a encore été démarrée.
 */
export async function getAssistantConversation(): Promise<AssistantMessage[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const [row] = await db
    .select({ messages: schema.assistantConversations.messages })
    .from(schema.assistantConversations)
    .where(eq(schema.assistantConversations.userId, user.id))
    .limit(1);

  return row?.messages ?? [];
}

/**
 * Remplace l'intégralité de la conversation sauvegardée par l'historique
 * réellement échangé (question de l'élève + réponse de l'IA effectivement
 * générée). Appelée uniquement après un échange réussi — jamais pour un
 * message resté sans réponse (crédits insuffisants, erreur IA…).
 */
export async function saveAssistantConversation(
  userId: string,
  messages: AssistantMessage[],
): Promise<void> {
  await db
    .insert(schema.assistantConversations)
    .values({ userId, messages })
    .onConflictDoUpdate({
      target: schema.assistantConversations.userId,
      set: { messages, updatedAt: new Date() },
    });
}

/** Efface la conversation sauvegardée (« Nouvelle conversation »). */
export async function clearAssistantConversation(userId: string): Promise<void> {
  await db
    .delete(schema.assistantConversations)
    .where(eq(schema.assistantConversations.userId, userId));
}
