/**
 * « Professeur vocal » (`/professeur-vocal`) : langues proposées, message
 * d'accueil et limites partagées entre la page (client) et les routes
 * `app/api/ai/voice-tutor/*` (serveur).
 */

export const VOICE_TUTOR_LANGUAGES = [
  { code: "fr", label: "Français", english: "French" },
  { code: "en", label: "English", english: "English" },
  { code: "tr", label: "Türkçe", english: "Turkish" },
  { code: "de", label: "Deutsch", english: "German" },
  { code: "es", label: "Español", english: "Spanish" },
  { code: "ar", label: "العربية", english: "Arabic" },
  { code: "pt", label: "Português", english: "Portuguese" },
] as const;

export type VoiceTutorLanguage = (typeof VOICE_TUTOR_LANGUAGES)[number]["code"];

export const VOICE_TUTOR_LANGUAGE_CODES = VOICE_TUTOR_LANGUAGES.map(
  (language) => language.code,
) as [VoiceTutorLanguage, ...VoiceTutorLanguage[]];

export function isVoiceTutorLanguage(value: string): value is VoiceTutorLanguage {
  return (VOICE_TUTOR_LANGUAGE_CODES as readonly string[]).includes(value);
}

export function voiceTutorLanguage(code: VoiceTutorLanguage) {
  return VOICE_TUTOR_LANGUAGES.find((language) => language.code === code)!;
}

/** Dernières langues choisies (« document.réponse », ex. `tr.fr`), mémorisées un an. */
export const VOICE_TUTOR_LANGUAGES_COOKIE = "eduia-voice-langs";

export function parseVoiceTutorLanguages(
  value: string | undefined,
): { document: VoiceTutorLanguage; reply: VoiceTutorLanguage } | null {
  const [document, reply] = (value ?? "").split(".");
  if (!document || !reply || !isVoiceTutorLanguage(document) || !isVoiceTutorLanguage(reply)) {
    return null;
  }
  return { document, reply };
}

/**
 * Message d'accueil du professeur, dans la langue de réponse choisie (qui peut
 * différer de la langue de l'interface). La route de synthèse vocale accepte
 * ces textes sans jeton : ce sont les seuls textes fixes qu'elle prononce.
 */
export const VOICE_TUTOR_WELCOME: Record<VoiceTutorLanguage, string> = {
  fr: "Bienvenue ! Je suis ton professeur IA. Pose-moi des questions sur ton cours, et je vais t'aider à le comprendre simplement.",
  en: "Welcome! I'm your AI teacher. Ask me questions about your course, and I'll help you understand it simply.",
  tr: "Hoş geldin! Ben senin yapay zekâ öğretmeninim. Dersinle ilgili bana sorular sor, onu kolayca anlamana yardımcı olacağım.",
  de: "Willkommen! Ich bin dein KI-Lehrer. Stell mir Fragen zu deinem Kurs, und ich helfe dir, ihn ganz einfach zu verstehen.",
  es: "¡Bienvenido! Soy tu profesor de IA. Hazme preguntas sobre tu curso y te ayudaré a entenderlo de forma sencilla.",
  ar: "مرحبًا! أنا معلّمك بالذكاء الاصطناعي. اطرح عليّ أسئلة حول درسك، وسأساعدك على فهمه ببساطة.",
  pt: "Bem-vindo! Sou o teu professor de IA. Faz-me perguntas sobre o teu curso e vou ajudar-te a compreendê-lo de forma simples.",
};

/** PDF lu dans le navigateur : jamais envoyé au serveur, seul son texte l'est. */
export const VOICE_TUTOR_MAX_PDF_BYTES = 50 * 1024 * 1024;

/** Texte maximal d'une page envoyé au professeur. */
export const VOICE_TUTOR_MAX_PAGE_CHARS = 12_000;

/**
 * Texte du cours joint à chaque question (pages les plus proches de la page
 * affichée d'abord quand le cours est plus long) — borne la taille de la
 * requête sur une connexion mobile.
 */
export const VOICE_TUTOR_MAX_UPLOAD_CHARS = 150_000;

/** Pages scannées (sans texte) lues par la reconnaissance d'image, au plus. */
export const VOICE_TUTOR_MAX_OCR_PAGES = 20;

/** Question écrite ou transcrite. */
export const VOICE_TUTOR_MAX_QUESTION_CHARS = 2000;

/** Derniers messages renvoyés au professeur pour garder le fil. */
export const VOICE_TUTOR_MAX_HISTORY = 16;

/** Enregistrement vocal : durée et taille maximales d'une question. */
export const VOICE_TUTOR_MAX_RECORDING_MS = 60_000;
export const VOICE_TUTOR_MAX_AUDIO_BYTES = 4 * 1024 * 1024;

/** Limite de l'API de synthèse vocale (4 096 caractères). */
export const VOICE_TUTOR_MAX_SPEECH_CHARS = 4000;
