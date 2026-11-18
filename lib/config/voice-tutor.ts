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
  { code: "it", label: "Italiano", english: "Italian" },
  { code: "nl", label: "Nederlands", english: "Dutch" },
  { code: "pl", label: "Polski", english: "Polish" },
  { code: "ru", label: "Русский", english: "Russian" },
  { code: "zh", label: "中文", english: "Chinese (Mandarin)" },
  { code: "ja", label: "日本語", english: "Japanese" },
  { code: "ko", label: "한국어", english: "Korean" },
  { code: "hi", label: "हिन्दी", english: "Hindi" },
  { code: "sw", label: "Kiswahili", english: "Swahili" },
  { code: "vi", label: "Tiếng Việt", english: "Vietnamese" },
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
  fr: "Bonjour ! Je suis ton professeur IA, et j'ai lu ton cours. Appuie sur le micro et pose-moi ta question : je t'explique tout simplement, à ton rythme.",
  en: "Hi! I'm your AI teacher, and I've read your course. Tap the mic and ask me your question: I'll explain everything simply, at your own pace.",
  tr: "Merhaba! Ben senin yapay zekâ öğretmeninim ve dersini okudum. Mikrofona dokun ve sorunu sor: her şeyi kendi hızında, basitçe açıklayacağım.",
  de: "Hallo! Ich bin dein KI-Lehrer und habe deinen Kurs gelesen. Tippe auf das Mikrofon und stell mir deine Frage: Ich erkläre dir alles ganz einfach, in deinem Tempo.",
  es: "¡Hola! Soy tu profesor de IA y ya he leído tu curso. Toca el micrófono y hazme tu pregunta: te lo explico todo de forma sencilla, a tu ritmo.",
  ar: "مرحبًا! أنا معلّمك بالذكاء الاصطناعي، وقد قرأت درسك. اضغط على الميكروفون واطرح سؤالك: سأشرح لك كل شيء ببساطة وعلى مهلك.",
  pt: "Olá! Sou o teu professor de IA e já li o teu curso. Toca no microfone e faz-me a tua pergunta: explico-te tudo de forma simples, ao teu ritmo.",
  it: "Ciao! Sono il tuo professore IA e ho letto il tuo corso. Tocca il microfono e fammi la tua domanda: ti spiego tutto in modo semplice, al tuo ritmo.",
  nl: "Hallo! Ik ben je AI-leraar en ik heb je cursus gelezen. Tik op de microfoon en stel me je vraag: ik leg alles eenvoudig uit, in jouw tempo.",
  pl: "Cześć! Jestem twoim nauczycielem AI i przeczytałem twój kurs. Dotknij mikrofonu i zadaj mi pytanie: wyjaśnię ci wszystko prosto, w twoim tempie.",
  ru: "Привет! Я твой ИИ-учитель, и я прочитал твой курс. Нажми на микрофон и задай свой вопрос: я всё объясню просто и в твоём темпе.",
  zh: "你好！我是你的AI老师，我已经读过你的课程了。点一下麦克风，向我提问吧：我会按照你的节奏，用简单的方式为你讲解。",
  ja: "こんにちは！私はあなたのAI先生です。あなたの授業の資料を読みました。マイクをタップして質問してください。あなたのペースで、わかりやすく説明します。",
  ko: "안녕! 나는 너의 AI 선생님이야. 네 수업 자료를 다 읽었어. 마이크를 누르고 질문해 줘. 네 속도에 맞춰 쉽게 설명해 줄게.",
  hi: "नमस्ते! मैं तुम्हारा AI शिक्षक हूँ, और मैंने तुम्हारा पाठ पढ़ लिया है। माइक दबाओ और मुझसे अपना सवाल पूछो: मैं सब कुछ आसान तरीके से, तुम्हारी गति से समझाऊँगा।",
  sw: "Habari! Mimi ni mwalimu wako wa AI, na nimesoma somo lako. Gusa kipaza sauti kisha uniulize swali lako: nitakueleza kila kitu kwa urahisi, kwa kasi yako.",
  vi: "Xin chào! Mình là giáo viên AI của bạn, và mình đã đọc bài học của bạn. Hãy chạm vào micro và đặt câu hỏi: mình sẽ giải thích mọi thứ thật đơn giản, theo nhịp độ của bạn.",
};

/**
 * Salutation prononcée par le professeur au premier appui sur le micro d'une
 * conversation, avant d'écouter l'élève. Texte fixe, lui aussi accepté sans
 * jeton par la route de synthèse vocale.
 */
export const VOICE_TUTOR_GREETING: Record<VoiceTutorLanguage, string> = {
  fr: "Bienvenue ! Comment puis-je vous aider aujourd'hui ?",
  en: "Welcome! How can I help you today?",
  tr: "Hoş geldiniz! Bugün size nasıl yardımcı olabilirim?",
  de: "Willkommen! Wie kann ich Ihnen heute helfen?",
  es: "¡Bienvenido! ¿En qué puedo ayudarle hoy?",
  ar: "أهلًا وسهلًا! كيف يمكنني مساعدتك اليوم؟",
  pt: "Bem-vindo! Como posso ajudar hoje?",
  it: "Benvenuto! Come posso aiutarla oggi?",
  nl: "Welkom! Hoe kan ik u vandaag helpen?",
  pl: "Witam! W czym mogę dziś pomóc?",
  ru: "Добро пожаловать! Чем я могу вам помочь сегодня?",
  zh: "欢迎！今天我能为您做些什么？",
  ja: "ようこそ！今日はどのようなお手伝いができますか？",
  ko: "환영합니다! 오늘 무엇을 도와드릴까요?",
  hi: "स्वागत है! आज मैं आपकी कैसे मदद कर सकता हूँ?",
  sw: "Karibu! Nikusaidie vipi leo?",
  vi: "Chào mừng bạn! Hôm nay mình có thể giúp gì cho bạn?",
};

/** PDF lu dans le navigateur : jamais envoyé au serveur, seul son texte l'est. */
export const VOICE_TUTOR_MAX_PDF_BYTES = 50 * 1024 * 1024;

/**
 * Nombre de pages maximal d'un cours : toutes ses pages sont affichées, lues
 * (y compris scannées) et jointes en entier à chaque question.
 */
export const VOICE_TUTOR_MAX_PAGES = 50;

/** Texte maximal d'une page envoyé au professeur. */
export const VOICE_TUTOR_MAX_PAGE_CHARS = 12_000;

/**
 * Texte du cours joint à chaque question (compressé avant l'envoi) : de quoi
 * joindre 50 pages bien remplies en entier. Au-delà (pages exceptionnellement
 * denses), les pages les plus proches de celle affichée passent d'abord.
 */
export const VOICE_TUTOR_MAX_UPLOAD_CHARS = 250_000;

/** Pages scannées (sans texte) lues par la reconnaissance d'image : toutes. */
export const VOICE_TUTOR_MAX_OCR_PAGES = VOICE_TUTOR_MAX_PAGES;

/** Derniers messages renvoyés au professeur pour garder le fil. */
export const VOICE_TUTOR_MAX_HISTORY = 20;

/** Enregistrement vocal : durée et taille maximales d'une question. */
export const VOICE_TUTOR_MAX_RECORDING_MS = 60_000;
export const VOICE_TUTOR_MAX_AUDIO_BYTES = 4 * 1024 * 1024;

/** Limite de l'API de synthèse vocale (4 096 caractères). */
export const VOICE_TUTOR_MAX_SPEECH_CHARS = 4000;
