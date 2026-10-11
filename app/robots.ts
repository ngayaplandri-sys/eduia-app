import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";

/**
 * robots.txt : seules les pages publiques (landing, connexion, inscription)
 * sont à indexer ; l'espace élève, l'admin, les API et le retour de paiement
 * sont privés (et de toute façon protégés par session côté serveur).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/signup"],
      disallow: [
        "/api/",
        "/admin",
        "/billing/",
        "/onboarding",
        "/dashboard",
        "/resumer",
        "/generer",
        "/corriger",
        "/documents",
        "/historique",
        "/assistant",
        "/premium",
        "/parametres",
        "/aide",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
