import "server-only";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, OPENAI_MODEL } from "./openai-client";
import { AIGenerationError } from "./errors";
import { readUsage } from "./generate";
import { aiExamAnalysisSchema, type AIExamAnalysis } from "./schemas";
import type { AiUsageTokens } from "./usage";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { attachmentsToContent, type ExamAttachment } from "./attachments";

const ANALYSIS_INSTRUCTIONS =
  "Tu es EduIA. Un élève a importé un document dans « Corriger une épreuve » : il peut provenir de N'IMPORTE QUELLE source (ancien sujet, sujet donné par un professeur, autre établissement, autre plateforme, photo d'une feuille, capture d'écran, PDF, Word). Ne suppose jamais qu'il a été créé par EduIA. " +
  "Les pages sont fournies dans l'ordre (Page 1, Page 2…) et forment UN SEUL document. Ton unique rôle ici est de les ANALYSER, sans rien corriger ni résoudre. " +
  "(1) Lisibilité : pour chaque page reçue, indique si elle est lisible. « unreadable » seulement si presque rien n'est déchiffrable (photo floue, trop sombre, reflet, page coupée, page vide) ; « partial » si une part notable est illisible ; sinon « good ». Une page Word ou texte est toujours « good ». " +
  "(2) Nature : `isExam` vaut true si le document contient au moins une question, un exercice ou une consigne à traiter. " +
  "(3) Identification : matière, niveau ou classe seulement s'il est indiqué ou évident (sinon null), titre, thème, consignes générales. " +
  "(4) Barème : relève uniquement ce qui est ÉCRIT. Total de l'épreuve (« /20 », « sur 40 ») dans `totalPoints` ; points d'un exercice ou d'une partie entière dans `sections` ; points d'une question précise dans cette question. N'invente aucun point et ne recopie jamais les points d'un exercice sur l'une de ses questions : null quand rien n'est indiqué pour la question elle-même. " +
  "(5) Questions : liste toutes les questions à traiter, dans l'ordre, avec leur numérotation d'origine, leur exercice ou partie (`section`) et leur énoncé complet et fidèle (données chiffrées et contexte de l'exercice compris). Un titre d'exercice ou de partie (« Exercice 1 (6 points) ») n'est JAMAIS une question à part : ce sont ses questions numérotées qui sont listées. " +
  "(6) Documents : décris chaque texte, tableau, graphique, carte, schéma ou image utile à la résolution (valeurs lues, légendes, transcription). " +
  "(7) Réponses d'élève : `containsStudentAnswers` vaut true seulement si des réponses rédigées par un élève figurent sur le document. " +
  "Écris les formules en texte lisible (x², √2, a/b, H₂O), jamais en LaTeX. Réponds uniquement selon le schéma structuré demandé.";

/**
 * Analyse une épreuve importée (toutes ses pages ensemble). Appel rapide, sans
 * raisonnement étendu : il s'agit de lire et d'inventorier, pas de résoudre.
 * Ne prélève aucun crédit — le coût est porté par la correction qui suit.
 */
export async function analyzeExamDocument(
  attachments: ExamAttachment[],
  dict: Dictionary,
  timeoutMs = 120_000,
): Promise<{ analysis: AIExamAnalysis; usage: AiUsageTokens }> {
  const response = await getOpenAIClient().responses.parse(
    {
      model: OPENAI_MODEL,
      instructions: ANALYSIS_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Analyse ce document de ${attachments.length} page(s), dans l'ordre :`,
            },
            ...attachmentsToContent(attachments),
          ],
        },
      ],
      max_output_tokens: 12000,
      text: { format: zodTextFormat(aiExamAnalysisSchema, "exam_analysis") },
    },
    { timeout: timeoutMs, maxRetries: 0 },
  );

  if (!response.output_parsed) {
    throw new AIGenerationError(dict.ai.noOutput(dict.ai.labelCorrection), 502);
  }
  return { analysis: response.output_parsed, usage: readUsage(response) };
}
