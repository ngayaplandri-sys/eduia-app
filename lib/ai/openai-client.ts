import "server-only";
import OpenAI from "openai";
import { AIGenerationError } from "./errors";

/**
 * Client OpenAI serveur uniquement. `server-only` fait planter le build si un
 * composant client importe ce module (même transitivement) : `OPENAI_API_KEY`
 * ne doit jamais atteindre le navigateur.
 *
 * Construit à la **première utilisation** (jamais au chargement du module) :
 * Next.js évalue le module des routes `app/api/**` au build pour en extraire la
 * configuration, donc une erreur levée au niveau module casserait `next build`
 * même quand la clé n'est pas encore renseignée.
 */
const globalForOpenAI = globalThis as unknown as { __eduiaOpenAI?: OpenAI };

export function getOpenAIClient(): OpenAI {
  if (globalForOpenAI.__eduiaOpenAI) return globalForOpenAI.__eduiaOpenAI;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AIGenerationError(
      "Clé OpenAI manquante côté serveur : renseigne OPENAI_API_KEY dans .env.local (voir .env.example).",
      500,
    );
  }

  // `timeout` coupe les réponses anormalement lentes ; `maxRetries` relance une
  // fois en cas d'erreur réseau/5xx transitoire. Au-delà, la route renvoie une
  // erreur claire à l'élève plutôt que de laisser la requête pendre.
  const client = new OpenAI({ apiKey, timeout: 90_000, maxRetries: 1 });
  if (process.env.NODE_ENV === "production") return client;
  globalForOpenAI.__eduiaOpenAI = client;
  return client;
}

/** Modèle utilisé pour les 3 générations — ajustable sans changer le code. */
export const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";
