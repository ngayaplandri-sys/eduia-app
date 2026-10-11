import "server-only";
import {
  del,
  get,
  issueSignedToken,
  list,
  presignUrl,
  put,
} from "@vercel/blob";
import { MAX_UPLOAD_BYTES } from "@/lib/ai/extract";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  BLOB_FIELD_SUFFIX,
  isTempUploadPathOf,
  type UploadRef,
} from "./shared";

/**
 * Côté serveur du stockage privé (Vercel Blob, voir `./shared.ts`) : lecture
 * des fichiers déposés par le navigateur, conservation des fichiers d'origine
 * de la bibliothèque, liens de téléchargement signés et ménage des dépôts
 * temporaires.
 */

/** Nombre maximum de références acceptées dans une même requête. */
const MAX_REFS = 15;

/** Un dépôt temporaire plus ancien que ce délai est considéré comme abandonné. */
const TEMP_TTL_MS = 6 * 60 * 60 * 1000;

/** Référence de fichier invalide, ou appartenant à un autre compte. */
export class UploadRefError extends Error {}

/** `true` si le stockage est configuré (variable posée par Vercel en reliant le store). */
export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function parseRef(raw: FormDataEntryValue): UploadRef {
  if (typeof raw !== "string") throw new UploadRefError("référence illisible");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new UploadRefError("référence illisible");
  }
  const ref = value as Partial<UploadRef> | null;
  if (
    !ref ||
    typeof ref.pathname !== "string" ||
    typeof ref.name !== "string" ||
    typeof ref.type !== "string"
  ) {
    throw new UploadRefError("référence incomplète");
  }
  return { pathname: ref.pathname, name: ref.name.slice(0, 200), type: ref.type.slice(0, 120) };
}

async function readPrivateBlob(pathname: string): Promise<{ bytes: Buffer; contentType: string }> {
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) throw new UploadRefError("fichier introuvable");
  if (result.blob.size > MAX_UPLOAD_BYTES) throw new UploadRefError("fichier trop volumineux");
  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  return { bytes, contentType: result.blob.contentType };
}

/**
 * Fichiers d'un champ du formulaire (`files`, `examFiles`…), qu'ils soient
 * arrivés dans la requête ou déposés dans le stockage (`<champ>Blob`). Une
 * référence n'est acceptée que si elle pointe vers un dépôt temporaire de
 * l'élève connecté. `tempPathnames` liste les dépôts à effacer une fois la
 * requête traitée.
 */
export async function collectUploadedFiles(
  form: FormData,
  field: string,
  userId: string,
): Promise<{ files: File[]; tempPathnames: string[] }> {
  const files = form
    .getAll(field)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const refs = form.getAll(`${field}${BLOB_FIELD_SUFFIX}`).map(parseRef);
  if (refs.length > MAX_REFS) throw new UploadRefError("trop de fichiers");
  for (const ref of refs) {
    if (!isTempUploadPathOf(ref.pathname, userId)) {
      throw new UploadRefError("fichier d'un autre compte");
    }
  }

  const tempPathnames = refs.map((ref) => ref.pathname);
  for (const ref of refs) {
    const { bytes, contentType } = await readPrivateBlob(ref.pathname);
    files.push(new File([new Uint8Array(bytes)], ref.name, { type: ref.type || contentType }));
  }
  return { files, tempPathnames };
}

/** Réponse d'erreur adaptée à un échec de `collectUploadedFiles`. */
export function describeUploadIntakeError(
  error: unknown,
  dict: Dictionary,
): { status: number; error: string } {
  if (error instanceof UploadRefError) return { status: 400, error: dict.ai.invalidRequest };
  console.error("[uploads] lecture d'un fichier déposé impossible :", (error as Error)?.message);
  return { status: 502, error: dict.ai.uploadFailed };
}

/** Efface des fichiers du stockage ; ne lève jamais (ménage en tâche de fond). */
export async function deleteStoredFiles(pathnames: string[]): Promise<void> {
  if (pathnames.length === 0 || !isBlobConfigured()) return;
  try {
    await del(pathnames);
  } catch (error) {
    console.error("[uploads] suppression impossible :", (error as Error)?.message);
  }
}

/** Dépose un fichier dans le stockage privé, au chemin exact donné. */
export async function putPrivateFile(
  pathname: string,
  bytes: Buffer,
  contentType: string,
): Promise<void> {
  await put(pathname, bytes, {
    access: "private",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

/**
 * Lien de téléchargement d'un fichier privé, valable 60 secondes : le
 * navigateur télécharge directement depuis le stockage (pas de limite de
 * taille de réponse de la fonction), sans que le chemin permanent ne suffise
 * à y accéder ensuite. `download=1` force l'enregistrement du fichier
 * (sinon un PDF s'ouvrirait dans l'onglet).
 */
export async function presignedDownloadUrl(pathname: string): Promise<string> {
  const validUntil = Date.now() + 60_000;
  const signedToken = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const { presignedUrl } = await presignUrl(signedToken, {
    operation: "get",
    pathname,
    access: "private",
    validUntil,
  });
  return `${presignedUrl}${presignedUrl.includes("?") ? "&" : "?"}download=1`;
}

/**
 * Efface les dépôts temporaires abandonnés (envoyés par le navigateur mais
 * jamais consommés par une route IA : onglet fermé, coupure réseau…).
 */
export async function purgeStaleTempUploads(): Promise<{ deleted: number }> {
  if (!isBlobConfigured()) return { deleted: 0 };
  const cutoff = Date.now() - TEMP_TTL_MS;
  let cursor: string | undefined;
  let deleted = 0;
  do {
    const page = await list({ prefix: "tmp/", cursor, limit: 1000 });
    const stale = page.blobs
      .filter((blob) => new Date(blob.uploadedAt).getTime() < cutoff)
      .map((blob) => blob.pathname);
    if (stale.length > 0) {
      await del(stale);
      deleted += stale.length;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return { deleted };
}
