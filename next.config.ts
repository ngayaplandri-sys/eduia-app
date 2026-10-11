import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// CSP sans nonce (voir node_modules/next/dist/docs/.../content-security-policy.md,
// section « Without Nonces ») : le nonce imposerait le rendu dynamique de
// TOUTES les pages (plus de génération statique/PPR) pour un gain marginal ici
// — l'app n'a qu'un seul <script> inline, statique et sans donnée utilisateur
// (anti-FOUC du thème, voir app/layout.tsx). 'unsafe-inline' reste nécessaire
// pour ce script ainsi que pour les styles inline React (`style={{...}}`).
// `img-src` autorise en plus googleusercontent.com : `user.image` (photo de
// profil Google OAuth, voir lib/auth.ts) pointe vers ce domaine, affichée
// telle quelle (Avatar, bande de réassurance de la landing…) sans jamais la
// re-héberger côté serveur.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://*.googleusercontent.com;
  font-src 'self' data:;
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Caméra autorisée pour l'app elle-même seulement (« Scanner avec la
  // caméra » : cours, épreuves, copies), jamais pour un contenu tiers intégré.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: cspHeader },
  // Ignoré par les navigateurs si reçu en HTTP (dev) — inoffensif à laisser actif.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  // Ne pas annoncer le framework/version aux scanners (`X-Powered-By: Next.js`).
  poweredByHeader: false,
  // `mammoth` (extraction du texte des .docx) fait des `require` Node.js : on le
  // laisse hors du bundle serveur pour éviter les avertissements de résolution.
  serverExternalPackages: ["mammoth"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
