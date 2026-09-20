export const siteConfig = {
  name: "EduIA",
  tagline: "Ton assistant d'apprentissage",
  description:
    "EduIA est un assistant d'apprentissage basé sur l'intelligence artificielle : importe tes cours, génère des épreuves adaptées, corrige tes réponses et progresse chaque jour.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export type SiteConfig = typeof siteConfig;
