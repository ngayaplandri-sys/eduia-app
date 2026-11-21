/**
 * Tarif **indicatif** OpenAI, en USD par million de tokens (gpt-5.4-mini, hors
 * remise du cache). Sert uniquement à afficher une estimation dans `/admin/ai`
 * — ce n'est PAS une facture. Le coût réel se lit sur le tableau de bord
 * OpenAI. À ajuster si le modèle change (`OPENAI_MODEL`).
 */
export const OPENAI_INDICATIVE_RATE_USD = {
  inputPerMillion: 0.75,
  outputPerMillion: 4.5,
} as const;

/** Voix du professeur (gpt-4o-mini-tts) : tarif indicatif OpenAI par minute d'audio. */
export const OPENAI_TTS_INDICATIVE_USD_PER_MINUTE = 0.015;

export function estimateOpenAiCostUsd(
  inputTokens: number,
  outputTokens: number,
): number {
  return (
    (inputTokens / 1_000_000) * OPENAI_INDICATIVE_RATE_USD.inputPerMillion +
    (outputTokens / 1_000_000) * OPENAI_INDICATIVE_RATE_USD.outputPerMillion
  );
}

export function estimateSpeechCostUsd(audioMs: number): number {
  return (audioMs / 60_000) * OPENAI_TTS_INDICATIVE_USD_PER_MINUTE;
}
