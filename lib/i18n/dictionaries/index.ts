import type { Locale } from "../config";
import { fr, type Dictionary } from "./fr";
import { en } from "./en";

/**
 * Les deux dictionnaires sont livrés ensemble (côté serveur ET dans le bundle
 * client) pour permettre au provider de basculer la langue **instantanément**,
 * sans aller-retour réseau.
 */
export const dictionaries: Record<Locale, Dictionary> = { fr, en };

export type { Dictionary };
