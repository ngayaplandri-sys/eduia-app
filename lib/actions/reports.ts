"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/data/user";
import { getDictionary } from "@/lib/i18n/server";

const REPORT_TYPES = ["bug", "suggestion", "question", "autre"] as const;
const REPORT_STATUSES = ["new", "in_progress", "resolved"] as const;

const submitSchema = z.object({
  type: z.enum(REPORT_TYPES),
  description: z.string().trim().min(10).max(2000),
});

export type SubmitReportResult = { ok: true } | { ok: false; error: string };

/** Signalement envoyé par un élève depuis `/aide`. */
export async function submitReport(input: unknown): Promise<SubmitReportResult> {
  const [user, dict] = await Promise.all([requireUser(), getDictionary()]);
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: dict.aide.reportTooShort };
  }

  try {
    await db.insert(schema.reports).values({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      type: parsed.data.type,
      description: parsed.data.description,
    });
  } catch (error) {
    console.error("submitReport : échec de l'insertion", error);
    return { ok: false, error: dict.aide.reportSendFailed };
  }

  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(REPORT_STATUSES),
  note: z.string().trim().max(2000).optional(),
});

export type UpdateReportResult = { ok: true } | { ok: false; error: string };

/** Mise à jour du statut / de la note d'un signalement (admin uniquement). */
export async function updateReportStatus(
  input: unknown,
): Promise<UpdateReportResult> {
  await requireAdmin();

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Requête invalide." };
  }

  try {
    await db
      .update(schema.reports)
      .set({
        status: parsed.data.status,
        adminNote: parsed.data.note?.trim() ? parsed.data.note.trim() : null,
        updatedAt: new Date(),
      })
      .where(eq(schema.reports.id, parsed.data.id));
  } catch (error) {
    console.error("updateReportStatus : échec de la mise à jour", error);
    return { ok: false, error: "La mise à jour a échoué." };
  }

  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  return { ok: true };
}
