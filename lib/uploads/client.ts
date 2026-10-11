import { upload } from "@vercel/blob/client";
import { authClient } from "@/lib/auth-client";
import {
  BLOB_FIELD_SUFFIX,
  DIRECT_UPLOAD_LIMIT_BYTES,
  tempUploadPath,
  type UploadRef,
} from "./shared";

/** Échec du dépôt d'un fichier dans le stockage (réseau, session expirée…). */
export class UploadFailedError extends Error {}

/**
 * Construit le corps `multipart/form-data` d'une route IA : `payload` (JSON) +
 * les fichiers de chaque champ (`files`, `examFiles`, `copyFiles`…).
 *
 * Jusqu'à 4 Mo au total, les fichiers partent dans la requête. Au-delà (limite
 * Vercel de 4,5 Mo par requête), ils sont d'abord déposés dans le stockage
 * privé via `/api/uploads`, et seules leurs références (`<champ>Blob`) sont
 * envoyées ; la route les relit côté serveur puis les efface. `signal`
 * interrompt l'envoi (délai maximal de la génération dépassé).
 */
export async function buildUploadForm(
  payload: unknown,
  groups: Record<string, File[]>,
  signal?: AbortSignal,
): Promise<FormData> {
  const body = new FormData();
  body.append("payload", JSON.stringify(payload));

  const totalBytes = Object.values(groups)
    .flat()
    .reduce((sum, file) => sum + file.size, 0);

  if (totalBytes <= DIRECT_UPLOAD_LIMIT_BYTES) {
    for (const [field, files] of Object.entries(groups)) {
      for (const file of files) body.append(field, file, file.name);
    }
    return body;
  }

  let userId: string | undefined;
  try {
    userId = (await authClient.getSession()).data?.user.id;
  } catch {
    userId = undefined;
  }
  if (!userId) throw new UploadFailedError("session introuvable");

  for (const [field, files] of Object.entries(groups)) {
    for (const file of files) {
      const pathname = tempUploadPath(userId, crypto.randomUUID(), file.name);
      try {
        await upload(pathname, file, {
          access: "private",
          handleUploadUrl: "/api/uploads",
          contentType: file.type || undefined,
          multipart: file.size > 8 * 1024 * 1024,
          abortSignal: signal,
        });
      } catch (error) {
        throw new UploadFailedError((error as Error)?.message ?? "envoi impossible");
      }
      const ref: UploadRef = { pathname, name: file.name, type: file.type };
      body.append(`${field}${BLOB_FIELD_SUFFIX}`, JSON.stringify(ref));
    }
  }
  return body;
}
