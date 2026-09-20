import "server-only";
import { db, schema } from "@/lib/db";
import type { AiUsageKind } from "@/types";

export interface AiUsageTokens {
  inputTokens: number | null;
  outputTokens: number | null;
}

/**
 * Enregistre un appel IA dans `ai_usage` (alimente `/admin/ai`). Ne stocke
 * aucune clé ni aucun contenu, seulement des compteurs. Silencieux en cas
 * d'échec : le journal ne doit jamais casser la réponse à l'utilisateur.
 */
export async function logAiUsage(entry: {
  userId: string;
  kind: AiUsageKind;
  model: string;
  status: "success" | "error";
  tokens?: AiUsageTokens;
}): Promise<void> {
  try {
    await db.insert(schema.aiUsage).values({
      userId: entry.userId,
      kind: entry.kind,
      model: entry.model,
      status: entry.status,
      inputTokens: entry.tokens?.inputTokens ?? null,
      outputTokens: entry.tokens?.outputTokens ?? null,
    });
  } catch (error) {
    console.error("logAiUsage : échec de l'enregistrement", error);
  }
}
