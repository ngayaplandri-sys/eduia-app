import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Requête émise depuis l'app elle-même (protection CSRF des POST qui
 * engagent un paiement) : l'en-tête `Origin` doit désigner le même hôte que
 * la requête. Sans `Origin`, on se fie à `Sec-Fetch-Site` quand il existe.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Autorisation des tâches planifiées : `Authorization: Bearer <CRON_SECRET>`
 * (format envoyé par Vercel Cron et configurable sur cron-job.org).
 * Comparaison à temps constant ; refus si le secret n'est pas configuré.
 */
export function hasCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
