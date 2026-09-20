import "server-only";
import { desc, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { DEMO_EMAIL } from "@/lib/admin/constants";

export interface RecentMember {
  id: string;
  name: string;
  avatarUrl: string | null;
}

const MAX_AVATARS = 5;

/**
 * Derniers membres réels inscrits (hors compte de démonstration, voir
 * `DEMO_EMAIL`) — alimente la bande de réassurance de la landing avec de
 * vrais avatars, jamais des utilisateurs fictifs. Seuls `name` (pour les
 * initiales de repli) et `image` sont exposés publiquement, rien d'autre.
 *
 * Page publique : une base momentanément indisponible ne doit jamais casser
 * la landing (même garde que `getCurrentUser()` dans `app/page.tsx`) — la
 * bande de réassurance s'affiche alors sans avatars plutôt que de planter.
 */
export async function getRecentMembers(): Promise<RecentMember[]> {
  try {
    const rows = await db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        image: schema.user.image,
      })
      .from(schema.user)
      .where(ne(schema.user.email, DEMO_EMAIL))
      .orderBy(desc(schema.user.createdAt))
      .limit(MAX_AVATARS);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      avatarUrl: row.image,
    }));
  } catch (error) {
    console.error("[social-proof] échec de la lecture des membres récents :", error);
    return [];
  }
}
