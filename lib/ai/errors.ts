import "server-only";
import {
  APIError,
  APIConnectionTimeoutError,
  APIConnectionError,
  AuthenticationError,
  BadRequestError,
  RateLimitError,
} from "openai";
// `LengthFinishReasonError` / `ContentFilterFinishReasonError` ne sont pas
// ré-exportés depuis l'entrée principale `openai` — seulement depuis ce sous-chemin.
import {
  LengthFinishReasonError,
  ContentFilterFinishReasonError,
} from "openai/core/error";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/** Erreur de génération contrôlée. `message` peut être une clé du dict `ai`. */
export class AIGenerationError extends Error {
  status: number;
  /** Clé de `dict.ai` à préférer au `message` brut, si fournie. */
  aiKey?: keyof Dictionary["ai"];

  constructor(
    message: string,
    status = 502,
    aiKey?: keyof Dictionary["ai"],
  ) {
    super(message);
    this.name = "AIGenerationError";
    this.status = status;
    this.aiKey = aiKey;
  }
}

/**
 * Traduit une erreur (OpenAI ou interne) en `{ status, message }` sûr à renvoyer
 * au client, dans la langue de l'utilisateur (`dict`).
 */
export function describeAIError(
  error: unknown,
  dict: Dictionary,
): { status: number; message: string } {
  const t = dict.ai;

  if (error instanceof AIGenerationError) {
    const message =
      error.aiKey && typeof t[error.aiKey] === "string"
        ? (t[error.aiKey] as string)
        : error.message;
    return { status: error.status, message };
  }
  if (error instanceof AuthenticationError) {
    return { status: 500, message: t.keyInvalid };
  }
  // Sortie structurée coupée par `max_output_tokens` (JSON incomplet) — n'hérite
  // PAS d'`APIError`, à intercepter avant le fallback générique.
  if (error instanceof LengthFinishReasonError) {
    return { status: 502, message: t.truncated };
  }
  if (error instanceof ContentFilterFinishReasonError) {
    return { status: 422, message: t.contentFiltered };
  }
  if (error instanceof RateLimitError) {
    if (
      error.code === "insufficient_quota" ||
      error.code === "credit_balance_exhausted" ||
      error.type === "insufficient_quota"
    ) {
      return { status: 503, message: t.serviceUnavailable };
    }
    return { status: 429, message: t.rateLimited };
  }
  if (error instanceof APIConnectionTimeoutError) {
    return { status: 504, message: t.timeout };
  }
  if (error instanceof APIConnectionError) {
    return { status: 502, message: t.connectionFailed };
  }
  if (error instanceof BadRequestError) {
    return { status: 400, message: t.badRequest };
  }
  if (error instanceof APIError) {
    return { status: 502, message: t.apiError };
  }
  return { status: 500, message: t.unexpected };
}
