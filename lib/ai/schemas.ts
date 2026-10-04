import { z } from "zod";
import {
  EXAM_DEFAULT_TOTAL_POINTS,
  EXAM_DIFFICULTIES,
  EXAM_LANGUAGES,
} from "@/lib/config/tool-options";

/**
 * Schémas Zod utilisés à deux endroits :
 *  - valider le corps des routes `app/api/ai/*` (les requêtes construites par les
 *    panneaux `resumer/generer/corriger`, cf. `types/{summary,exam,correction}.ts`) ;
 *  - décrire la sortie structurée demandée à OpenAI (`zodTextFormat`, Structured
 *    Outputs). Ces schémas de sortie évitent `.optional()` : le mode strict des
 *    Structured Outputs exige que tous les champs soient présents, l'absence de
 *    valeur se modélise avec `.nullable()`.
 */

// ───────────────────────── Requêtes (corps des routes) ─────────────────────────

const optionsSchema = z.record(z.string(), z.boolean());

export const summaryRequestSchema = z.object({
  fileName: z.string().nullable(),
  sourceKind: z.string().nullable(),
  sourceText: z.string().nullable(),
  subject: z.string().min(1),
  level: z.string().min(1),
  // Chapitre / thème saisis librement par l'élève → jamais imposés, peuvent
  // rester vides (l'IA se rabat alors sur le contenu du cours importé).
  chapter: z.string().trim().max(200).default(""),
  theme: z.string().trim().max(200).default(""),
  style: z.string().min(1),
  pageCount: z.string().min(1),
  detailLevel: z.string().min(1),
  options: optionsSchema,
});

export const examRequestSchema = z.object({
  fileName: z.string().nullable(),
  sourceKind: z.string().nullable(),
  sourceText: z.string().nullable(),
  subject: z.string().min(1),
  level: z.string().min(1),
  // Chapitre / thème saisi librement par l'élève → jamais imposé, peut rester
  // vide (l'IA se rabat alors sur le contenu du cours importé / le programme).
  theme: z.string().trim().max(200).default(""),
  examType: z.string().min(1),
  questionCount: z.number().int().positive(),
  questionMix: z.string().min(1),
  durationLabel: z.string().min(1),
  pageCount: z.string().min(1),
  options: optionsSchema,
  // Barème total exact (20 par défaut), difficulté globale, langue de
  // rédaction et établissement facultatif — tous optionnels côté client.
  totalPoints: z.number().int().min(5).max(200).default(EXAM_DEFAULT_TOTAL_POINTS),
  difficulty: z.string().trim().min(1).max(40).default(EXAM_DIFFICULTIES[0]),
  language: z.enum(EXAM_LANGUAGES).default("fr"),
  institution: z.string().trim().max(120).default(""),
});

const assistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

export const assistantRequestSchema = z.object({
  // Historique complet de la conversation (message de l'élève le plus récent
  // en dernier) — le client garde l'état, la route reste sans état.
  messages: z.array(assistantMessageSchema).min(1).max(40),
});

export const gradeRequestSchema = z.object({
  selectedExam: z.string(),
  selectedExamId: z.string().trim().max(64).default(""),
  level: z.string().min(1),
  answerFileName: z.string().nullable(),
  answerSourceKind: z.string().nullable(),
  answerText: z.string(),
  answerSourceText: z.string().nullable(),
  scale: z.string().min(1),
  strictness: z.string().min(1),
  pageCount: z.string().min(1),
  options: optionsSchema,
  /**
   * Contenu texte de l'épreuve de référence (questions + corrigé), quand la page
   * appelante peut le fournir (ex. via une future recherche en base par id). `null`
   * si indisponible : la correction se fait alors sur les seules connaissances du
   * modèle.
   */
  examReferenceText: z.string().nullable().optional(),
});

// ───────────────────────── Sortie IA : résumé ─────────────────────────

const aiSummaryBulletSchema = z.object({
  lead: z.string().nullable(),
  text: z.string(),
});

/** Sous-partie d'une grande partie (affichée « 1.1 », « 1.2 »…). */
const aiSummarySubsectionSchema = z.object({
  heading: z
    .string()
    .describe("Sous-titre court, SANS numérotation (1.1, 1.2… est ajouté à l'affichage)."),
  paragraphs: z.array(z.string()).nullable(),
  bullets: z.array(aiSummaryBulletSchema).nullable(),
});

const aiSummarySectionSchema = z.object({
  heading: z
    .string()
    .describe("Titre de la grande partie, court, SANS numérotation (1, 2… est ajouté à l'affichage)."),
  paragraphs: z
    .array(z.string())
    .nullable()
    .describe("Au plus UNE phrase d'introduction de la grande partie, sinon null. Le contenu explicatif va dans `subsections`."),
  bullets: z
    .array(aiSummaryBulletSchema)
    .nullable()
    .describe("null : les puces vont dans les sous-parties."),
  subsections: z
    .array(aiSummarySubsectionSchema)
    .describe("Sous-parties de la grande partie (au moins 1, idéalement 2 à 4), chacune avec son sous-titre et TOUTE son explication."),
});

const aiSummaryDefinitionSchema = z.object({
  term: z.string(),
  definition: z.string(),
});

export const aiSummarySchema = z.object({
  title: z.string(),
  sections: z.array(aiSummarySectionSchema),
  keyConcepts: z.array(z.string()),
  definitions: z.array(aiSummaryDefinitionSchema),
  keyPoints: z.array(z.string()),
});

export type AISummaryOutput = z.infer<typeof aiSummarySchema>;

// ───────────────────────── Sortie IA : transcription d'une photo ─────────────────────────

/** Motif précis quand une photo n'est pas (entièrement) lisible. */
export const OCR_ISSUES = [
  "none",
  "blurry",
  "too_dark",
  "glare",
  "cropped",
  "no_text",
  "illegible_handwriting",
] as const;

export type OcrIssueCode = (typeof OCR_ISSUES)[number];

export const aiImageTranscriptionSchema = z.object({
  quality: z
    .enum(["good", "partial", "unreadable"])
    .describe(
      "good : tout le texte est déchiffrable. partial : texte globalement lisible mais certains passages ne le sont pas. unreadable : presque rien n'est déchiffrable, ou l'image ne contient pas de texte de cours.",
    ),
  issue: z
    .enum(OCR_ISSUES)
    .describe(
      "Cause principale quand quality vaut partial ou unreadable ; « none » quand quality vaut good.",
    ),
  text: z
    .string()
    .describe(
      "Transcription intégrale et fidèle du texte visible, dans sa langue d'origine. Chaîne vide si quality vaut unreadable.",
    ),
});

export type AIImageTranscription = z.infer<typeof aiImageTranscriptionSchema>;

// ───────────────────────── Sortie IA : épreuve ─────────────────────────

const aiExamChoiceSchema = z.object({
  letter: z.string(),
  text: z.string(),
  correct: z.boolean(),
});

const aiExamStatementSchema = z.object({
  text: z.string(),
  isTrue: z.boolean(),
});

const aiExamQuestionSchema = z.object({
  kind: z.enum(["qcm", "open", "truefalse"]),
  prompt: z
    .string()
    .describe("Énoncé de la question, SANS numéro (A.1, 1.… sont ajoutés à l'affichage)."),
  points: z.number().describe("Points de la question (multiple de 0,5)."),
  difficulty: z.enum(["easy", "medium", "hard"]),
  /** QCM uniquement (4 choix, un seul `correct: true`). */
  choices: z.array(aiExamChoiceSchema).nullable(),
  /** Question ouverte uniquement. */
  subQuestions: z
    .array(z.string())
    .nullable()
    .describe("Sous-questions d'un exercice/problème, SANS lettre ni numéro (a, b, c… ajoutés à l'affichage)."),
  /** Question ouverte uniquement — corrigé attendu. */
  expectedAnswer: z.string().nullable(),
  /** Vrai / Faux uniquement. */
  statements: z.array(aiExamStatementSchema).nullable(),
  answerLines: z
    .number()
    .int()
    .describe("Lignes d'espace réponse sur la copie : 0 pour QCM et Vrai/Faux, 2-4 pour une question courte, 5-10 pour un exercice/analyse, 12-20 pour une production écrite/composition/problème."),
});

const aiExamDocumentSchema = z.object({
  title: z.string().nullable(),
  content: z
    .string()
    .nullable()
    .describe("Texte du document ou de la situation, construit à partir du contenu du cours."),
  table: z
    .object({ columns: z.array(z.string()), rows: z.array(z.array(z.string())) })
    .nullable()
    .describe("Tableau de données tiré du cours (remplace un graphique ou une carte), sinon null."),
  source: z.string().nullable(),
});

const aiExamPartSchema = z.object({
  title: z
    .string()
    .describe("Titre de la partie SANS « Partie A » ni lettre (ex. « Connaissances et compréhension »)."),
  points: z.number(),
  instructions: z.string().nullable(),
  documents: z
    .array(aiExamDocumentSchema)
    .nullable()
    .describe("Documents/supports à exploiter dans cette partie (analyse de document, situation-problème), sinon null."),
  questions: z.array(aiExamQuestionSchema),
});

export const aiExamSchema = z.object({
  /**
   * Analyse préalable du cours (non affichée) : force le modèle à identifier
   * matière, niveau, chapitres, notions et compétences AVANT de rédiger.
   */
  analysis: z.object({
    subject: z.string(),
    level: z.string().nullable(),
    chapters: z.array(z.string()),
    keyNotions: z.array(z.string()),
    skills: z.array(z.string()).describe("Compétences évaluables (restituer, appliquer, analyser, argumenter…)."),
    plannedParts: z
      .array(z.string())
      .describe("Parties retenues pour CETTE matière (2 à 4), dans l'ordre : titre, raison pédagogique en quelques mots, nombre de questions et points prévus (les sommes doivent faire le nombre de questions et le barème demandés)."),
  }),
  title: z
    .string()
    .describe("Titre de l'évaluation (ex. « Évaluation de SVT »), sans pays, ministère ni système scolaire national."),
  generalInstructions: z
    .array(z.string())
    .describe("2 à 5 consignes générales courtes, adaptées à la matière."),
  /**
   * Ancrage documentaire : condensé FIDÈLE et dense des notions, définitions,
   * faits, dates et données examinables du document source, dans ses propres
   * termes. Réutilisé par « Corriger une épreuve » pour garder le corrigé fidèle
   * au document. Chaîne vide si aucun document n'a été fourni.
   */
  sourceOutline: z
    .string()
    .describe(
      "Condensé fidèle et dense de TOUTES les notions, définitions, faits, dates et données examinables présentes dans le document/cours fourni, dans ses propres termes. N'ajoute rien qui n'y figure pas. Chaîne vide si aucun document n'est fourni.",
    ),
  parts: z.array(aiExamPartSchema),
});

export type AIExamOutput = z.infer<typeof aiExamSchema>;

// ───────────────────────── Sortie IA : correction ─────────────────────────

const aiCorrectionQuestionSchema = z.object({
  prompt: z.string(),
  studentAnswer: z.string(),
  expectedAnswer: z
    .string()
    .describe(
      "Réponse/corrigé attendu. Pour une épreuve EXCLUSIVEMENT mathématique : jamais seulement le résultat final — inclut la formule utilisée, les données substituées et termine par la réponse finale clairement indiquée.",
    ),
  pointsEarned: z.number(),
  pointsMax: z.number(),
  verdict: z.enum(["correct", "partial", "incorrect"]),
  feedback: z
    .string()
    .describe(
      "Explication pédagogique de la réponse. Pour une épreuve EXCLUSIVEMENT mathématique : détaille obligatoirement le raisonnement complet (formule, données substituées, calcul étape par étape avec une courte explication à chaque étape) puis termine par la réponse finale clairement indiquée — jamais seulement le résultat final.",
    ),
});

export const aiCorrectionSchema = z.object({
  /** Matière identifiée à partir de l'épreuve / de la copie. */
  subject: z.string(),
  /** Chapitre / thème identifié. */
  theme: z.string(),
  /**
   * `true` uniquement si le contenu fourni contient de vraies réponses
   * rédigées par un élève. `false` si aucune copie n'a été fournie, ou si le
   * contenu fourni n'est que l'épreuve elle-même (resoumise sans réponse) —
   * dans ce cas le modèle doit produire un corrigé type plutôt que noter.
   */
  hasRealAnswers: z
    .boolean()
    .describe(
      "true UNIQUEMENT si le contenu fourni (texte ou fichier) contient de VRAIES réponses rédigées par un élève à au moins une question, clairement distinctes des énoncés. false si aucune réponse n'a été rédigée — par exemple si le contenu fourni est seulement l'épreuve elle-même (énoncés, avec ou sans corrigé, mais sans réponse d'élève), un document vide, une resoumission de l'épreuve générée sans réponse ajoutée, ou tout contenu qui n'est pas une tentative de réponse.",
    ),
  summary: z
    .string()
    .describe("Synthèse d'ensemble de la copie, 1 à 3 phrases maximum."),
  appreciation: z
    .string()
    .describe(
      "Appréciation TRÈS courte : 1 à 3 mots seulement (ex. « Bien », « Assez bien », « Insuffisant », « Excellent »). Jamais une phrase.",
    ),
  questions: z.array(aiCorrectionQuestionSchema),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  advice: z.array(z.string()),
});

export type AICorrectionOutput = z.infer<typeof aiCorrectionSchema>;
