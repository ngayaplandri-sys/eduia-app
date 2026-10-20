import "server-only";
import { isCountryCode } from "@/lib/config/countries";

/**
 * Pays de connexion d'une requête, d'après l'adresse IP — fourni gratuitement
 * par Vercel dans l'en-tête `x-vercel-ip-country` (code ISO alpha-2). Absent en
 * local et hors Vercel : `null`. Seul le PAYS est lu, jamais la ville ni la
 * position (statistiques par pays uniquement).
 */
export function detectCountry(headers: Headers): string | null {
  const value = headers.get("x-vercel-ip-country")?.trim().toUpperCase();
  return isCountryCode(value) ? value : null;
}
