import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { toFile } from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";
import { getOpenAIClient, OPENAI_MODEL } from "./openai-client";
import { AIGenerationError } from "./errors";
import { readUsage } from "./generate";
import type { VoiceTutorRequest } from "./schemas";
import type { AiUsageTokens } from "./usage";
import {
  VOICE_TUTOR_LANGUAGES,
  VOICE_TUTOR_MAX_SPEECH_CHARS,
  VOICE_TUTOR_MAX_UPLOAD_CHARS,
  VOICE_TUTOR_GREETING,
  VOICE_TUTOR_WELCOME,
  isVoiceTutorLanguage,
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
 * Texte du cours placé dans le prompt : le cours entier (jusqu'à 50 pages bien
 * remplies). Il reste identique d'une question à l'autre, donc mis en cache
 * par OpenAI. Au-delà, on garde la page affichée, ses voisines et les pages
 * qui partagent des mots avec la question.
 */
const MAX_PROMPT_DOCUMENT_CHARS = VOICE_TUTOR_MAX_UPLOAD_CHARS;

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

export async function transcribeQuestion(audio: Blob, extension: string): Promise<string> {
  const file = await toFile(audio, `question.${extension}`, { type: audio.type });
  // Sans langue imposée : l'élève peut parler au professeur dans n'importe
  // quelle langue (la transcription reste dans la langue parlée).
  const result = await getOpenAIClient().audio.transcriptions.create({
    file,
    model: TRANSCRIBE_MODEL,
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

/** Langues que le professeur sait parler (et prononcer), pour les consignes. */
const SUPPORTED_LANGUAGES = VOICE_TUTOR_LANGUAGES.map((language) => language.english).join(", ");
const LANGUAGE_CODES = VOICE_TUTOR_LANGUAGES.map((language) => language.code).join(", ");

function buildInstructions(
  documentLanguage: VoiceTutorLanguage,
  replyLanguage: VoiceTutorLanguage,
  profile: TutorProfile,
): string {
  const doc = voiceTutorLanguage(documentLanguage).english;
  const reply = voiceTutorLanguage(replyLanguage).english;
  const student = profile.firstName ? `un élève qui s'appelle ${profile.firstName}` : "un élève";

  return [
    `Tu es le Professeur IA d'EduIA : un vrai professeur particulier, chaleureux et passionné, qui parle À VOIX HAUTE avec ${student}. Tu as sous les yeux SON cours, un PDF qu'il a importé et que tu reçois ci-dessous page par page. Ta mission : lui FAIRE COMPRENDRE ce cours, comme un excellent professeur pendant un cours particulier. Tu n'es pas un lecteur de PDF.`,

    [
      "LANGUE :",
      `- Langue de réponse choisie par l'élève : ${reply}. Réponds toujours dans cette langue, quelle que soit la langue du document, et même s'il te parle dans une autre langue (il peut lire une phrase de son cours, ou s'exprimer plus facilement autrement) : ne change de langue QUE s'il te le demande explicitement.`,
      `- Le document est indiqué comme rédigé en ${doc}, mais fie-toi au texte réel : tu comprends toutes les langues, et un cours peut en mélanger plusieurs. Explique ses notions dans la langue de réponse, en traduisant les termes du cours ; cite si besoin le terme original entre guillemets pour qu'il le retrouve dans son document.`,
      `- S'il te demande de parler ou d'expliquer dans une autre langue (« explique-moi ça en anglais »), passe à cette langue immédiatement et garde-la ensuite, tant qu'il ne demande pas d'en changer, si c'est l'une de celles-ci : ${SUPPORTED_LANGUAGES}. Pour une autre langue, dis-lui gentiment, dans la langue actuelle, que tu ne la parles pas encore et cite quelques langues disponibles.`,
    ].join("\n"),

    [
      "COMMENT TU ENSEIGNES :",
      "- Tu as lu et compris tout le cours. Quand l'élève pose une question, explique la notion AVEC TES PROPRES MOTS : d'abord l'idée essentielle en une ou deux phrases simples, puis le pourquoi et le comment. En dehors des lectures du texte original (voir LIRE PUIS EXPLIQUER), ne récite pas le document : explique avec tes mots.",
      "- Quand une idée est abstraite, rends-la concrète avec UN exemple court de la vie de tous les jours, une comparaison ou une image mentale (la cuisine, le marché, le football, un téléphone qui se recharge…), choisie pour éclairer la notion, en une phrase.",
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

    [
      "LIRE PUIS EXPLIQUER (pour que l'élève sache toujours de quoi tu parles) :",
      "- Quand tu expliques le cours, lis seulement les phrases IMPORTANTES du passage (celles qui portent une définition, un fait, une étape ou un chiffre clé), une à une : lis d'abord à voix haute la phrase du document telle qu'elle est écrite, dans sa langue d'origine (même si elle diffère de ta langue de réponse, sans la traduire), puis explique-la dans ta langue de réponse, avec tes mots, en une ou deux phrases ; passe ensuite à la phrase importante suivante. Ne lis pas les titres, les numéros de page, les transitions ni les phrases qui répètent une idée déjà lue.",
      "- Entoure chaque lecture du texte original des balises <lire> et </lire>, et recopie ce texte EXACTEMENT comme dans le document : mêmes mots, même langue, même ponctuation. Exemple avec un document en turc et une réponse en français : <lire>Glikoliz sitoplazmada gerçekleşir.</lire> Ici, on nous dit que la glycolyse se passe dans le cytoplasme, c'est-à-dire dans le liquide qui remplit la cellule.",
      "- Le texte entre les balises n'est jamais traduit ni modifié ; ce qui est hors des balises (ton explication) est toujours dans ta langue de réponse.",
      "- Pour une question précise, lis seulement la ou les phrases du cours qui y répondent, puis explique. Quand il ne comprend pas et demande une autre explication, tu peux relire la phrase puis expliquer autrement. Pour une salutation, une question hors du cours ou la réponse à ta question de vérification, pas de lecture.",
      "- S'il te demande seulement de lire un passage (« lis-moi la page 3 »), lis-le en entier entre balises, puis, s'il est dans une autre langue que ta langue de réponse, donne sa traduction fidèle ; ensuite, propose-lui de l'expliquer.",
    ].join("\n"),

    "PAGES : chaque page du document est précédée du repère « === Page N === ». Quand tu expliques une notion pour la première fois (ou que tu lis un passage), dis en passant à quelle page du cours elle se trouve (« c'est à la page 3 de ton cours »), une seule fois par réponse, sans jamais inventer de numéro.",

    [
      "EXPLICATION PAGE PAR PAGE :",
      "- Si l'élève te demande d'expliquer tout le cours, tout le document, un chapitre, ou d'expliquer « page par page » (éventuellement à partir d'une page), tu commences une explication pas à pas. Dans cette réponse, explique UNIQUEMENT la première page concernée (la page 1, sauf s'il en indique une autre), en annonçant en une phrase que vous allez avancer page par page et qu'il peut t'interrompre à tout moment. Mets suite:oui dans le repère : le système fera défiler son PDF et te demandera automatiquement la page suivante, sans qu'il ait à parler.",
      "- Pendant cette explication, chaque réponse explique UNE seule page, en allant à l'essentiel : lis au maximum 2 ou 3 phrases clés de la page (une seule si la page est courte), chacune suivie d'une explication d'une ou deux phrases, comme décrit dans LIRE PUIS EXPLIQUER. Ajoute une comparaison seulement pour une notion vraiment difficile. Vise environ 80 à 120 mots en tout, lectures comprises. Ne termine pas par une question (il ne peut pas répondre pendant l'enchaînement) : termine par une transition de quelques mots vers la suite. Une page presque vide (titre, sommaire, image) : une phrase suffit.",
      "- Mets suite:oui tant qu'il reste des pages à expliquer. Pour la dernière page, mets suite:non et conclus : résume l'essentiel en une ou deux phrases courtes et demande-lui s'il a des questions.",
      "- S'il t'interrompt (question, « explique autrement », « plus simplement »…), réponds à ce qu'il demande avec suite:non, puis propose de reprendre là où vous en étiez. S'il veut reprendre (« oui », « continue »), explique la page suivante de l'explication avec suite:oui.",
    ].join("\n"),

    [
      "REPÈRE (obligatoire, jamais lu à l'élève) : commence CHAQUE réponse par une ligne de repère, exactement sous cette forme, puis va à la ligne et réponds normalement :",
      '[[page:N lang:xx quote:"…" suite:non]]',
      "- page : le numéro de la page du cours où se trouve ce dont il est question (la notion que tu expliques, le passage que tu lis, la page qu'il demande) ; 0 si ta réponse ne porte sur aucun passage précis du cours.",
      `- lang : le code de la langue de ta réponse (${LANGUAGE_CODES}).`,
      "- quote : 3 à 8 mots consécutifs recopiés À L'IDENTIQUE dans le texte de cette page, dans la langue du document (sans les traduire ni les corriger), au début du passage concerné ; \"\" si page vaut 0.",
      "- suite : oui seulement pendant une explication page par page, quand le système doit enchaîner automatiquement sur la page suivante ; non dans tous les autres cas.",
      "Ce repère sert à faire défiler le PDF de l'élève jusqu'au passage et à le surligner pendant que tu parles. Ne le mentionne jamais et ne l'écris nulle part ailleurs dans ta réponse.",
    ].join("\n"),

    [
      "STYLE ORAL :",
      "- Parle comme un humain, pas comme un manuel : phrases courtes, ton chaleureux, vivant et encourageant, petites transitions naturelles (« Imagine… », « En fait… », « Tu vois ? ») sans en abuser.",
      "- Ne commence pas toutes tes réponses par la même formule (« Très bonne question », « Bien sûr ») : varie, et va vite au cœur du sujet.",
      profile.firstName
        ? `- Appelle-le par son prénom (${profile.firstName}) de temps en temps, sans excès.`
        : "- Tutoie l'élève, avec bienveillance.",
      "- Ta réponse est lue à voix haute : AUCUN Markdown, aucune liste à puces, aucun tableau, aucun emoji, aucune autre balise que <lire>. Écris les formules de façon prononçable (« x au carré », « H deux O »). Pour des étapes, dis « d'abord », « ensuite », « enfin ».",
      "- Sois BREF : chaque mot que tu écris est prononcé. Une réponse fait en général 2 à 4 phrases (environ 40 à 90 mots, lectures comprises) : l'essentiel, clairement, sans phrases de remplissage (« C'est une excellente question », « Comme je te l'ai dit ») et sans répéter ce que tu viens de dire. Va jusqu'à environ 150 mots seulement s'il demande un résumé, plus de détails ou une explication d'enfant. Seule la lecture d'un passage qu'il demande expressément (« lis-moi la page 3 ») peut être plus longue.",
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
    .replace(/\[\[[^\]]*\]\]/g, "")
    .replace(/<\/?lire>/gi, "")
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

const READ_OPEN = "<lire>";
const READ_CLOSE = "</lire>";

type ReadingPiece = { kind: "text"; text: string; original: boolean } | { kind: "open" } | { kind: "close" };

/** Longueur du plus long suffixe de `text` qui commence la balise `tag` (balise coupée en deux). */
function partialTag(text: string, tag: string): number {
  const lower = text.toLowerCase();
  for (let length = Math.min(tag.length - 1, lower.length); length > 0; length--) {
    if (tag.startsWith(lower.slice(-length))) return length;
  }
  return 0;
}

/**
 * Sépare, au fil de l'écriture, les lectures du texte original du cours
 * (`<lire>…</lire>`, dans la langue du document) des explications du
 * professeur (dans la langue de réponse). Une balise coupée entre deux
 * morceaux du flux est retenue jusqu'au morceau suivant.
 */
class ReadingSplitter {
  private buffer = "";
  private reading = false;

  push(text: string): ReadingPiece[] {
    this.buffer += text;
    const pieces: ReadingPiece[] = [];
    while (this.buffer) {
      const tag = this.reading ? READ_CLOSE : READ_OPEN;
      const at = this.buffer.toLowerCase().indexOf(tag);
      if (at >= 0) {
        if (at > 0) pieces.push({ kind: "text", text: this.buffer.slice(0, at), original: this.reading });
        this.buffer = this.buffer.slice(at + tag.length);
        pieces.push({ kind: this.reading ? "close" : "open" });
        this.reading = !this.reading;
        continue;
      }
      const keep = partialTag(this.buffer, tag);
      const ready = this.buffer.slice(0, this.buffer.length - keep);
      if (ready) pieces.push({ kind: "text", text: ready, original: this.reading });
      this.buffer = this.buffer.slice(this.buffer.length - keep);
      break;
    }
    return pieces;
  }

  flush(): ReadingPiece[] {
    const pieces: ReadingPiece[] = [];
    if (this.buffer) pieces.push({ kind: "text", text: this.buffer, original: this.reading });
    if (this.reading) pieces.push({ kind: "close" });
    this.buffer = "";
    this.reading = false;
    return pieces;
  }
}

/** Lecture du texte original découpée en passages prononçables (≤ 420 caractères, aux fins de phrase). */
function splitReading(text: string): string[] {
  const parts: string[] = [];
  let rest = text.replace(/\s+/g, " ").trim();
  while (rest.length > 420) {
    const head = rest.slice(0, 420);
    const end = Math.max(head.lastIndexOf(". "), head.lastIndexOf("? "), head.lastIndexOf("! "), head.lastIndexOf("; "));
    const cut = end > 80 ? end + 1 : head.lastIndexOf(" ") > 80 ? head.lastIndexOf(" ") : 420;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

/**
 * Ligne de repère placée par le professeur en tête de réponse
 * (`[[page:3 lang:fr quote:"…"]]`) : retenue jusqu'à sa fermeture, puis
 * retirée du texte affiché et prononcé. Si la réponse ne commence pas par
 * « [[ », tout le texte passe tel quel.
 */
class LeadTagReader {
  private buffer = "";
  private settled = false;
  private trimNext = false;

  push(delta: string): { tag: string | null; text: string } {
    if (this.settled) return { tag: null, text: this.trimLeading(delta) };
    this.buffer += delta;
    const start = this.buffer.trimStart();
    if (!start) return { tag: null, text: "" };
    if (!(start.startsWith("[[") || start === "[")) return this.release(null, this.buffer);
    const match = /^\s*\[\[([^\]]*)\]\]/.exec(this.buffer);
    if (match) {
      this.trimNext = true;
      return this.release(match[1], this.buffer.slice(match[0].length));
    }
    // Repère jamais fermé : on abandonne et on garde le texte (sans « [[ »).
    if (this.buffer.length > 400) return this.release(null, this.buffer.replace(/^\s*\[\[/, ""));
    return { tag: null, text: "" };
  }

  flush(): string {
    if (this.settled) return "";
    this.settled = true;
    return this.buffer;
  }

  private release(tag: string | null, text: string) {
    this.settled = true;
    this.buffer = "";
    return { tag, text: this.trimLeading(text) };
  }

  private trimLeading(text: string): string {
    if (!this.trimNext) return text;
    const trimmed = text.trimStart();
    if (trimmed) this.trimNext = false;
    return trimmed;
  }
}

export interface TutorFocus {
  /** Page du cours dont parle la réponse (null : aucune en particulier). */
  page: number | null;
  /** Quelques mots recopiés de cette page, pour retrouver et surligner le passage. */
  quote: string | null;
  /** Langue de la réponse, quand elle diffère de la langue de réponse choisie. */
  language: VoiceTutorLanguage | null;
  /** Explication page par page : enchaîner automatiquement sur la page suivante. */
  continues: boolean;
}

function parseLeadTag(
  raw: string,
  available: Set<number>,
  replyLanguage: VoiceTutorLanguage,
): TutorFocus {
  const page = Number(/page\s*[:=]\s*(\d{1,4})/i.exec(raw)?.[1] ?? 0);
  const language = /lang\w*\s*[:=]\s*["']?([a-z]{2})\b/i.exec(raw)?.[1]?.toLowerCase() ?? "";
  const quote = /quote\s*[:=]\s*["“«„]\s*([^"”»“]*?)\s*["”»“]/i.exec(raw)?.[1]?.trim() ?? "";
  const next = /suite\s*[:=]\s*["']?(oui|yes|true|non|no|false)\b/i.exec(raw)?.[1]?.toLowerCase() ?? "";
  const known = available.has(page);
  return {
    page: known ? page : null,
    quote: known && quote ? quote.slice(0, 200) : null,
    language: isVoiceTutorLanguage(language) && language !== replyLanguage ? language : null,
    continues: known && (next === "oui" || next === "yes" || next === "true") && page < available.size,
  };
}

export type TutorStreamEvent =
  | { type: "focus"; focus: TutorFocus }
  | { type: "delta"; text: string }
  | {
      type: "speech";
      text: string;
      /** Lecture du texte original : prononcée dans la langue du document. */
      original?: boolean;
      language?: VoiceTutorLanguage;
    }
  | { type: "done"; answer: string; pages: number[]; usage: AiUsageTokens };

/** Clé de cache du prompt : même élève + même cours → même serveur de cache chez OpenAI. */
export function promptCacheKey(userId: string, request: VoiceTutorRequest): string {
  return createHash("sha256")
    .update(`voice-tutor:${userId}:${request.documentName}:${request.pageCount}`)
    .digest("base64url")
    .slice(0, 40);
}

/**
 * Réponse du professeur en flux : d'abord le passage du cours dont il parle
 * (`focus`, pour faire défiler le PDF), puis le texte au fil de l'écriture
 * (`delta`), les passages prêts à être prononcés (`speech`) et enfin la
 * réponse complète (`done`).
 */
export async function* streamVoiceTutor(
  request: VoiceTutorRequest,
  question: string,
  profile: TutorProfile,
  dict: Dictionary,
  signal: AbortSignal,
  cacheKey: string,
): AsyncGenerator<TutorStreamEvent> {
  const lastAnswer = [...request.history].reverse().find((message) => message.role === "assistant");
  // Suite automatique d'une explication page par page : la page à expliquer.
  const lessonNext =
    request.continueLesson && request.lessonPage ? request.lessonPage + 1 : null;
  const { selected, partial } = selectPages(
    request.pages,
    `${question} ${lastAnswer?.content ?? ""}`,
    lessonNext ?? request.currentPage,
  );
  const replyName = voiceTutorLanguage(request.replyLanguage).english;
  const lessonContext = request.lessonPage
    ? ` Une explication page par page est en cours : la dernière page expliquée est la page ${request.lessonPage} sur ${request.pageCount}. S'il ne demande pas explicitement de continuer, réponds à ce qu'il dit, puis termine OBLIGATOIREMENT par une question qui lui propose de reprendre, par exemple « C'est plus clair ? On reprend à la page ${Math.min(request.lessonPage + 1, request.pageCount)} ? ».`
    : " Après ton explication, termine par UNE courte question pour vérifier qu'il a compris, ou pour lui proposer la suite.";
  const turn = lessonNext
    ? `[EXPLICATION PAGE PAR PAGE — suite automatique : l'élève écoute sans rien dire. Explique maintenant la page ${lessonNext} sur ${request.pageCount} de son cours, comme la suite naturelle de ta dernière explication : lis seulement ses 2 ou 3 phrases clés, chacune suivie d'une explication courte (environ 80 à 120 mots en tout).${lessonNext < request.pageCount ? " Termine par une transition de quelques mots vers la page suivante, sans question." : " C'est la DERNIÈRE page du cours : explique-la, puis résume l'essentiel du cours en une ou deux phrases courtes et termine en lui demandant s'il a des questions."} Réponds en ${replyName}. Commence ta réponse par la ligne de repère [[page:${lessonNext} lang:… quote:"…" suite:${lessonNext < request.pageCount ? "oui" : "non"}]].]`
    : `[L'élève regarde actuellement la page ${request.currentPage} : « cette page », « ce passage » ou « ici » y renvoient.${lessonContext} Réponds en ${replyName}, sauf s'il te demande explicitement une autre langue. Commence ta réponse par la ligne de repère [[page:… lang:… quote:"…" suite:…]]. Sa question, transcrite depuis sa voix :]\n\n${question}`;

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
      content: turn,
    },
  ];

  const stream = await getOpenAIClient().responses.create(
    {
      model: OPENAI_MODEL,
      instructions: buildInstructions(request.documentLanguage, request.replyLanguage, profile),
      input,
      reasoning: { effort: TUTOR_REASONING },
      max_output_tokens: 3000,
      prompt_cache_key: cacheKey,
      // Le cours reste en cache jusqu'à 24 h (au lieu de quelques minutes) :
      // une question posée plus tard le paie environ 10 fois moins cher.
      prompt_cache_retention: "24h",
      stream: true,
    },
    { signal },
  );

  const chunker = new SpeechChunker();
  const tagReader = new LeadTagReader();
  const splitter = new ReadingSplitter();
  let reading = "";
  const documentPages = new Set(
    Array.from({ length: request.pageCount }, (_, index) => index + 1),
  );
  let focusSent = false;
  let raw = "";
  let usage: AiUsageTokens = { inputTokens: null, outputTokens: null };

  function* show(text: string): Generator<TutorStreamEvent> {
    if (!text) return;
    raw += text;
    // Sans ligne de repère : la première page citée dans la réponse sert de repère.
    if (!focusSent) {
      const page = citedPages(raw, documentPages)[0];
      if (page) {
        focusSent = true;
        yield {
          type: "focus",
          focus: { page, quote: null, language: null, continues: false },
        };
      }
    }
    yield { type: "delta", text };
  }

  /**
   * Lectures du texte original : affichées entre guillemets et prononcées à
   * part, dans la langue du document ; explications : découpées comme avant.
   */
  function* emit(text: string): Generator<TutorStreamEvent> {
    for (const piece of splitter.push(text)) yield* handle(piece);
  }

  function* handle(piece: ReadingPiece): Generator<TutorStreamEvent> {
    if (piece.kind === "open") {
      for (const chunk of chunker.flush()) yield { type: "speech", text: chunk };
      reading = "";
      yield* show("« ");
    } else if (piece.kind === "close") {
      yield* show(" »");
      for (const part of splitReading(toSpokenText(reading))) {
        yield { type: "speech", text: part, original: true, language: request.documentLanguage };
      }
      reading = "";
    } else if (piece.original) {
      reading += piece.text;
      yield* show(piece.text.replace(/^\s+/, reading === piece.text ? "" : " "));
    } else {
      yield* show(piece.text);
      for (const chunk of chunker.push(piece.text)) yield { type: "speech", text: chunk };
    }
  }

  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      const { tag, text } = tagReader.push(event.delta);
      if (tag !== null && !focusSent) {
        focusSent = true;
        const focus = parseLeadTag(tag, documentPages, request.replyLanguage);
        if (focus.page || focus.language || focus.continues) yield { type: "focus", focus };
      }
      // Suite automatique sans repère : la page demandée sert de repère.
      if (lessonNext && !focusSent && (tag !== null || text)) {
        focusSent = true;
        yield {
          type: "focus",
          focus: {
            page: lessonNext,
            quote: null,
            language: null,
            continues: lessonNext < request.pageCount,
          },
        };
      }
      yield* emit(text);
    } else if (event.type === "response.completed" || event.type === "response.incomplete") {
      usage = readUsage(event.response);
    } else if (event.type === "response.failed") {
      throw new AIGenerationError(dict.voiceTutor.errorGeneric, 502);
    } else if (event.type === "error") {
      throw new AIGenerationError(dict.voiceTutor.errorGeneric, 502);
    }
  }
  yield* emit(tagReader.flush());
  for (const piece of splitter.flush()) yield* handle(piece);
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
  if (Object.values(VOICE_TUTOR_GREETING).includes(text)) return true;
  if (!token) return false;
  const expected = Buffer.from(signSpeechText(userId, text));
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
