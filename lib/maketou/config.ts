import "server-only";
import {
  MAKETOU_CURRENCY,
  MAKETOU_ITEMS,
  MAKETOU_TEST_CREDITS,
  MAKETOU_TEST_ITEM_KEY,
  findMaketouItem,
  retiredGrantForKey,
  type MaketouItem,
} from "./catalog";
import { isWellFormedApiKey } from "./client";

/**
 * Configuration Maketou, lue dans les variables d'environnement à chaque
 * appel (jamais figée au démarrage). Chaque problème nomme la variable en
 * cause, sans jamais afficher sa valeur.
 *
 *  - `MAKETOU_API_KEY` : clé API de la boutique (lire / créer des paniers) ;
 *  - `MAKETOU_PRODUCT_*` : identifiant public de chaque produit (une offre
 *    sans identifiant n'est simplement pas proposée à l'achat) ;
 *  - `APP_URL` (à défaut `BETTER_AUTH_URL`) : adresse publique de l'app, où
 *    Maketou renvoie l'acheteur ;
 *  - `MAKETOU_PRODUCT_TEST` + `MAKETOU_TEST_PRICE` : offre de test à petit
 *    prix, réservée aux admins (facultative).
 *
 * Seule la clé est nécessaire pour CONFIRMER un paiement : un problème de
 * produit ou d'adresse ne bloque jamais la confirmation ni le rapprochement.
 */

export interface MaketouConfigIssue {
  variable: string;
  problem: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valeur brute d'une variable, sans espaces autour (jamais renvoyée au client). */
function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function apiKeyIssue(): MaketouConfigIssue | null {
  const key = env("MAKETOU_API_KEY");
  if (!key) return { variable: "MAKETOU_API_KEY", problem: "absente" };
  if (!isWellFormedApiKey(key)) {
    return {
      variable: "MAKETOU_API_KEY",
      problem: "mal formée (espace, guillemet, # ou caractère non ASCII — commentaire sur la même ligne ?)",
    };
  }
  return null;
}

/** Adresse publique validée (origine `http(s)`, sans chemin, jamais localhost). */
export function resolveAppUrl(): { url: string } | { issue: MaketouConfigIssue } {
  const variable = env("APP_URL") ? "APP_URL" : "BETTER_AUTH_URL";
  const raw = env(variable).replace(/\/+$/, "");
  if (!raw) return { issue: { variable: "APP_URL", problem: "absente" } };
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { issue: { variable, problem: "n'est pas une URL absolue" } };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { issue: { variable, problem: "doit commencer par https://" } };
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    return { issue: { variable, problem: "doit être une origine seule, sans chemin ni paramètre" } };
  }
  if (["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) {
    return {
      issue: {
        variable,
        problem:
          "Maketou refuse localhost : utilise l'adresse publique (https://…), un tunnel (ngrok, cloudflared) ou http://localtest.me:3000 en local",
      },
    };
  }
  return { url: parsed.origin };
}

/** Offre de test (admins) si configurée : produit à petit prix, quelques crédits. */
function testItem(): (MaketouItem & { productDocumentId: string }) | null {
  const productDocumentId = env("MAKETOU_PRODUCT_TEST");
  const price = Number.parseInt(env("MAKETOU_TEST_PRICE"), 10);
  if (!productDocumentId || !Number.isInteger(price) || price <= 0) return null;
  return {
    key: MAKETOU_TEST_ITEM_KEY,
    envVar: "MAKETOU_PRODUCT_TEST",
    price,
    grant: { kind: "test", credits: MAKETOU_TEST_CREDITS },
    productDocumentId,
  };
}

/** Offre achetable : catalogue + identifiant de produit configuré. */
export function resolvePurchasableItem(
  key: string,
  options: { isAdmin: boolean },
): (MaketouItem & { productDocumentId: string }) | null {
  if (key === MAKETOU_TEST_ITEM_KEY) return options.isAdmin ? testItem() : null;
  const item = findMaketouItem(key);
  if (!item) return null;
  const productDocumentId = env(item.envVar);
  return productDocumentId ? { ...item, productDocumentId } : null;
}

/**
 * Ce qu'accorde une offre déjà payée : offre en vente, ancienne offre retirée
 * (panier ouvert avant le retrait) ou offre de test, même désactivée depuis.
 */
export function grantForItemKey(key: string): MaketouItem["grant"] | null {
  if (key === MAKETOU_TEST_ITEM_KEY) return { kind: "test", credits: MAKETOU_TEST_CREDITS };
  return findMaketouItem(key)?.grant ?? retiredGrantForKey(key);
}

/**
 * Offres réellement proposées à l'achat (clé + adresse valides et produit
 * configuré) — sert à activer ou non les boutons « Payer » de l'interface.
 */
export function purchasableItemKeys(options: { isAdmin: boolean }): string[] {
  if (apiKeyIssue() || "issue" in resolveAppUrl()) return [];
  const keys = MAKETOU_ITEMS.filter((item) => env(item.envVar)).map((item) => item.key);
  if (options.isAdmin && testItem()) keys.push(MAKETOU_TEST_ITEM_KEY);
  return keys;
}

/** Tous les problèmes de configuration (commande de contrôle, journaux). */
export function maketouConfigIssues(): MaketouConfigIssue[] {
  const issues: MaketouConfigIssue[] = [];
  const keyIssue = apiKeyIssue();
  if (keyIssue) issues.push(keyIssue);
  const app = resolveAppUrl();
  if ("issue" in app) issues.push(app.issue);
  for (const item of MAKETOU_ITEMS) {
    const id = env(item.envVar);
    if (!id) issues.push({ variable: item.envVar, problem: "absente (offre non proposée)" });
    else if (!UUID.test(id)) {
      issues.push({ variable: item.envVar, problem: "ne ressemble pas à un identifiant de produit (avertissement)" });
    }
  }
  if (env("MAKETOU_PRODUCT_TEST") && !testItem()) {
    issues.push({ variable: "MAKETOU_TEST_PRICE", problem: "doit être un entier positif (prix du produit de test)" });
  }
  if (!env("CRON_SECRET")) {
    issues.push({ variable: "CRON_SECRET", problem: "absente (le rapprochement planifié ne peut pas s'authentifier)" });
  }
  return issues;
}

export const maketouCurrency = MAKETOU_CURRENCY;
