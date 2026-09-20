/**
 * Tarif **indicatif** OpenAI, en USD par million de tokens. Sert uniquement à
 * afficher une estimation dans `/admin/ai` — ce n'est PAS une facture. Le coût
 * réel se lit sur le tableau de bord OpenAI. À ajuster si le modèle change
 * (`OPENAI_MODEL`).
 */
export const OPENAI_INDICATIVE_RATE_USD = {
  inputPerMillion: 0.25,
  outputPerMillion: 2,
} as const;

export function estimateOpenAiCostUsd(
  inputTokens: number,
  outputTokens: number,
): number {
  return (
    (inputTokens / 1_000_000) * OPENAI_INDICATIVE_RATE_USD.inputPerMillion +
    (outputTokens / 1_000_000) * OPENAI_INDICATIVE_RATE_USD.outputPerMillion
  );
}
