import "server-only";

/**
 * Envoi d'e-mails transactionnels via l'API HTTP de Resend (pas de dépendance) :
 *  - `RESEND_API_KEY` : clé API Resend ;
 *  - `EMAIL_FROM`     : expéditeur, sur un domaine vérifié chez Resend
 *                       (ex. `EduIA <noreply@eduai.fyi>`) ;
 *  - `RESEND_API_URL` : facultatif, autre adresse d'API (tests locaux).
 * Sans ces variables, les fonctions qui envoient des e-mails (mot de passe
 * oublié) restent désactivées et l'interface l'indique.
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) throw new Error("envoi d'e-mails non configuré");

  const base = (process.env.RESEND_API_URL?.trim() || "https://api.resend.com").replace(/\/+$/, "");
  const response = await fetch(`${base}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend ${response.status} ${detail.slice(0, 200)}`);
  }
}
