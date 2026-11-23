import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const AI_USAGE_RESET_KEY = "ai_usage_reset";

/**
 * Date de la dernière remise à zéro des compteurs de `/admin/ai`, ou `null`
 * s'il n'y en a jamais eu. Les compteurs ne comptent que les appels suivants ;
 * le journal `ai_usage` n'est jamais effacé (plafonds du jour, statistiques des
 * élèves et historique continuent de s'en servir).
 */
export async function getAiUsageResetAt(executor: DbExecutor = db): Promise<Date | null> {
  const [row] = await executor
    .select({ value: schema.adminSettings.value })
    .from(schema.adminSettings)
    .where(eq(schema.adminSettings.key, AI_USAGE_RESET_KEY))
    .limit(1);
  const at = (row?.value as { at?: unknown } | undefined)?.at;
  if (typeof at !== "string") return null;
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Remet les compteurs de `/admin/ai` à zéro maintenant. */
export async function resetAiUsageCountersNow(adminId: string): Promise<Date> {
  const at = new Date();
  const value = { at: at.toISOString(), by: adminId };
  await db
    .insert(schema.adminSettings)
    .values({ key: AI_USAGE_RESET_KEY, value })
    .onConflictDoUpdate({
      target: schema.adminSettings.key,
      set: { value, updatedAt: at },
    });
  return at;
}
