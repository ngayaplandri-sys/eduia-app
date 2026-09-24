import "server-only";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, OPENAI_MODEL } from "./openai-client";
import { AIGenerationError } from "./errors";
import { readUsage } from "./generate";
import { aiImageTranscriptionSchema, type AIImageTranscription } from "./schemas";
import type { AiUsageTokens } from "./usage";

/**
 * Transcription d'une photo de cours (cahier manuscrit, feuille imprimée,
 * capture d'écran) par le modèle de vision OpenAI déjà utilisé pour les
 * générations. Remplace l'ancien OCR Tesseract.js côté navigateur, conçu pour
 * du texte imprimé : sur une écriture manuscrite il renvoyait une confiance
 * trop faible et la photo était ignorée.
 */

/** Formats d'image acceptés, identifiés par leur signature binaire réelle. */
export type CourseImageMime = "image/jpeg" | "image/png" | "image/webp";

export function detectImageMime(bytes: Buffer): CourseImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
    bytes.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

const TRANSCRIPTION_INSTRUCTIONS =
  "Tu es un moteur de transcription (OCR) spécialisé dans les cours scolaires : cahiers manuscrits, feuilles imprimées, tableaux photographiés, captures d'écran. " +
  "Transcris INTÉGRALEMENT et FIDÈLEMENT tout le texte du cours visible sur l'image, qu'il soit manuscrit ou imprimé, dans sa langue d'origine et dans l'ordre naturel de lecture. " +
  "Ne résume pas, ne reformule pas, ne corrige pas les fautes, n'ajoute rien qui ne soit pas écrit. " +
  "Conserve la structure : titres, sous-titres, numérotation, listes à puces, retours à la ligne entre paragraphes. " +
  "Écris les formules et symboles mathématiques ou scientifiques en texte lisible (ex. f'(x) = 2x + 1, x², √2, H₂O, a/b). " +
  "Décris un schéma ou un tableau en une ligne entre crochets (ex. [Schéma : le cycle de l'eau]) et transcris le texte qu'il contient. " +
  "Si un mot ou un passage précis est illisible, remplace-le par [illisible] au lieu de le deviner. " +
  "Ignore ce qui ne fait pas partie du cours : doigts, arrière-plan, reliure, lignes et carreaux du papier. " +
  "Évalue honnêtement la lisibilité : quality « unreadable » seulement si presque rien n'est déchiffrable (photo trop floue, trop sombre, reflet, cadrage coupé) ou s'il n'y a pas de texte de cours ; « partial » si une part notable est illisible ; sinon « good ».";

export interface ImageTranscriptionResult {
  transcription: AIImageTranscription;
  usage: AiUsageTokens;
}

export async function transcribeCourseImage(
  bytes: Buffer,
  mime: CourseImageMime,
): Promise<ImageTranscriptionResult> {
  const response = await getOpenAIClient().responses.parse({
    model: OPENAI_MODEL,
    instructions: TRANSCRIPTION_INSTRUCTIONS,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Transcris le texte du cours visible sur cette photo.",
          },
          {
            type: "input_image",
            image_url: `data:${mime};base64,${bytes.toString("base64")}`,
            // `high` : l'écriture manuscrite a besoin de la pleine résolution.
            detail: "high",
          },
        ],
      },
    ],
    max_output_tokens: 8000,
    text: { format: zodTextFormat(aiImageTranscriptionSchema, "image_transcription") },
  });

  if (!response.output_parsed) {
    throw new AIGenerationError("", 502, "apiError");
  }

  const transcription = response.output_parsed;
  return {
    transcription: {
      ...transcription,
      text: transcription.text
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    },
    usage: readUsage(response),
  };
}
