import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInput } from "openai/resources/responses/responses";
import { getOpenAIClient, OPENAI_MODEL } from "./openai-client";
import { AIGenerationError } from "./errors";
import { readUsage } from "./generate";
import { aiVoiceTutorAnswerSchema, type VoiceTutorRequest } from "./schemas";
import type { AiUsageTokens } from "./usage";
import {
  VOICE_TUTOR_MAX_SPEECH_CHARS,
  VOICE_TUTOR_WELCOME,
  voiceTutorLanguage,
  type VoiceTutorLanguage,
} from "@/lib/config/voice-tutor";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * « Professeur vocal » : les trois appels OpenAI d'une question orale, avec la
 * même clé et le même client que les autres outils (`getOpenAIClient`).
 *  1. reconnaissance vocale (question enregistrée → texte) ;
 *  2. réponse du professeur, ancrée sur le texte du PDF importé ;
 *  3. synthèse vocale de la réponse.
 */

/** Modèles audio, ajustables sans changer le code. */
const TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "gpt-4o-mini-transcribe";
const TTS_MODEL = process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.OPENAI_TTS_VOICE?.trim() || "marin";

/**
 * Texte du cours réellement placé dans le prompt (environ 15 000 jetons). Au-
 * delà, on garde la page affichée, ses voisines et les pages qui partagent des
 * mots avec la question.
 */
const MAX_PROMPT_DOCUMENT_CHARS = 60_000;

// ───────────────────────────── 1. Reconnaissance vocale ─────────────────────────────

const AUDIO_EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/aac": "m4a",
  "audio/x-m4a": "m4a",
};

/** Extension reconnue par l'API à partir du type MIME envoyé par le navigateur. */
export function audioExtension(mime: string): string | null {
  return AUDIO_EXTENSIONS[mime.split(";")[0].trim().toLowerCase()] ?? null;
}

/**
 * Phrases que les modèles de transcription « inventent » sur un silence ou un
 * bruit de fond (génériques de sous-titres) : traitées comme une question vide.
 */
const SILENCE_HALLUCINATIONS =
  /amara\.org|sous-titr|sottotitoli|subtítulos|untertitel|thanks for watching|thank you for watching|merci d'avoir regardé|abonnez-vous/i;

export async function transcribeQuestion(
  audio: Blob,
  extension: string,
  language: VoiceTutorLanguage,
): Promise<string> {
  const file = await toFile(audio, `question.${extension}`, { type: audio.type });
  const result = await getOpenAIClient().audio.transcriptions.create({
    file,
    model: TRANSCRIBE_MODEL,
    // L'élève parle au professeur dans la langue de réponse choisie : la
    // préciser améliore la justesse et la latence sur des phrases courtes.
    language,
  });
  const text = result.text.trim();
  if (text.length < 40 && SILENCE_HALLUCINATIONS.test(text)) return "";
  return text;
}

// ───────────────────────────── 2. Réponse du professeur ─────────────────────────────

function buildInstructions(
  documentLanguage: VoiceTutorLanguage,
  replyLanguage: VoiceTutorLanguage,
  schoolLevel: string | null,
): string {
  const doc = voiceTutorLanguage(documentLanguage).english;
  const reply = voiceTutorLanguage(replyLanguage).english;

  return [
    "Tu es le Professeur IA d'EduIA : un professeur particulier bienveillant qui discute À VOIX HAUTE avec un élève à propos de SON cours, un document PDF qu'il a importé et que tu reçois ci-dessous, page par page.",
    `LANGUE : le document est rédigé en ${doc}. Tu réponds TOUJOURS et UNIQUEMENT en ${reply}, quelle que soit la langue du document ou de la question. Explique et traduis les notions du document dans cette langue ; tu peux citer un terme original du document entre guillemets quand c'est utile pour le reconnaître.`,
    "ANCRAGE : quand la question porte sur le cours, appuie-toi EXCLUSIVEMENT sur le contenu du document fourni : n'ajoute aucune définition, donnée ou affirmation qui n'y figure pas. Si la réponse ne se trouve pas dans le document, dis-le simplement et honnêtement, puis propose une question proche à laquelle le cours répond. Pour une question sans rapport avec le cours (salutation, méthode de travail, encouragement), réponds normalement et brièvement.",
    "PAGES : chaque page du document est précédée d'un repère « === Page N === ». Quand tu t'appuies sur le document, mets les numéros de page utilisés dans le champ `pages` et mentionne-les naturellement dans ta réponse (par exemple « comme expliqué à la page 5 »). N'invente jamais un numéro de page.",
    "PÉDAGOGIE : explique une notion difficile avec des mots simples, donne un exemple concret quand c'est utile, résume une section quand on te le demande, explique un passage précis, et reformule autrement si l'élève dit ne pas comprendre. Garde le fil de la conversation : l'élève n'a pas à répéter ses questions précédentes.",
    schoolLevel
      ? `NIVEAU : l'élève est en « ${schoolLevel} » ; adapte ton vocabulaire et le niveau de détail.`
      : "NIVEAU : adapte ton vocabulaire à un élève du secondaire ou à un étudiant.",
    "ORAL : ta réponse sera lue à voix haute. Écris comme on parle : phrases courtes, ton chaleureux et encourageant, AUCUN Markdown (pas d'astérisques, de dièses, de tableaux ni de listes à puces avec symboles), aucun emoji. Écris les formules de façon prononçable (par exemple « x au carré » plutôt que « x² »). Pour énumérer des étapes, dis « d'abord », « ensuite », « enfin ».",
    "LONGUEUR : par défaut 2 à 6 phrases. Va plus loin (sans dépasser environ 250 mots) seulement si l'élève demande un résumé ou une explication détaillée. Tu peux terminer par une courte question pour vérifier la compréhension, sans le faire à chaque fois.",
    "La question vient parfois d'une reconnaissance vocale : si elle paraît incomplète ou incompréhensible, demande gentiment à l'élève de la reformuler.",
  ].join("\n\n");
}

const WORD_PATTERN = /[\p{L}\p{N}]{4,}/gu;

function keywords(text: string): Set<string> {
  const normalized = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  return new Set(normalized.match(WORD_PATTERN) ?? []);
}

/**
 * Pages placées dans le prompt. Cours court : toutes. Cours long : la page
 * affichée et ses voisines d'abord, puis les pages qui partagent le plus de
 * mots avec la question, jusqu'au budget — remises dans l'ordre du cours.
 */
function selectPages(
  pages: VoiceTutorRequest["pages"],
  question: string,
  currentPage: number,
): { selected: VoiceTutorRequest["pages"]; partial: boolean } {
  const total = pages.reduce((sum, page) => sum + page.text.length, 0);
  if (total <= MAX_PROMPT_DOCUMENT_CHARS) return { selected: pages, partial: false };

  const questionWords = keywords(question);
  const scored = pages.map((page) => {
    const distance = Math.abs(page.page - currentPage);
    let score = distance === 0 ? 1000 : distance === 1 ? 500 : 0;
    if (questionWords.size > 0) {
      for (const word of keywords(page.text)) if (questionWords.has(word)) score += 10;
    }
    // À score égal, la page la plus proche de celle affichée passe d'abord.
    return { page, score: score - distance / 1000 };
  });
  scored.sort((a, b) => b.score - a.score);

  const selected: VoiceTutorRequest["pages"] = [];
  let used = 0;
  for (const { page } of scored) {
    if (used + page.text.length > MAX_PROMPT_DOCUMENT_CHARS) continue;
    selected.push(page);
    used += page.text.length;
  }
  selected.sort((a, b) => a.page - b.page);
  return { selected, partial: true };
}

function buildDocumentMessage(
  request: VoiceTutorRequest,
  selected: VoiceTutorRequest["pages"],
  partial: boolean,
): string {
  const header = [
    `Document de l'élève : « ${request.documentName} » (${request.pageCount} page${request.pageCount > 1 ? "s" : ""}).`,
    partial
      ? `Le cours est long : seules les pages ${selected.map((page) => page.page).join(", ")} sont jointes ci-dessous. Si la réponse se trouve sans doute ailleurs, invite l'élève à afficher la page concernée et à reposer sa question.`
      : "Le cours complet est joint ci-dessous.",
  ];
  const body = selected
    .filter((page) => page.text.trim())
    .map((page) => `=== Page ${page.page} ===\n${page.text.trim()}`);
  return [...header, "", ...body].join("\n");
}

/** Retire les marques Markdown qui seraient lues telles quelles à voix haute. */
function toSpokenText(text: string): string {
  return text
    .replace(/\*\*|__|`/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .trim();
}

export async function askVoiceTutor(
  request: VoiceTutorRequest,
  question: string,
  schoolLevel: string | null,
  dict: Dictionary,
): Promise<{ answer: string; pages: number[]; usage: AiUsageTokens }> {
  const { selected, partial } = selectPages(request.pages, question, request.currentPage);

  // Ordre pensé pour la mise en cache automatique des prompts côté OpenAI :
  // consignes et document (identiques d'une question à l'autre) d'abord, la
  // partie qui change (historique, page affichée, question) ensuite.
  const input: ResponseInput = [
    { role: "user", content: buildDocumentMessage(request, selected, partial) },
    {
      role: "assistant",
      content: "J'ai lu le document. Je suis prêt à répondre aux questions de l'élève.",
    },
    ...request.history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    {
      role: "user",
      content: `[L'élève regarde actuellement la page ${request.currentPage} : « cette page », « ce passage » ou « ici » y renvoient.]\n\n${question}`,
    },
  ];

  const response = await getOpenAIClient().responses.parse({
    model: OPENAI_MODEL,
    instructions: buildInstructions(
      request.documentLanguage,
      request.replyLanguage,
      schoolLevel,
    ),
    input,
    reasoning: { effort: "low" },
    max_output_tokens: 2500,
    text: { format: zodTextFormat(aiVoiceTutorAnswerSchema, "voice_tutor_answer") },
  });

  const parsed = response.output_parsed;
  const answer = parsed ? toSpokenText(parsed.answer) : "";
  if (!parsed || !answer) {
    throw new AIGenerationError(dict.ai.noOutput(dict.voiceTutor.teacherName), 502);
  }

  const available = new Set(selected.map((page) => page.page));
  const pages = [...new Set(parsed.pages)]
    .filter((page) => available.has(page))
    .sort((a, b) => a - b)
    .slice(0, 6);

  return { answer, pages, usage: readUsage(response) };
}

// ───────────────────────────── 3. Synthèse vocale ─────────────────────────────

export async function synthesizeSpeech(
  text: string,
  language: VoiceTutorLanguage,
): Promise<ArrayBuffer> {
  const languageName = voiceTutorLanguage(language).english;
  const speech = await getOpenAIClient().audio.speech.create({
    model: TTS_MODEL,
    voice: TTS_VOICE,
    input: text.slice(0, VOICE_TUTOR_MAX_SPEECH_CHARS),
    response_format: "mp3",
    // Seuls les modèles « gpt-4o-*-tts » acceptent des consignes de diction.
    ...(TTS_MODEL.startsWith("gpt-")
      ? {
          instructions: `Speak in ${languageName}, as a warm, patient teacher explaining a lesson to a student: clear articulation, calm and moderate pace, natural and encouraging intonation.`,
        }
      : {}),
  });
  return speech.arrayBuffer();
}

/**
 * Jeton de synthèse vocale : la route `speech` ne prononce que des textes
 * produits par le professeur pour CE compte (ou le message d'accueil fixe),
 * jamais un texte arbitraire — sinon elle servirait de synthèse vocale
 * gratuite. Signature HMAC avec le secret de session déjà configuré.
 */
function speechSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new AIGenerationError("BETTER_AUTH_SECRET manquant côté serveur.", 500);
  }
  return secret;
}

export function signSpeechText(userId: string, text: string): string {
  return createHmac("sha256", speechSecret())
    .update(`voice-tutor-speech:${userId}:${text}`)
    .digest("base64url");
}

export function isSpeakableText(
  userId: string,
  text: string,
  token: string | undefined,
): boolean {
  if (Object.values(VOICE_TUTOR_WELCOME).includes(text)) return true;
  if (!token) return false;
  const expected = Buffer.from(signSpeechText(userId, text));
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
