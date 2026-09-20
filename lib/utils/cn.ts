import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fusionne des classes conditionnelles (clsx) puis dédoublonne les utilitaires
 * Tailwind en conflit (tailwind-merge). À utiliser dans tous les composants.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
