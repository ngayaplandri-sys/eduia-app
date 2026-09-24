import "server-only";
import mammoth from "mammoth";
import { AIGenerationError } from "./errors";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * Extraction du contenu texte des documents importés, **côté serveur**, pour
 * « Résumer mes cours » :
 *  - PDF  → transmis tel quel à OpenAI (`input_file`), pas d'extraction ici ;
 *  - DOCX → `mammoth.extractRawText` ;
 *  - TXT / image → déjà extraits avant l'envoi (lecture directe / photo
 *    transcrite par le modèle de vision, voir `lib/ai/ocr.ts`).
 */

/** Taille maximale d'un fichier importé (PDF ou Word). */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Nombre maximum de fichiers/pages importables en une seule génération. */
export const MAX_UPLOAD_FILES = 5;

/** Type de fichier nécessitant un traitement serveur. */
export type ServerUploadKind = "pdf" | "docx";

/** Déduit `pdf` / `docx` / `null` du type MIME et de l'extension. */
export function detectServerUploadKind(file: File): ServerUploadKind | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    type.includes("wordprocessingml") ||
    type === "application/msword" ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    return "docx";
  }
  return null;
}

/**
 * Vérifie la signature binaire réelle du fichier (« magic bytes »), en plus du
 * type MIME / de l'extension déjà utilisés par `detectServerUploadKind` — ces
 * deux derniers sont entièrement déclarés par le client et donc usurpables
 * (un `.exe` renommé en `.pdf` passerait sinon le contrôle précédent).
 * Un `.doc` binaire (ancien format OLE, pré-2007) échouera ici comme il
 * échouerait de toute façon à l'extraction `mammoth` juste après — même
 * résultat pour l'utilisateur, juste un message plus rapide.
 */
export function matchesMagicBytes(
  bytes: Buffer,
  kind: ServerUploadKind,
): boolean {
  if (kind === "pdf") {
    return bytes.subarray(0, 5).toString("latin1") === "%PDF-";
  }
  // .docx : archive ZIP (signature locale de fichier "PK\x03\x04").
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

/**
 * Texte brut d'un `.docx`. Lève une `AIGenerationError` explicite si le fichier
 * est illisible (ancien format `.doc`, corrompu) ou sans texte exploitable.
 */
export async function extractDocxText(
  bytes: Buffer,
  fileName: string,
  dict: Dictionary,
): Promise<string> {
  let raw = "";
  try {
    const result = await mammoth.extractRawText({ buffer: bytes });
    raw = result.value ?? "";
  } catch {
    throw new AIGenerationError(dict.resumer.docxUnreadable(fileName), 422);
  }

  const text = raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.replace(/\s/g, "").length < 20) {
    throw new AIGenerationError(dict.resumer.docxEmpty(fileName), 422);
  }

  return text;
}

/**
 * Estimation best-effort du nombre de pages d'un PDF (compte les objets
 * `/Type /Page`). Renvoie `0` si le format ne permet pas de conclure — la valeur
 * n'est qu'indicative dans l'interface.
 */
export function estimatePdfPageCount(bytes: Buffer): number {
  const head = bytes.toString("latin1");
  const matches = head.match(/\/Type\s*\/Page(?![s])/g);
  return matches ? matches.length : 0;
}

/**
 * Repère de page inséré avant chaque fichier importé dont le texte est déjà
 * extrait (« [Page 2 — photo.jpg] », « [Pièce jointe — cours.docx] »).
 */
const PAGE_MARKER = /^\[[^\]\n]+ — [^\]\n]+\]$/gm;

/**
 * Nombre de pages approximatif d'un contenu texte (≈ 2500 caractères / page),
 * jamais inférieur au nombre de fichiers importés : une photo de cahier est une
 * page entière même si elle contient peu de texte.
 */
export function estimatePageCountFromText(text: string): number {
  const importedFiles = text.match(PAGE_MARKER)?.length ?? 0;
  return Math.max(1, importedFiles, Math.round(text.length / 2500));
}
