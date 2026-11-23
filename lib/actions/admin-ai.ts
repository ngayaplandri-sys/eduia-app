"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/user";
import { resetAiUsageCountersNow } from "@/lib/data/admin-settings";

export type ResetAiUsageResult = { ok: true; at: string } | { ok: false; error: string };

/**
 * Remise à zéro des compteurs de `/admin/ai` (admin uniquement) : ils ne
 * comptent plus que les appels suivants. Rien n'est effacé du journal.
 */
export async function resetAiUsageCounters(): Promise<ResetAiUsageResult> {
  const admin = await requireAdmin();
  try {
    const at = await resetAiUsageCountersNow(admin.id);
    revalidatePath("/admin/ai");
    revalidatePath("/admin");
    return { ok: true, at: at.toISOString() };
  } catch (error) {
    console.error("resetAiUsageCounters : échec", error);
    return { ok: false, error: "La remise à zéro a échoué. Réessaie." };
  }
}
