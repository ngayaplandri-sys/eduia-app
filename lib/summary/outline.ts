import type { SummaryBullet, SummarySection } from "@/types";

/**
 * Plan numéroté d'un résumé de cours — source unique de la hiérarchie
 * « 1 GRANDE PARTIE → 1.1 Sous-titre → explication » partagée par l'affichage
 * (`SummaryResultPanel`), le PDF (`summary-pdf.ts`) et le texte brut
 * (`plain-text.ts`).
 *
 * La numérotation est calculée ici, jamais lue dans le texte de l'IA : un
 * préfixe recopié par le modèle (« 1. », « I- », « 1.2 », « A) ») est retiré
 * pour ne pas afficher « 1 1. Introduction ». Les résumés plus anciens, sans
 * `subsections`, restent valides : chaque section y devient une grande partie
 * avec son contenu directement dessous.
 */

export interface OutlineBlock {
  /** Numéro affiché : « 1 », « 2 »… pour une partie, « 1.1 »… pour une sous-partie. */
  number: string;
  heading: string;
  paragraphs: string[];
  bullets: SummaryBullet[];
}

export interface OutlinePart extends OutlineBlock {
  subsections: OutlineBlock[];
}

const LEADING_NUMBERING =
  /^\s*(?:\d{1,2}(?:\.\d{1,2})+\s+|\d{1,2}(?:\.\d{1,2})*\s*[.)\-–—:]\s*|[IVX]+\s*[.)\-–—]\s+|[A-Za-z]\s*[.)]\s+)/;

/** Retire une numérotation de plan recopiée en tête de titre. */
export function cleanHeading(heading: string): string {
  const cleaned = heading.replace(LEADING_NUMBERING, "").trim();
  return cleaned || heading.trim();
}

export function buildSummaryOutline(sections: SummarySection[]): OutlinePart[] {
  return sections.map((section, partIndex) => {
    const number = String(partIndex + 1);
    return {
      number,
      heading: cleanHeading(section.heading),
      paragraphs: section.paragraphs ?? [],
      bullets: section.bullets ?? [],
      subsections: (section.subsections ?? []).map((sub, subIndex) => ({
        number: `${number}.${subIndex + 1}`,
        heading: cleanHeading(sub.heading),
        paragraphs: sub.paragraphs ?? [],
        bullets: sub.bullets ?? [],
      })),
    };
  });
}
