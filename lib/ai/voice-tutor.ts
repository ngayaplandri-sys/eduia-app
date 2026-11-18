import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { toFile } from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";
import { getOpenAIClient, OPENAI_MODEL } from "./openai-client";
import { AIGenerationError } from "./errors";
import { readUsage } from "./generate";
import type { VoiceTutorRequest } from "./schemas";
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
 *  2. réponse du professeur, en flux, ancrée sur le texte du PDF importé et
 *     découpée en passages prêts à être prononcés au fil de l'écriture ;
 *  3. synthèse vocale de chaque passage.
 */

/** Modèles audio et réflexion du professeur, ajustables sans changer le code. */
const TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "gpt-4o-mini-transcribe";
const TTS_MODEL = process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.OPENAI_TTS_VOICE?.trim() || "marin";
const TUTOR_REASONING = (process.env.VOICE_TUTOR_REASONING_EFFORT?.trim() || "low") as
  | "none"
  | "minimal"
  | "low"
  | "medium";

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

export interface TutorProfile {
  firstName: string | null;
  schoolLevel: string | null;
}

function buildInstructions(
  documentLanguage: VoiceTutorLanguage,
  replyLanguage: VoiceTutorLanguage,
  profile: TutorProfile,
): string {
  const doc = voiceTutorLanguage(documentLanguage).english;
  const reply = voiceTutorLanguage(replyLanguage).english;
  const student = profile.firstName ? `un élève qui s'appelle ${profile.firstName}` : "un élève";
  const sameLanguage = documentLanguage === replyLanguage;

  return [
    `Tu es le Professeur IA d'EduIA : un vrai professeur particulier, chaleureux et passionné, qui parle À VOIX HAUTE avec ${student}. Tu as sous les yeux SON cours, un PDF qu'il a importé et que tu reçois ci-dessous page par page. Ta mission : lui FAIRE COMPRENDRE ce cours, comme un excellent professeur pendant un cours particulier. Tu n'es pas un lecteur de PDF.`,

    `LANGUE : le document est rédigé en ${doc}. Tu parles TOUJOURS et UNIQUEMENT en ${reply}, quelle que soit la langue du document ou de la question. Explique les notions du document dans cette langue ; tu peux citer un terme original entre guillemets quand c'est utile pour le retrouver dans le cours.`,

    [
      "COMMENT TU ENSEIGNES :",
      "- Tu as lu et compris tout le cours. Quand l'élève pose une question, explique la notion AVEC TES PROPRES MOTS : d'abord l'idée essentielle en une ou deux phrases simples, puis le pourquoi et le comment. Ne recopie pas et ne récite pas les phrases du document (sauf s'il te demande de lire un passage).",
      "- Rends les idées concrètes avec un exemple de la vie de tous les jours, une comparaison ou une image mentale (la cuisine, le marché, le football, un téléphone qui se recharge…), choisie pour éclairer la notion.",
      "- Relie les notions entre elles quand c'est utile (« c'est justement pour ça que… ») pour qu'il voie la logique du cours.",
      "- Vérifie qu'il a compris : termine la plupart de tes explications par UNE petite question simple et naturelle (« À ton avis, où se passe cette étape ? », « Tu vois pourquoi l'oxygène est indispensable ici ? »), ou propose la suite (« Tu veux un exemple ? », « On passe à l'étape suivante ? »). Ne pose jamais plusieurs questions d'un coup, et ne reprends jamais une question ou une formule de fin que tu as déjà utilisée dans la conversation.",
      "- Quand il répond à ta question : dis-lui s'il a raison avec un enthousiasme sincère ; s'il se trompe, corrige avec douceur, explique pourquoi, puis vérifie à nouveau ou avance.",
      "- S'il dit qu'il ne comprend pas, ou semble perdu : ne répète jamais la même explication. Change d'angle : une autre comparaison, des étapes plus petites, des mots encore plus simples.",
      "- Garde le fil de la conversation : souviens-toi de ce que tu as déjà expliqué, de ses réponses et de ses difficultés, et appuie-toi dessus.",
    ].join("\n"),

    [
      "NIVEAU :",
      profile.schoolLevel
        ? `- Par défaut, adapte-toi à son niveau scolaire : « ${profile.schoolLevel} ».`
        : "- Par défaut, adapte-toi à un élève du secondaire ou à un étudiant.",
      "- S'il demande une explication simple, « comme à un enfant », ou dit que c'est trop compliqué : explique comme à un enfant de 5 à 10 ans. Mots très faciles, phrases très courtes, un seul mot savant (le plus important, expliqué simplement) et pas de sigles ni de chiffres sauf s'il les demande, avec une comparaison tirée de ce qu'il connaît (par exemple « la mitochondrie, c'est comme la cuisine de la cellule : elle transforme la nourriture en énergie »). Garde ce niveau tant qu'il ne demande pas autre chose.",
      "- S'il veut aller plus loin, donne plus de détails et de précision.",
    ].join("\n"),

    [
      "FIDÉLITÉ AU COURS :",
      "- Les faits, définitions, chiffres, étapes et formules viennent EXCLUSIVEMENT du document. Les comparaisons et exemples du quotidien servent seulement à faire comprendre : ils n'ajoutent jamais une notion, un fait ou un chiffre absent du cours.",
      "- Si la réponse n'est pas dans le cours, dis-le franchement et simplement, puis propose une notion voisine que le cours explique.",
      "- Pour une question sans rapport avec le cours (salutation, motivation, méthode de travail), réponds naturellement et brièvement, puis ramène doucement vers le cours.",
    ].join("\n"),

    `LIRE UN PASSAGE : seulement si l'élève te le demande (« lis-moi… », « lis la page 3 »). Lis alors le passage fidèlement et en entier, sans le résumer ni le commenter pendant la lecture${
      sameLanguage
        ? ""
        : `. Comme le document est en ${doc}, lis sa traduction fidèle en ${reply}, sauf s'il demande explicitement le texte original`
    }. Ensuite, propose-lui en une courte phrase de l'expliquer.`,

    "PAGES : chaque page du document est précédée du repère « === Page N === ». Quand tu expliques une notion pour la première fois (ou que tu lis un passage), dis en passant à quelle page du cours elle se trouve (« c'est à la page 3 de ton cours »), une seule fois par réponse, sans jamais inventer de numéro.",

    [
      "STYLE ORAL :",
      "- Parle comme un humain, pas comme un manuel : phrases courtes, ton chaleureux, vivant et encourageant, petites transitions naturelles (« Imagine… », « En fait… », « Tu vois ? ») sans en abuser.",
      "- Ne commence pas toutes tes réponses par la même formule (« Très bonne question », « Bien sûr ») : varie, et va vite au cœur du sujet.",
      profile.firstName
        ? `- Appelle-le par son prénom (${profile.firstName}) de temps en temps, sans excès.`
        : "- Tutoie l'élève, avec bienveillance.",
      "- Ta réponse est lue à voix haute : AUCUN Markdown, aucune liste à puces, aucun tableau, aucun emoji. Écris les formules de façon prononçable (« x au carré », « H deux O »). Pour des étapes, dis « d'abord », « ensuite », « enfin ».",
      "- Longueur : en général 3 à 6 phrases (environ 50 à 120 mots). Un peu plus pour une explication d'enfant avec une comparaison, ou si l'élève demande un résumé ou plus de détails (environ 200 mots au maximum). Une lecture de passage peut être plus longue.",
      "- La question vient d'une reconnaissance vocale : s'il manque des mots ou qu'elle est ambiguë, comprends le sens le plus probable d'après le contexte ; si elle est vraiment incompréhensible, demande-lui gentiment de répéter.",
    ].join("\n"),
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
 * mots avec la question (et le dernier échange), jusqu'au budget — remises
 * dans l'ordre du cours.
 */
function selectPages(
  pages: VoiceTutorRequest["pages"],
  context: string,
  currentPage: number,
): { selected: VoiceTutorRequest["pages"]; partial: boolean } {
  const total = pages.reduce((sum, page) => sum + page.text.length, 0);
  if (total <= MAX_PROMPT_DOCUMENT_CHARS) return { selected: pages, partial: false };

  const contextWords = keywords(context);
  const scored = pages.map((page) => {
    const distance = Math.abs(page.page - currentPage);
    let score = distance === 0 ? 1000 : distance === 1 ? 500 : 0;
    if (contextWords.size > 0) {
      for (const word of keywords(page.text)) if (contextWords.has(word)) score += 10;
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

/** « page 5 », « p. 5 », « sayfa 5 », « Seite 5 », « página 5 », « صفحة 5 »… */
const PAGE_REFERENCE =
  /(?:^|[^\p{L}])(?:pages?|p\.|sayfa(?:sı|da)?|seiten?|páginas?|pagina|صفحة|الصفحة)\s*(\d{1,4})/giu;

function citedPages(text: string, available: Set<number>): number[] {
  const pages = new Set<number>();
  for (const match of text.matchAll(PAGE_REFERENCE)) {
    const page = Number(match[1]);
    if (available.has(page)) pages.add(page);
  }
  return [...pages].sort((a, b) => a - b).slice(0, 6);
}

/**
 * Découpe la réponse, au fil de son écriture, en passages à prononcer : le
 * premier très court (la voix démarre vite), les suivants d'une à trois
 * phrases (moins d'appels de synthèse, intonation plus naturelle).
 */
class SpeechChunker {
  private buffer = "";
  private emitted = 0;

  push(text: string): string[] {
    this.buffer += text;
    const chunks: string[] = [];
    let cut = this.findCut();
    while (cut > 0) {
      const chunk = toSpokenText(this.buffer.slice(0, cut));
      this.buffer = this.buffer.slice(cut);
      if (chunk) {
        chunks.push(chunk);
        this.emitted += 1;
      }
      cut = this.findCut();
    }
    return chunks;
  }

  flush(): string[] {
    const rest = toSpokenText(this.buffer);
    this.buffer = "";
    return rest ? [rest] : [];
  }

  private findCut(): number {
    const min = this.emitted === 0 ? 24 : 110;
    const max = 420;
    const sentenceEnd = /[.!?…؟]["»”')]*\s+/g;
    let match: RegExpExecArray | null;
    while ((match = sentenceEnd.exec(this.buffer))) {
      const end = match.index + match[0].length;
      if (end >= min) return end;
    }
    if (this.buffer.length <= max) return -1;
    // Phrase très longue : coupe à une virgule, sinon à un espace.
    const head = this.buffer.slice(0, max);
    const comma = Math.max(head.lastIndexOf(", "), head.lastIndexOf("; "));
    if (comma > min) return comma + 2;
    const space = head.lastIndexOf(" ");
    return space > min ? space + 1 : max;
  }
}

export type TutorStreamEvent =
  | { type: "delta"; text: string }
  | { type: "speech"; text: string }
  | { type: "done"; answer: string; pages: number[]; usage: AiUsageTokens };

/**
 * Réponse du professeur en flux : le texte au fil de l'écriture (`delta`), les
 * passages prêts à être prononcés (`speech`), puis la réponse complète (`done`).
 */
export async function* streamVoiceTutor(
  request: VoiceTutorRequest,
  question: string,
  profile: TutorProfile,
  dict: Dictionary,
  signal: AbortSignal,
): AsyncGenerator<TutorStreamEvent> {
  const lastAnswer = [...request.history].reverse().find((message) => message.role === "assistant");
  const { selected, partial } = selectPages(
    request.pages,
    `${question} ${lastAnswer?.content ?? ""}`,
    request.currentPage,
  );

  // Ordre pensé pour la mise en cache automatique des prompts côté OpenAI :
  // consignes et document (identiques d'une question à l'autre) d'abord, la
  // partie qui change (historique, page affichée, question) ensuite.
  const input: ResponseInput = [
    { role: "user", content: buildDocumentMessage(request, selected, partial) },
    {
      role: "assistant",
      content: "J'ai lu et compris tout le cours. Je suis prêt à l'expliquer à l'élève.",
    },
    ...request.history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    {
      role: "user",
      content: `[L'élève regarde actuellement la page ${request.currentPage} : « cette page », « ce passage » ou « ici » y renvoient. Sa question, transcrite depuis sa voix :]\n\n${question}`,
    },
  ];

  const stream = await getOpenAIClient().responses.create(
    {
      model: OPENAI_MODEL,
      instructions: buildInstructions(request.documentLanguage, request.replyLanguage, profile),
      input,
      reasoning: { effort: TUTOR_REASONING },
      max_output_tokens: 3000,
      stream: true,
    },
    { signal },
  );

  const chunker = new SpeechChunker();
  let raw = "";
  let usage: AiUsageTokens = { inputTokens: null, outputTokens: null };

  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      raw += event.delta;
      yield { type: "delta", text: event.delta };
      for (const text of chunker.push(event.delta)) yield { type: "speech", text };
    } else if (event.type === "response.completed" || event.type === "response.incomplete") {
      usage = readUsage(event.response);
    } else if (event.type === "response.failed") {
      throw new AIGenerationError(dict.voiceTutor.errorGeneric, 502);
    } else if (event.type === "error") {
      throw new AIGenerationError(dict.voiceTutor.errorGeneric, 502);
    }
  }
  for (const text of chunker.flush()) yield { type: "speech", text };

  const answer = toSpokenText(raw);
  if (!answer) {
    throw new AIGenerationError(dict.ai.noOutput(dict.voiceTutor.teacherName), 502);
  }
  const available = new Set(selected.map((page) => page.page));
  yield { type: "done", answer, pages: citedPages(answer, available), usage };
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
          instructions: `Speak in ${languageName}, like a real teacher in a one-on-one lesson: warm, lively and encouraging, natural intonation with short natural pauses, clear articulation, calm conversational pace, never robotic or monotone. If a passage is in another language, pronounce it naturally in that language.`,
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
