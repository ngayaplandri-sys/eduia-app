"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/data/user";
import { deleteUserDocument, renameUserDocument } from "@/lib/data/documents";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Renomme un document de la bibliothèque de l'élève connecté. */
export async function renameDocument(id: string, name: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user || !UUID.test(id) || typeof name !== "string") return { ok: false };
  const ok = await renameUserDocument(user.id, id, name);
  if (ok) revalidatePath("/documents");
  return { ok };
}

/** Supprime un document (et ses fichiers d'origine) de la bibliothèque de l'élève connecté. */
export async function deleteDocument(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user || !UUID.test(id)) return { ok: false };
  const ok = await deleteUserDocument(user.id, id);
  if (ok) {
    revalidatePath("/documents");
    revalidatePath("/dashboard");
  }
  return { ok };
}
