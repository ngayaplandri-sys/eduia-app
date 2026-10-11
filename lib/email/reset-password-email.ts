import "server-only";
import { siteConfig } from "@/lib/config/site";
import type { OutgoingEmail } from "./send";

const COPY = {
  fr: {
    subject: `Réinitialise ton mot de passe ${siteConfig.name}`,
    greeting: (name: string) => (name ? `Bonjour ${name},` : "Bonjour,"),
    intro: `Tu as demandé à réinitialiser le mot de passe de ton compte ${siteConfig.name}. Clique sur le bouton ci-dessous pour en choisir un nouveau.`,
    cta: "Choisir un nouveau mot de passe",
    expiry: "Ce lien est valable 1 heure et ne peut servir qu'une fois.",
    ignore: "Si tu n'es pas à l'origine de cette demande, ignore cet e-mail : ton mot de passe actuel reste inchangé.",
    fallback: "Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :",
  },
  en: {
    subject: `Reset your ${siteConfig.name} password`,
    greeting: (name: string) => (name ? `Hi ${name},` : "Hi,"),
    intro: `You asked to reset the password of your ${siteConfig.name} account. Click the button below to choose a new one.`,
    cta: "Choose a new password",
    expiry: "This link is valid for 1 hour and can only be used once.",
    ignore: "If you didn't make this request, ignore this email: your current password stays unchanged.",
    fallback: "If the button doesn't work, copy this link into your browser:",
  },
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** E-mail « mot de passe oublié » (HTML + texte brut), dans la langue du compte. */
export function resetPasswordEmail({
  to,
  name,
  url,
  locale,
}: {
  to: string;
  name: string;
  url: string;
  locale: string | null | undefined;
}): OutgoingEmail {
  const copy = locale === "en" ? COPY.en : COPY.fr;
  const firstName = name.trim().split(/\s+/)[0] ?? "";
  const safeUrl = escapeHtml(url);

  const html = `<!doctype html>
<html lang="${locale === "en" ? "en" : "fr"}">
<body style="margin:0;padding:24px;background:#f5f4f8;font-family:Arial,Helvetica,sans-serif;color:#1f1b2d">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
    <tr><td>
      <p style="margin:0 0 24px;font-size:20px;font-weight:bold;color:#693fa8">${siteConfig.name}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6">${escapeHtml(copy.greeting(firstName))}</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6">${copy.intro}</p>
      <p style="margin:0 0 24px"><a href="${safeUrl}" style="display:inline-block;background:#693fa8;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:10px">${copy.cta}</a></p>
      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#5c566b">${copy.expiry}</p>
      <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#5c566b">${copy.ignore}</p>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#8a8499">${copy.fallback}<br><a href="${safeUrl}" style="color:#693fa8;word-break:break-all">${safeUrl}</a></p>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    copy.greeting(firstName),
    "",
    copy.intro,
    "",
    `${copy.cta} : ${url}`,
    "",
    copy.expiry,
    copy.ignore,
  ].join("\n");

  return { to, subject: copy.subject, html, text };
}
