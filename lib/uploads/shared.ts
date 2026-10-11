/**
 * Envoi des fichiers importés (cours, épreuves, copies) — partagé navigateur /
 * serveur.
 *
 * Une fonction Vercel refuse tout corps de requête de plus de 4,5 Mo (erreur
 * 413 `FUNCTION_PAYLOAD_TOO_LARGE`, avant même d'atteindre l'app). Au-delà de
 * `DIRECT_UPLOAD_LIMIT_BYTES` au total, le navigateur dépose donc les fichiers
 * dans le stockage privé (Vercel Blob, dossier `tmp/<userId>/…`) et n'envoie à
 * la route IA que leurs références ; en dessous, ils partent directement dans
 * la requête comme avant.
 */

/** Seuil de l'envoi direct : marge sous les 4,5 Mo de Vercel (JSON + en-têtes multipart). */
export const DIRECT_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024;

/** Suffixe du champ de formulaire qui porte les références de fichiers déposés dans le stockage. */
export const BLOB_FIELD_SUFFIX = "Blob";

/** Types acceptés pour un dépôt dans le stockage (le contenu réel est revérifié côté serveur). */
export const UPLOAD_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/octet-stream",
];

/** Référence d'un fichier déposé dans le stockage, envoyée à la route IA. */
export interface UploadRef {
  pathname: string;
  name: string;
  type: string;
}

/**
 * Nom de fichier sûr pour le stockage : ASCII minuscule, sans espace (le SDK
 * Blob refuse les liens signés sur des chemins accentués). Le nom d'origine est
 * conservé à part pour l'affichage.
 */
export function storageFileName(name: string, fallback = "fichier"): string {
  const clean = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const dot = name.lastIndexOf(".");
  const base = clean(dot > 0 ? name.slice(0, dot) : name).slice(0, 80) || fallback;
  const extension = dot > 0 ? clean(name.slice(dot + 1)).slice(0, 8) : "";
  return extension ? `${base}.${extension}` : base;
}

/** Chemin temporaire d'un fichier déposé par l'élève `userId`. */
export function tempUploadPath(userId: string, id: string, name: string): string {
  return `tmp/${userId}/${id}/${storageFileName(name)}`;
}

const TEMP_PATH = /^tmp\/([A-Za-z0-9_-]{1,64})\/([0-9a-f-]{36})\/([a-z0-9.-]{1,100})$/;

/** `true` si `pathname` est un dépôt temporaire appartenant à `userId`. */
export function isTempUploadPathOf(pathname: string, userId: string): boolean {
  const match = TEMP_PATH.exec(pathname);
  return Boolean(match) && match?.[1] === userId;
}
