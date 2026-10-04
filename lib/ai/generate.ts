import "server-only";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInput } from "openai/resources/responses/responses";
import { getOpenAIClient, OPENAI_MODEL } from "./openai-client";
import { AIGenerationError } from "./errors";
import { estimatePageCountFromText } from "./extract";
import { aiSummarySchema, aiExamSchema, aiCorrectionSchema } from "./schemas";
import { balanceExamPoints } from "./exam-points";
import {
  cleanPartTitle,
  cleanQuestionPrompt,
  cleanSubQuestion,
} from "@/lib/summary/exam-layout";
import type { AiUsageTokens } from "./usage";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type {
  CorrectionRequest,
  ExamCorrection,
  ExamPart,
  ExamRequest,
  GeneratedExam,
  SummaryRequest,
  CourseSummary,
} from "@/types";

/**
 * Consigne de langue ajoutée aux `instructions` : en anglais, on impose la
 * langue de sortie quelle que soit la langue du cours source ; en français, le
 * prompt de base (francophone) suffit.
 */
function languageDirective(locale: Locale): string {
  return locale === "en"
    ? " Write the ENTIRE structured output in English (every field: title, headings, paragraphs, bullets, definitions, questions, feedback, advice…), regardless of the language of the source course."
    : "";
}

function localizedDateLabel(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Appels OpenAI (Responses API + Structured Outputs) pour les 3 fonctionnalités
 * de génération d'EduIA. Chaque fonction prend exactement la requête construite
 * par le panneau de configuration correspondant et renvoie l'objet typé consommé
 * par le panneau de résultat.
 *
 * La persistance vit dans `lib/data/*` (appelée par les routes `app/api/ai/*`) :
 * `summarizeCourse` est déjà branché de bout en bout (`/resumer` →
 * `POST /api/ai/summarize` → `saveCourseSummary`). `generateExam` / `gradeExam`
 * restent à câbler côté page.
 */

// Couvre jusqu'à 5 pages denses (photos de cahier, TXT, Word) importées
// ensemble : en dessous, les dernières pages d'un cours multi-photos étaient
// tronquées avant d'atteindre le modèle.
const MAX_SOURCE_CHARS = 24_000;

/**
 * Règle d'ancrage stricte au document, partagée par les trois outils : quand
 * l'élève fournit un cours (texte ou fichier), la sortie ne doit contenir QUE ce
 * qui figure dans ce document.
 */
const STRICT_SOURCE_RULE =
  "RÈGLE ABSOLUE : quand un document / contenu de cours est fourni, appuie-toi EXCLUSIVEMENT dessus. " +
  "Lis-le attentivement et en entier. N'ajoute aucune notion, définition, exemple, date ou fait qui n'y figure pas explicitement, même si tu le connais par ailleurs. " +
  "Reformule sans trahir, ne complète pas les lacunes du document. En cas de doute, reste au plus près du texte source.";

const SUMMARY_SYSTEM_PROMPT =
  "Tu es EduIA, un assistant pédagogique francophone qui aide des élèves à réviser efficacement. " +
  "Produis un résumé de cours fidèle, clair et structuré, adapté au niveau scolaire indiqué. " +
  STRICT_SOURCE_RULE +
  " STRUCTURE OBLIGATOIRE, comme une vraie fiche de cours : organise `sections` en grandes parties (en général 2 à 5) qui suivent le plan logique du cours ; " +
  "TOUTE grande partie contient au moins une sous-partie (`subsections`, idéalement 2 à 4 quand le contenu le permet), chacune avec un sous-titre précis et son explication (paragraphes et/ou puces) : c'est dans les sous-parties que va TOUT le contenu explicatif. " +
  "Les `paragraphs` d'une grande partie se limitent à UNE phrase d'introduction facultative (sinon null) et ses `bullets` restent null. " +
  "Si une notion est trop courte pour former une grande partie, regroupe-la avec une notion voisine en sous-parties d'une même grande partie ; n'invente jamais de contenu pour remplir une sous-partie. " +
  "N'écris JAMAIS de numérotation (1., 1.1, I., A)…) dans les titres : elle est ajoutée automatiquement à l'affichage." +
  " Réponds uniquement selon le schéma structuré demandé, sans texte additionnel.";

/**
 * Structure scolaire universelle des épreuves (pays francophones et
 * anglophones, sans identité nationale) : parties A → D choisies selon la
 * matière, jamais forcées. La lettre des parties, la numérotation A.1…, l'en-tête
 * (établissement, durée, nom…) et le pied (Total / appréciation / signature)
 * sont ajoutés par l'application : l'IA ne fournit que le contenu.
 */
const EXAM_STRUCTURE_RULE =
  " DÉMARCHE : analyse d'abord ENTIÈREMENT le cours et remplis `analysis` (matière, niveau si indiqué, chapitres/thèmes, notions importantes, compétences évaluables, parties retenues) ; construis ensuite l'épreuve à partir de cette analyse, en couvrant intelligemment les différentes parties importantes du cours. " +
  "STRUCTURE : une vraie épreuve scolaire en 2 à 4 parties (`parts`), dans cet ordre logique : " +
  "(A) connaissances et compréhension — définitions, questions de cours, questions courtes, QCM, vrai/faux, propriétés ou calculs de base ; " +
  "(B) application / exercices — forme selon la matière (mathématiques : calculs, exercices, problèmes ; sciences : exercices, raisonnement scientifique, exploitation de données ; histoire-géographie/éducation civique : questions, analyse ; langues/français : compréhension, langue, analyse) ; " +
  "(C) analyse de document / activité — fournis dans `documents` un support construit à partir du cours (extrait, tableau de données, situation, consigne d'observation ; un graphique ou une carte se donne sous forme de tableau de données), puis des questions progressives : observation → compréhension → analyse → interprétation ; si ce n'est pas pertinent pour la matière, remplace-la par une activité pédagogique équivalente ; " +
  "(D) mobilisation des compétences — situation-problème, problème complexe, étude de cas, exercice de synthèse, raisonnement scientifique, composition/dissertation ou production écrite selon la matière, mobilisant plusieurs notions du cours. " +
  "N'impose JAMAIS les quatre parties si elles ne sont pas pertinentes : mathématiques → connaissances, exercices, problèmes, problème complexe ; histoire/géographie → connaissances, questions/exercices, analyse de document, situation-problème/composition ; SVT → connaissances, exercices, exploitation de documents, raisonnement scientifique ; français → compréhension, langue, analyse, production écrite. " +
  "Titres de parties courts et explicites, SANS « Partie A » ni lettre ; énoncés et sous-questions SANS numéro (A.1, a)… sont ajoutés par l'application). " +
  "NOMBRE DE QUESTIONS : le nombre total de questions numérotées (A.1, A.2, B.1…) doit être celui demandé (±1) — un exercice regroupe ses étapes en sous-questions (`subQuestions`) dans UNE seule question, un bloc vrai/faux regroupe 3 à 5 affirmations dans UNE seule question ; écris dans `plannedParts` le nombre de questions et de points prévus par partie et vérifie les totaux avant de rédiger. " +
  "VRAI/FAUX : l'énoncé est une consigne (ex. « Indique si chaque affirmation est vraie ou fausse. »), jamais une affirmation recopiée ; les affirmations vont dans `statements`. " +
  "DOCUMENTS ET SITUATIONS : un document ou une situation fournit des données, un contexte ou un extrait à exploiter, mais ne contient JAMAIS la réponse aux questions posées dessus (ne donne pas la formule, la conclusion ou le résultat que l'élève doit trouver) ; l'élève doit observer, calculer, interpréter ou argumenter. `source` : seulement si le cours cite une source réelle, sinon null. " +
  "`generalInstructions` : 2 à 5 consignes générales courtes et adaptées à la matière (ex. calculatrice autorisée ou non seulement si pertinent, soin, justification des réponses). Elles s'adressent à l'élève comme sur une vraie épreuve : ne mentionne jamais « le cours fourni », un document importé, EduIA ni l'IA. " +
  "BARÈME : chaque question a ses points (multiples de 0,5) ; `points` d'une partie = somme exacte de ses questions ; le total de toutes les questions doit être EXACTEMENT le barème total demandé. Pondération indicative selon les parties retenues : connaissances ≈ 20-30 %, application ≈ 25-35 %, analyse ≈ 20-30 %, mobilisation des compétences ≈ 20-30 % — la dernière partie (situation-problème, composition…) est la plus complète, composée de plusieurs sous-questions, et pèse au moins 15 % du total. " +
  "DIFFICULTÉ : respecte le niveau de la classe et la difficulté demandée ; progression facile → moyen → difficile dans l'épreuve et dans chaque partie (renseigne `difficulty`), la dernière partie étant la plus exigeante ; ne rends pas toute l'épreuve difficile. " +
  "ESPACE RÉPONSE : `answerLines` adapté à la longueur de réponse attendue (0 pour QCM et vrai/faux). " +
  "FIDÉLITÉ : ne pose aucune question sur une notion absente du cours fourni ; n'invente ni chapitre, ni date, ni formule, ni définition, ni information externe. Les données chiffrées ou le contexte d'un exercice ou d'une situation peuvent être construits pour l'occasion, mais toutes les connaissances, méthodes et formules nécessaires pour répondre doivent venir du cours. " +
  "NEUTRALITÉ : n'écris jamais le nom d'un pays, d'un ministère, d'un examen ou d'un système scolaire national dans le titre, les consignes ou les questions (sauf si le cours lui-même porte sur ce sujet). ";

const EXAM_SYSTEM_PROMPT =
  "Tu es EduIA, un assistant pédagogique qui prépare des épreuves scolaires professionnelles et imprimables, utilisables dans tous les pays francophones et anglophones. " +
  "Génère une épreuve rigoureuse, adaptée au niveau et à la matière indiqués, avec un barème exact. " +
  "Respecte le nombre total de questions demandé et le type de questions choisi : il prime sur la structure (ex. « QCM » seul → toutes les questions sont des QCM, réparties dans les parties pertinentes). " +
  STRICT_SOURCE_RULE +
  " Toutes les questions doivent porter sur des notions RÉELLEMENT présentes dans le document et pouvoir être répondues à partir de lui seul." +
  EXAM_STRUCTURE_RULE +
  "Pour les questions à choix multiples, propose exactement 4 choix dont une seule réponse correcte (correct: true). " +
  "Pour les questions ouvertes, fournis toujours une réponse attendue précise, tirée du document. " +
  "Pour les affirmations vrai/faux, fournis des affirmations claires et leur valeur de vérité. " +
  "Réponds uniquement selon le schéma structuré demandé, sans texte additionnel.";

/**
 * Règle de correction détaillée pour les épreuves EXCLUSIVEMENT mathématiques
 * — appliquée automatiquement par détection du contenu (aucun champ "matière"
 * n'est saisi par l'élève avant la correction), sans toucher aux autres
 * matières. Partagée par les trois prompts de correction ci-dessous, qui
 * produisent tous le même schéma `aiCorrectionSchema` (feedback/expectedAnswer
 * par question).
 */
const MATH_DETAILED_CORRECTION_RULE =
  " RÈGLE MATHÉMATIQUES (automatique, ne s'applique qu'aux épreuves/copies portant EXCLUSIVEMENT sur les mathématiques — n'affecte aucune autre matière) : pour CHAQUE question, `feedback` (et `expectedAnswer` pour un corrigé type) doit dérouler le raisonnement complet, JAMAIS seulement le résultat final. Structure obligatoire, dans l'ordre : (1) rappelle la formule ou méthode utilisée ; (2) montre les données de l'énoncé substituées dans la formule ; (3) détaille chaque étape de calcul avec une courte explication de ce qu'elle fait ; (4) termine par la réponse finale clairement indiquée (ex. « Réponse : x = 5 »), sur sa propre ligne. Un résultat donné sans cette démonstration est un feedback incomplet — ne le fais jamais pour une épreuve de mathématiques.";

/**
 * Utilisée quand une épreuve de référence est disponible pour comparaison : le
 * modèle peut alors fiablement distinguer "vraie copie répondue" de "l'épreuve
 * elle-même resoumise sans réponse" en comparant le contenu envoyé à l'épreuve
 * de référence.
 */
const CORRECTION_WITH_REFERENCE_SYSTEM_PROMPT =
  "Tu es EduIA, un assistant pédagogique francophone qui traite le contenu envoyé dans « Corriger une épreuve ». " +
  "AVANT toute chose, compare le contenu envoyé à l'ÉPREUVE DE RÉFÉRENCE fournie : détermine s'il contient de VRAIES réponses rédigées par un élève à au moins une question — renseigne `hasRealAnswers` en conséquence. " +
  "Un contenu qui n'est QUE l'énoncé de l'épreuve de référence (avec ou sans son corrigé), un document vide, une resoumission de cette même épreuve sans aucune réponse ajoutée, ou tout contenu qui n'est manifestement pas une tentative de réponse d'élève N'EST PAS une copie répondue : `hasRealAnswers` doit alors être `false`. " +
  "Un contenu qui apporte des réponses, même partielles ou imparfaites, à au moins une question EST une copie répondue : `hasRealAnswers` doit alors être `true` — en cas de doute, privilégie `true`. " +
  "Si `hasRealAnswers` est vrai : évalue chaque question séparément, explique les erreurs, et adapte ta sévérité au niveau d'exigence demandé — les réponses attendues et le barème doivent être ceux du document source et de l'épreuve fournis, pas des connaissances externes. " +
  "Si `hasRealAnswers` est faux : NE NOTE RIEN ; rédige à la place, pour CHAQUE question, un vrai corrigé type — la réponse exacte attendue (`expectedAnswer`) et l'explication de la démarche (`feedback`, justifications, méthode, pièges fréquents), à partir du document source et/ou de l'épreuve fournis, sans jamais mentionner une copie ou une réponse d'élève absente. " +
  "Donne toujours des conseils concrets et actionnables pour progresser. " +
  "Réponds uniquement selon le schéma structuré demandé, sans texte additionnel." +
  MATH_DETAILED_CORRECTION_RULE;

/**
 * Utilisée quand AUCUNE épreuve de référence n'est disponible : rien ne
 * permet de vérifier si le contenu envoyé est "l'épreuve elle-même" — on ne
 * demande donc jamais au modèle de remettre en doute qu'il s'agit d'une
 * copie réelle (comportement identique à l'ancienne version, pour ne prendre
 * aucun risque de faux négatif sur la correction libre sans référence).
 */
const CORRECTION_NO_REFERENCE_SYSTEM_PROMPT =
  "Tu es EduIA, un assistant pédagogique francophone qui corrige des copies d'élèves avec bienveillance et rigueur. " +
  "Le contenu envoyé est la copie réelle de l'élève : renseigne toujours `hasRealAnswers` à `true`. " +
  "Évalue chaque question séparément, explique les erreurs, et adapte ta sévérité au niveau d'exigence demandé. " +
  "Appuie-toi sur le document source fourni s'il y en a un : les réponses attendues et le barème doivent alors en découler, pas de connaissances externes. " +
  "Donne toujours des conseils concrets et actionnables pour progresser. " +
  "Réponds uniquement selon le schéma structuré demandé, sans texte additionnel." +
  MATH_DETAILED_CORRECTION_RULE;

const ANSWER_KEY_SYSTEM_PROMPT =
  "Tu es EduIA, un assistant pédagogique francophone qui rédige des corrigés types d'épreuves scolaires. " +
  "À partir du DOCUMENT SOURCE et de l'ÉPREUVE fournis, produis un corrigé complet, rigoureux et pédagogique : pour CHAQUE question, la réponse exacte attendue et l'explication de la démarche (justifications, méthode, pièges fréquents). " +
  "Les réponses attendues, le barème et les explications doivent venir STRICTEMENT du document source et de l'épreuve — n'invente rien, n'ajoute aucune notion absente du document. " +
  "Il n'y a AUCUNE copie d'élève : tu ne notes rien, tu rédiges le corrigé de référence. Renseigne toujours `hasRealAnswers` à `false`. " +
  "Adapte le niveau de détail à l'exigence demandée. " +
  "Réponds uniquement selon le schéma structuré demandé, sans texte additionnel." +
  MATH_DETAILED_CORRECTION_RULE;

function truncate(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max)}\n…(contenu tronqué)` : trimmed;
}

/**
 * Ramène une valeur censée être un libellé court (ex. l'« appréciation » d'une
 * correction : « Bien », « Assez bien »…) à une forme brève, même si le modèle a
 * renvoyé une phrase entière — sinon elle casse la mise en page (badge sans
 * retour à la ligne).
 */
function shortLabel(raw: string | null | undefined, maxChars = 32): string {
  const firstClause = (raw ?? "").split(/[\n.;:!?]/)[0]?.trim() ?? "";
  const value = (firstClause || (raw ?? "")).trim();
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).replace(/[\s,-]+$/, "")}…`;
}

/**
 * L'épreuve de référence passée en prompt (`examToReferenceText`) numérote
 * chaque question ("1. Énoncé…") pour la lisibilité du modèle. La correction
 * recopie parfois cette numérotation dans `prompt` — or l'UI affiche déjà son
 * propre badge de numéro (`QuestionNumber`), ce qui doublerait l'affichage
 * ("① 1. Énoncé…"). On l'enlève défensivement, indépendamment des consignes
 * données au modèle.
 */
function stripLeadingNumbering(text: string): string {
  // « 1. », « 1) » et, depuis la structure en parties, « A.1 » / « B.2. ».
  return cleanQuestionPrompt(text.replace(/^\s*\d+\s*[.)]\s*/, ""));
}

function activeOptionKeys(options: Record<string, boolean>): string[] {
  return Object.entries(options)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}

/**
 * Libellés humains des options « à la carte » (identifiants internes des
 * cases à cocher de « Résumer » / « Générer » → texte inséré dans le prompt).
 * Séparés du dictionnaire i18n client : ce sont des instructions pour l'IA,
 * pas du texte d'interface — mais alignés sur la même langue que le résultat
 * demandé (`languageDirective`).
 */
const OPTION_LABELS: Record<string, { fr: string; en: string }> = {
  // Résumer un cours
  pointsEssentiels: { fr: "points essentiels", en: "key points" },
  definitions: { fr: "définitions", en: "definitions" },
  formules: { fr: "formules", en: "formulas" },
  exemples: { fr: "exemples", en: "examples" },
  explicationsSimples: {
    fr: "explications simples et accessibles",
    en: "simple, accessible explanations",
  },
  // Générer une épreuve
  bareme: { fr: "barème détaillé par question", en: "detailed mark scheme per question" },
  pageGarde: { fr: "page de garde", en: "cover page" },
  melanger: { fr: "questions dans un ordre mélangé", en: "questions in shuffled order" },
  explications: { fr: "explications des réponses attendues", en: "explanations of the expected answers" },
};

/** Comme `activeOptionKeys`, mais résout chaque identifiant en libellé lisible. */
function activeOptionLabels(
  options: Record<string, boolean>,
  locale: Locale,
): string[] {
  return Object.entries(options)
    .filter(([, enabled]) => enabled)
    .map(([key]) => OPTION_LABELS[key]?.[locale] ?? key);
}

function estimatePageCount(sourceText: string | null): number {
  if (!sourceText) return 0;
  return estimatePageCountFromText(sourceText);
}

/** Lève une erreur claire si l'IA n'a renvoyé aucune sortie structurée exploitable. */
function requireParsed<T>(parsed: T | null, message: string): T {
  if (!parsed) {
    throw new AIGenerationError(message);
  }
  return parsed;
}

/** Compteurs de tokens de la réponse OpenAI (pour `ai_usage` / `/admin/ai`). */
export function readUsage(response: {
  usage?: { input_tokens: number; output_tokens: number };
}): AiUsageTokens {
  return {
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
  };
}

// ───────────────────────── A. Résumer un cours ─────────────────────────

/**
 * Fichier de cours transmis nativement à OpenAI (`input_file`) plutôt qu'extrait
 * en texte — utilisé pour les PDF, dont le modèle lit la mise en page, les
 * schémas et les formules. `dataUrl` : `data:application/pdf;base64,…`.
 */
export interface SummarizeSourceFile {
  filename: string;
  dataUrl: string;
}

function buildSummaryPrompt(
  request: SummaryRequest,
  attachmentCount: number,
  locale: Locale,
): string {
  const chapter = request.chapter?.trim();
  const theme = request.theme?.trim();

  const lines = [
    `Matière : ${request.subject}`,
    `Niveau : ${request.level}`,
  ];
  if (chapter) lines.push(`Chapitre : ${chapter}`);
  if (theme) lines.push(`Thème : ${theme}`);
  lines.push(
    `Style demandé : ${request.style}`,
    `Niveau de détail : ${request.detailLevel}`,
    `Longueur cible : ${request.pageCount}`,
  );

  const activeOptions = activeOptionLabels(request.options, locale);
  if (activeOptions.length > 0) {
    lines.push(`Éléments à inclure : ${activeOptions.join(", ")}.`);
  }

  const source = truncate(request.sourceText, MAX_SOURCE_CHARS);
  if (source) {
    lines.push(
      "",
      "Voici le contenu EXACT du cours à résumer. Résume UNIQUEMENT ce qui suit, sans rien ajouter :",
      '"""',
      source,
      '"""',
    );
    if (attachmentCount > 0) {
      lines.push(
        "",
        attachmentCount > 1
          ? `${attachmentCount} autres pages du MÊME cours sont jointes en pièces jointes ci-dessous : lis-les aussi intégralement, elles font partie du même document complet que le texte ci-dessus.`
          : "Une autre page du MÊME cours est jointe en pièce jointe ci-dessous : lis-la aussi intégralement, elle fait partie du même document complet que le texte ci-dessus.",
      );
    }
  } else if (attachmentCount > 1) {
    lines.push(
      "",
      `Le cours est composé de ${attachmentCount} fichiers joints en pièces jointes, qui forment ENSEMBLE un seul document complet (pages successives d'un même cours). Lis-les tous intégralement avant de répondre et résume UNIQUEMENT ce qu'ils contiennent, tous fichiers confondus : n'ajoute aucune notion, définition ou exemple absent de ces documents.`,
    );
  } else if (attachmentCount === 1) {
    lines.push(
      "",
      "Le contenu du cours est joint en pièce jointe (fichier). Lis-le en entier et résume UNIQUEMENT ce qu'il contient : n'ajoute aucune notion, définition ou exemple absent du document.",
    );
  } else {
    lines.push(
      "",
      "Aucun contenu de cours n'a été fourni : appuie-toi sur le programme scolaire français pour ce chapitre.",
    );
  }

  return lines.join("\n");
}

export async function summarizeCourse(
  request: SummaryRequest,
  dict: Dictionary,
  locale: Locale,
  sourceFiles?: SummarizeSourceFile[],
): Promise<{ summary: CourseSummary; usage: AiUsageTokens }> {
  const attachments = sourceFiles ?? [];
  const prompt = buildSummaryPrompt(request, attachments.length, locale);

  // Plusieurs fichiers joints (jusqu'à 5) dans le MÊME message utilisateur :
  // l'IA les lit tous ensemble comme un seul document, pas page par page.
  const input: string | ResponseInput = attachments.length > 0
    ? [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            ...attachments.map((file) => ({
              type: "input_file" as const,
              filename: file.filename,
              file_data: file.dataUrl,
            })),
          ],
        },
      ]
    : prompt;

  const response = await getOpenAIClient().responses.parse({
    model: OPENAI_MODEL,
    instructions: SUMMARY_SYSTEM_PROMPT + languageDirective(locale),
    input,
    max_output_tokens: 4000,
    text: { format: zodTextFormat(aiSummarySchema, "course_summary") },
  });

  const data = requireParsed(
    response.output_parsed,
    dict.ai.noOutput(dict.ai.labelSummary),
  );

  const summary: CourseSummary = {
    title: data.title,
    subject: request.subject,
    level: request.level,
    chapter: request.chapter?.trim() || undefined,
    theme: request.theme?.trim() ?? "",
    styleLabel: request.style,
    pageCountLabel: request.pageCount,
    status: "Prêt",
    sections: data.sections.map((section) => ({
      heading: section.heading,
      paragraphs: section.paragraphs ?? undefined,
      bullets: section.bullets?.map((bullet) => ({
        lead: bullet.lead ?? undefined,
        text: bullet.text,
      })),
      subsections: section.subsections.map((sub) => ({
        heading: sub.heading,
        paragraphs: sub.paragraphs ?? undefined,
        bullets: sub.bullets?.map((bullet) => ({
          lead: bullet.lead ?? undefined,
          text: bullet.text,
        })),
      })),
    })),
    keyConcepts: data.keyConcepts,
    definitions: data.definitions,
    keyPoints: data.keyPoints,
    generatedBy: "EduIA",
    generatedAt: new Date().toISOString(),
    pagesSummarized: estimatePageCount(request.sourceText),
  };

  return { summary, usage: readUsage(response) };
}

// ───────────────────────── B. Générer une épreuve ─────────────────────────

/** Traduction des paliers de `EXAM_DIFFICULTIES` en consigne pour l'IA. */
const EXAM_DIFFICULTY_PROMPTS: Record<string, string> = {
  Progressive:
    "progressive — environ 40 % facile, 40 % moyen, 20 % difficile, du plus simple au plus exigeant",
  Facile:
    "plutôt facile — surtout des questions faciles et moyennes, quelques questions un peu plus exigeantes en fin d'épreuve",
  Moyenne:
    "moyenne — équilibre entre questions faciles, moyennes et difficiles, toujours progressif",
  Difficile:
    "exigeante — davantage de questions moyennes et difficiles, mais l'épreuve commence toujours par des questions accessibles",
};

function buildExamPrompt(
  request: ExamRequest,
  attachmentCount: number,
  locale: Locale,
): string {
  const theme = request.theme?.trim();

  const lines = [
    `Matière : ${request.subject}`,
    `Niveau : ${request.level}`,
  ];
  if (theme) lines.push(`Chapitre / thème : ${theme}`);
  lines.push(
    `Type d'épreuve : ${request.examType}`,
    `Nombre total de questions : ${request.questionCount} (respecte ce nombre, ±1 au maximum, toutes parties confondues ; un bloc vrai/faux ou un exercice à sous-questions compte pour une question)`,
    `Type de questions : ${request.questionMix}`,
    `Durée prévue : ${request.durationLabel} (calibre la quantité de travail sur cette durée)`,
    `Barème total : EXACTEMENT ${request.totalPoints} points (somme de toutes les questions)`,
    `Difficulté demandée : ${EXAM_DIFFICULTY_PROMPTS[request.difficulty] ?? request.difficulty}`,
    `Langue de l'épreuve : ${request.language === "en" ? "anglais (toute l'épreuve en anglais)" : "français (toute l'épreuve en français)"}`,
    `Longueur cible : ${request.pageCount}`,
  );

  const activeOptions = activeOptionLabels(request.options, locale);
  if (activeOptions.length > 0) {
    lines.push(`Options : ${activeOptions.join(", ")}.`);
  }

  const source = truncate(request.sourceText, MAX_SOURCE_CHARS);
  if (source) {
    lines.push(
      "",
      "Voici le contenu EXACT du cours. Chaque question de l'épreuve doit porter sur une notion présente ci-dessous et pouvoir y trouver sa réponse :",
      '"""',
      source,
      '"""',
      "",
      "Remplis aussi `sourceOutline` avec un condensé fidèle des notions examinables de ce cours (voir consigne du schéma).",
    );
    if (attachmentCount > 0) {
      lines.push(
        "",
        attachmentCount > 1
          ? `${attachmentCount} autres pages du MÊME cours sont jointes en pièces jointes ci-dessous : lis-les aussi intégralement, elles font partie du même document complet que le texte ci-dessus.`
          : "Une autre page du MÊME cours est jointe en pièce jointe ci-dessous : lis-la aussi intégralement, elle fait partie du même document complet que le texte ci-dessus.",
      );
    }
  } else if (attachmentCount > 1) {
    lines.push(
      "",
      `Le cours est composé de ${attachmentCount} fichiers joints en pièces jointes, qui forment ENSEMBLE un seul document complet (pages successives d'un même cours). Lis-les tous intégralement. Chaque question doit porter sur une notion réellement présente dans ces documents (tous fichiers confondus) et pouvoir y trouver sa réponse ; n'ajoute aucune notion absente.`,
      "Remplis aussi `sourceOutline` avec un condensé fidèle des notions examinables de l'ensemble des documents (voir consigne du schéma).",
    );
  } else if (attachmentCount === 1) {
    lines.push(
      "",
      "Le contenu du cours est joint en pièce jointe (fichier). Lis-le en entier. Chaque question doit porter sur une notion réellement présente dans ce document et pouvoir y trouver sa réponse ; n'ajoute aucune notion absente.",
      "Remplis aussi `sourceOutline` avec un condensé fidèle des notions examinables du document (voir consigne du schéma).",
    );
  } else {
    lines.push(
      "",
      "Aucun contenu de cours n'a été fourni : génère l'épreuve à partir du programme scolaire correspondant à la matière, au niveau et au thème indiqués, et laisse `sourceOutline` vide.",
    );
  }

  return lines.join("\n");
}

export async function generateExam(
  request: ExamRequest,
  dict: Dictionary,
  locale: Locale,
  sourceFiles?: SummarizeSourceFile[],
): Promise<{
  exam: GeneratedExam;
  usage: AiUsageTokens;
  /**
   * Ancrage documentaire à persister sur l'épreuve (`exams.sourceText`) : le
   * texte du cours fourni (tronqué) sinon le condensé fidèle produit par l'IA.
   * `null` si l'épreuve a été générée sans document.
   */
  sourceGrounding: string | null;
}> {
  // Langue de l'ÉPREUVE (choisie dans le formulaire, par défaut celle de
  // l'interface) — distincte de `locale`, qui ne sert qu'aux messages d'erreur.
  const language: Locale = request.language ?? locale;
  const attachments = sourceFiles ?? [];
  const prompt = buildExamPrompt(request, attachments.length, language);

  // Plusieurs fichiers joints (jusqu'à 5) dans le MÊME message utilisateur :
  // l'IA les lit tous ensemble comme un seul document, pas page par page.
  const input: string | ResponseInput = attachments.length > 0
    ? [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            ...attachments.map((file) => ({
              type: "input_file" as const,
              filename: file.filename,
              file_data: file.dataUrl,
            })),
          ],
        },
      ]
    : prompt;

  const response = await getOpenAIClient().responses.parse({
    model: OPENAI_MODEL,
    instructions: EXAM_SYSTEM_PROMPT + languageDirective(language),
    input,
    // Analyse du cours + condensé `sourceOutline` + documents à analyser +
    // corrigés : marge de sortie élargie.
    max_output_tokens: 12000,
    text: { format: zodTextFormat(aiExamSchema, "generated_exam") },
  });

  const data = requireParsed(
    response.output_parsed,
    dict.ai.noOutput(dict.ai.labelExam),
  );

  const generatedParts: ExamPart[] = data.parts
    .filter((part) => part.questions.length > 0)
    .map((part) => ({
      title: cleanPartTitle(part.title),
      points: part.points,
      instructions: part.instructions?.trim() || undefined,
      documents: part.documents
        ?.map((doc) => ({
          title: doc.title?.trim() || undefined,
          content: doc.content?.trim() || undefined,
          table:
            doc.table && doc.table.columns.length > 0 && doc.table.rows.length > 0
              ? doc.table
              : undefined,
          source: doc.source?.trim() || undefined,
        }))
        .filter((doc) => doc.content || doc.table),
      questions: part.questions.map((question) => ({
        kind: question.kind,
        prompt: cleanQuestionPrompt(question.prompt),
        points: question.points,
        choices: question.choices ?? undefined,
        subQuestions: question.subQuestions?.map(cleanSubQuestion),
        expectedAnswer: question.expectedAnswer ?? undefined,
        statements: question.statements ?? undefined,
        answerLines:
          question.kind === "open"
            ? Math.max(2, Math.min(20, Math.round(question.answerLines)))
            : 0,
        difficulty: question.difficulty,
      })),
    }));

  // Barème EXACT garanti, quel que soit l'arrondi de l'IA.
  const parts = balanceExamPoints(generatedParts, request.totalPoints);

  const exam: GeneratedExam = {
    title: data.title,
    subject: request.subject,
    level: request.level,
    theme: request.theme,
    examType: request.examType,
    durationLabel: request.durationLabel,
    pageCountLabel: request.pageCount,
    questionCount: parts.reduce((total, part) => total + part.questions.length, 0),
    dateLabel: localizedDateLabel(new Date(), language),
    parts,
    totalPoints: parts.reduce((total, part) => total + part.points, 0),
    language,
    institution: request.institution.trim() || undefined,
    generalInstructions: data.generalInstructions
      .map((line) => line.trim())
      .filter(Boolean),
    difficulty: request.difficulty,
    status: "Prête",
    generatedBy: "EduIA",
    generatedAt: new Date().toISOString(),
  };

  // Texte du cours fourni (le plus fidèle) sinon condensé fidèle de l'IA.
  const sourceGrounding =
    truncate(request.sourceText, MAX_SOURCE_CHARS) ??
    (data.sourceOutline?.trim() ? data.sourceOutline.trim() : null);

  return { exam, usage: readUsage(response), sourceGrounding };
}

// ───────────────────────── C. Corriger une épreuve ─────────────────────────

export interface GradeExamInput extends CorrectionRequest {
  /** Contenu texte de l'épreuve de référence (questions + corrigé), si disponible. */
  examReferenceText?: string | null;
  /**
   * Ancrage documentaire de l'épreuve (`exams.sourceText`) : contenu du cours
   * dont l'épreuve est issue. Sert à garder le corrigé fidèle au document.
   */
  documentContext?: string | null;
}

type CorrectionMode = NonNullable<ExamCorrection["mode"]>;

function buildGradePrompt(
  request: GradeExamInput,
  answerText: string,
  hasAttachment: boolean,
  mode: CorrectionMode,
): string {
  const lines = [
    `Épreuve : ${request.selectedExam || "non précisée"}`,
    `Niveau : ${request.level}`,
    `Barème demandé : ${request.scale}`,
    `Niveau d'exigence : ${request.strictness}`,
    `Longueur cible du corrigé : ${request.pageCount}`,
  ];

  const activeOptions = activeOptionKeys(request.options);
  if (activeOptions.length > 0) {
    lines.push(`Éléments à inclure : ${activeOptions.join(", ")}.`);
  }

  lines.push(
    "Dans chaque `prompt` renvoyé, reprends l'énoncé de la question SANS le numéro qui le précède dans le texte ci-dessous (ex. \"Quelle est la capitale ?\", jamais \"1. Quelle est la capitale ?\" ni \"A.1 Quelle est la capitale ?\") : la numérotation est déjà affichée séparément par l'application.",
  );

  const reference = truncate(request.examReferenceText, MAX_SOURCE_CHARS);
  const documentContext = truncate(request.documentContext, MAX_SOURCE_CHARS);

  if (documentContext) {
    lines.push(
      "",
      "DOCUMENT SOURCE dont l'épreuve est issue — les réponses attendues, le barème et les explications doivent en découler STRICTEMENT :",
      '"""',
      documentContext,
      '"""',
    );
  }

  if (mode === "answer-key") {
    // Aucune copie : on rédige le corrigé type de l'épreuve sélectionnée.
    lines.push(
      "",
      "Voici l'ÉPREUVE générée par l'application (énoncés + éléments de corrigé) :",
      '"""',
      reference ?? "",
      '"""',
      "",
      "Il n'y a AUCUNE copie d'élève. À partir du document source ci-dessus ET de cette épreuve, produis le CORRIGÉ TYPE complet :",
      "- pour CHAQUE question de l'épreuve, remplis `expectedAnswer` avec la réponse complète et exacte attendue (issue du document), et `feedback` avec l'explication de la démarche (justifications, méthode, pièges fréquents) ;",
      "- n'invente rien : n'utilise que ce qui figure dans le document source et l'épreuve ;",
      '- laisse `studentAnswer` vide (""), `pointsEarned` à 0, `verdict` à "correct", et `pointsMax` = barème de la question ;',
      "- laisse `strengths` et `improvements` vides ;",
      '- `summary` = courte présentation du corrigé ; `appreciation` = "Corrigé type" ;',
      "- `advice` = conseils de méthode pour réussir ce type d'épreuve.",
    );
    return lines.join("\n");
  }

  if (reference) {
    lines.push("", "Voici l'ÉPREUVE de référence avec son corrigé :", '"""', reference, '"""');
    lines.push(
      "",
      "Détermine d'abord `hasRealAnswers` en comparant le contenu ci-dessous à cette épreuve de référence : vrai seulement s'il contient de vraies réponses d'élève, distinctes des énoncés. " +
        "Si le contenu est seulement l'épreuve elle-même (énoncés, avec ou sans corrigé) resoumise sans réponse ajoutée, un document vide, ou tout autre contenu qui n'est pas une tentative de réponse, mets `hasRealAnswers` à faux et rédige le corrigé type de chaque question (voir consignes système) — ne mentionne alors jamais de copie ou de réponse d'élève absente. En cas de doute, mets `hasRealAnswers` à vrai.",
    );
  } else if (!documentContext) {
    lines.push(
      "",
      "Aucune épreuve de référence n'a été fournie : identifie la matière et le thème à partir du contenu fourni, et corrige en te basant sur le programme scolaire français. Le contenu fourni est la copie réelle de l'élève (`hasRealAnswers` = vrai).",
    );
  } else {
    lines.push(
      "",
      "Aucune épreuve de référence n'a été fournie (seulement le document source ci-dessus) : le contenu fourni est la copie réelle de l'élève (`hasRealAnswers` = vrai).",
    );
  }

  if (answerText) {
    lines.push("", "Voici le contenu fourni à examiner :", '"""', answerText, '"""');
  } else if (hasAttachment) {
    lines.push(
      "",
      "Le contenu à examiner est joint en pièce jointe (fichier) : lis-le intégralement avant de déterminer `hasRealAnswers`.",
    );
  }

  return lines.join("\n");
}

export async function gradeExam(
  request: GradeExamInput,
  dict: Dictionary,
  locale: Locale,
  sourceFile?: SummarizeSourceFile,
): Promise<{ correction: ExamCorrection; usage: AiUsageTokens }> {
  const answer =
    truncate(request.answerSourceText, MAX_SOURCE_CHARS) ??
    truncate(request.answerText, MAX_SOURCE_CHARS);
  const hasStudentWork = Boolean(answer) || Boolean(sourceFile);

  // Sans aucun contenu fourni : corrigé type déterministe (aucun appel ne peut
  // trancher "hasRealAnswers" puisqu'il n'y a rien à examiner). Avec un
  // contenu fourni (texte/fichier), c'est le modèle qui détermine s'il s'agit
  // de vraies réponses d'élève ou d'une simple resoumission de l'épreuve —
  // voir `hasRealAnswers` plus bas : ne JAMAIS présumer "graded" seulement
  // parce qu'un fichier/texte a été envoyé.
  const requestMode: CorrectionMode = hasStudentWork ? "graded" : "answer-key";
  const hasReference = Boolean(truncate(request.examReferenceText, MAX_SOURCE_CHARS));
  if (requestMode === "answer-key" && !hasReference) {
    throw new AIGenerationError("", 400, "noAnswerToGrade");
  }

  const prompt = buildGradePrompt(request, answer ?? "", Boolean(sourceFile), requestMode);
  const input: string | ResponseInput = sourceFile
    ? [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            {
              type: "input_file",
              filename: sourceFile.filename,
              file_data: sourceFile.dataUrl,
            },
          ],
        },
      ]
    : prompt;

  const response = await getOpenAIClient().responses.parse({
    model: OPENAI_MODEL,
    instructions:
      (requestMode === "answer-key"
        ? ANSWER_KEY_SYSTEM_PROMPT
        : hasReference
          ? CORRECTION_WITH_REFERENCE_SYSTEM_PROMPT
          : CORRECTION_NO_REFERENCE_SYSTEM_PROMPT) + languageDirective(locale),
    input,
    // Un corrigé détaillé (N questions × réponse attendue + feedback + conseils)
    // est le plus verbeux des trois outils — marge large pour éviter la troncature.
    max_output_tokens: 8000,
    text: { format: zodTextFormat(aiCorrectionSchema, "exam_correction") },
  });

  const parsed = requireParsed(
    response.output_parsed,
    dict.ai.noOutput(dict.ai.labelCorrection),
  );
  const data = {
    ...parsed,
    questions: parsed.questions.map((question) => ({
      ...question,
      prompt: stripLeadingNumbering(question.prompt),
    })),
  };

  // `requestMode === "answer-key"` (aucun contenu envoyé) reste déterministe.
  // `requestMode === "graded"` AVEC épreuve de référence : requalifié par le
  // modèle via `hasRealAnswers` (un élève qui renvoie l'épreuve elle-même
  // sans y avoir répondu doit recevoir le corrigé type, jamais un message du
  // style « réponse d'élève absente »). SANS référence, on ne peut pas
  // comparer fiablement le contenu à "l'épreuve elle-même" : `hasRealAnswers`
  // est ignoré et le mode reste "graded" (comportement historique, pour ne
  // prendre aucun risque de faux négatif sur la correction libre).
  const mode: CorrectionMode =
    requestMode === "answer-key"
      ? "answer-key"
      : hasReference && !data.hasRealAnswers
        ? "answer-key"
        : "graded";

  const maxScore = data.questions.reduce((total, question) => total + question.pointsMax, 0);
  const score =
    mode === "answer-key"
      ? 0
      : data.questions.reduce((total, question) => total + question.pointsEarned, 0);

  const questions =
    mode === "answer-key"
      ? data.questions.map((question) => ({
          ...question,
          studentAnswer: "",
          pointsEarned: 0,
          verdict: "correct" as const,
        }))
      : data.questions;

  const correction: ExamCorrection = {
    examTitle: request.selectedExam || dict.activity.types["Épreuve"],
    subject: data.subject,
    level: request.level,
    theme: data.theme,
    dateLabel: localizedDateLabel(new Date(), locale),
    mode,
    pageCountLabel: request.pageCount,
    score,
    maxScore: maxScore || 20,
    // Le modèle renvoie parfois une phrase entière ici → on garde une forme brève.
    appreciation: shortLabel(data.appreciation),
    summary: data.summary,
    status: "Corrigée",
    questions,
    strengths: mode === "answer-key" ? [] : data.strengths,
    improvements: mode === "answer-key" ? [] : data.improvements,
    advice: data.advice,
    correctedBy: "EduIA",
    correctedAt: new Date().toISOString(),
  };

  return { correction, usage: readUsage(response) };
}

// ───────────────────────── D. Assistant IA (chat) ─────────────────────────

const ASSISTANT_SYSTEM_PROMPT =
  "Tu es l'Assistant IA d'EduIA, une plateforme d'apprentissage pour élèves. Tu es un tuteur pédagogique bienveillant, intégré directement dans EduIA (pas un chatbot générique) : les élèves te posent des questions sur leurs cours, leurs exercices ou des notions qu'ils ne comprennent pas. " +
  "Comportement attendu : explique plutôt que de te contenter de donner la réponse finale ; utilise un langage clair et adapté à un élève ; donne des exemples concrets quand c'est utile ; pour un exercice, décompose la résolution étape par étape au lieu de balancer la solution d'un bloc ; évite le jargon inutile et les réponses inutilement longues ou compliquées ; aide l'élève à comprendre et à progresser, pas seulement à obtenir un résultat. " +
  "Reste toujours bienveillant, encourageant et patient. " +
  "Réponds en texte simple et naturel, comme dans une conversation (paragraphes courts, listes à puces si utile pour une décomposition d'étapes). Ne réponds JAMAIS par du JSON ou un format structuré.";

/** Nombre max de tours d'historique renvoyés au modèle (limite le coût/latence). */
const MAX_ASSISTANT_TURNS = 20;

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Contexte optionnel du dernier cours résumé par l'élève (`getLatestCourseSummary`),
 * pour que l'Assistant puisse s'appuyer dessus si la question s'y rapporte — sans
 * dupliquer de logique : réutilise directement `CourseDocument`.
 */
export interface AssistantContext {
  subject: string;
  level: string;
  chapter?: string;
  theme?: string;
}

export async function askAssistant(
  messages: AssistantMessage[],
  context: AssistantContext | null,
  dict: Dictionary,
  locale: Locale,
): Promise<{ reply: string; usage: AiUsageTokens }> {
  let instructions = ASSISTANT_SYSTEM_PROMPT + languageDirective(locale);

  if (context?.subject?.trim()) {
    const parts = [`matière : ${context.subject}`];
    if (context.level?.trim()) parts.push(`niveau : ${context.level}`);
    if (context.chapter?.trim()) parts.push(`chapitre : ${context.chapter}`);
    if (context.theme?.trim()) parts.push(`thème : ${context.theme}`);
    instructions +=
      `\n\nContexte optionnel : le dernier cours que cet élève a résumé dans EduIA (${parts.join(", ")}). ` +
      "Utilise ce contexte UNIQUEMENT si la question de l'élève s'y rapporte manifestement ; sinon ignore-le et réponds normalement à sa question.";
  }

  const recentMessages = messages.slice(-MAX_ASSISTANT_TURNS);
  const input: ResponseInput = recentMessages.map((message) => ({
    role: message.role,
    content: truncate(message.content, 4000) ?? "",
  }));

  const response = await getOpenAIClient().responses.create({
    model: OPENAI_MODEL,
    instructions,
    input,
    max_output_tokens: 1500,
  });

  const reply = response.output_text?.trim();
  const data = requireParsed(
    reply && reply.length > 0 ? reply : null,
    dict.ai.noOutput(dict.assistant.assistantName),
  );

  return { reply: data, usage: readUsage(response) };
}
