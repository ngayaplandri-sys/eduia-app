import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { ActivityRow } from "@/lib/db/schema";
import type {
  ActivityFileKind,
  ActivityItem,
  ActivityStatus,
  ActivityType,
} from "@/types";
import { getCurrentUser } from "./user";

/** Ligne `activities` (Neon) → objet consommé par l'UI. */
function toActivityItem(row: ActivityRow): ActivityItem {
  return {
    id: row.id,
    title: row.title,
    meta: row.meta,
    fileKind: row.fileKind as ActivityFileKind,
    type: row.type as ActivityType,
    date: row.occurredAt.toISOString(),
    status: {
      label: row.statusLabel,
      tone: row.statusTone as ActivityStatus["tone"],
    },
    action: { label: row.actionLabel, href: row.actionHref },
  };
}

/**
 * Dernières activités de l'utilisateur connecté (résumés, épreuves, corrections),
 * triées par date décroissante. Tableau vide si personne n'est connecté ou si le
 * compte n'a encore rien généré.
 */
export async function getRecentActivity(limit = 3): Promise<ActivityItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await db
    .select()
    .from(schema.activities)
    .where(eq(schema.activities.userId, user.id))
    .orderBy(desc(schema.activities.occurredAt))
    .limit(limit);

  return rows.map(toActivityItem);
}

/** Journal complet des activités de l'utilisateur connecté (page « Historique »). */
export async function getActivityHistory(): Promise<ActivityItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await db
    .select()
    .from(schema.activities)
    .where(eq(schema.activities.userId, user.id))
    .orderBy(desc(schema.activities.occurredAt));

  return rows.map(toActivityItem);
}
