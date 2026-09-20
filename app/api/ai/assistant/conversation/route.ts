import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data/user";
import { clearAssistantConversation } from "@/lib/data/assistant-conversation";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Efface la conversation Assistant IA sauvegardée de l'utilisateur connecté —
 * appelée par « Nouvelle conversation » dans `AssistantWorkspace`. Aucune
 * conversation n'est jamais effacée automatiquement (navigation, actualisation) :
 * uniquement sur cette action explicite.
 */
export async function DELETE() {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);
  if (!user) {
    return NextResponse.json({ error: dict.ai.notSignedIn }, { status: 401 });
  }

  await clearAssistantConversation(user.id);
  return NextResponse.json({ ok: true });
}
