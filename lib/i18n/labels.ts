import type { Dictionary } from "./dictionaries";

/**
 * Localisation, **au rendu**, des valeurs canoniques françaises stockées en base
 * ou dans les config (matières, niveaux, styles, types d'épreuve, libellés
 * d'activité…). Les valeurs elles-mêmes restent en français (BDD + prompts IA) ;
 * seul l'affichage est traduit. Une valeur inconnue est renvoyée telle quelle.
 */

function lookup(map: Record<string, string>, value: string): string {
  return map[value] ?? value;
}

export const localizeSubject = (v: string, d: Dictionary) =>
  lookup(d.options.subjects, v);
export const localizeLevel = (v: string, d: Dictionary) =>
  lookup(d.options.levels, v);
export const localizeSummaryStyle = (v: string, d: Dictionary) =>
  lookup(d.options.summaryStyles, v);
export const localizeSummaryDetail = (v: string, d: Dictionary) =>
  lookup(d.options.summaryDetail, v);
export const localizeExamType = (v: string, d: Dictionary) =>
  lookup(d.options.examTypes, v);
export const localizeExamMix = (v: string, d: Dictionary) =>
  lookup(d.options.examMix, v);
export const localizeGradingScale = (v: string, d: Dictionary) =>
  lookup(d.options.gradingScales, v);
export const localizeGradingStrictness = (v: string, d: Dictionary) =>
  lookup(d.options.gradingStrictness, v);
export const localizeRole = (role: string | null | undefined, d: Dictionary) =>
  role === "admin" ? d.options.roles.admin : d.options.roles.student;

export const localizeActivityType = (v: string, d: Dictionary) =>
  lookup(d.activity.types, v);
export const localizeActivityAction = (v: string, d: Dictionary) =>
  lookup(d.activity.actions, v);

/**
 * Statut d'activité : « Résumé prêt », « Corrigée »… sont traduits ; un score
 * (« 16/20 ») ou toute valeur inconnue passe tel quel.
 */
export const localizeActivityStatus = (v: string, d: Dictionary) =>
  lookup(d.activity.statuses, v);

/**
 * Méta d'activité (« PDF • 3 pages », « Mathématiques • 2 pages »). On traduit
 * la matière éventuelle et l'unité « page(s) » ; le reste est conservé.
 */
export function localizeActivityMeta(meta: string, d: Dictionary): string {
  return meta
    .split(" • ")
    .map((part) => {
      const pages = part.match(/^(\d+)\s+pages?$/);
      if (pages) {
        const n = Number(pages[1]);
        return `${n} ${d.activity.pageUnit(n)}`;
      }
      return d.options.subjects[part] ?? part;
    })
    .join(" • ");
}

/** « 3 pages » (valeur `PAGE_COUNTS`) → libellé localisé ; sinon inchangé. */
export function localizePageCount(value: string, d: Dictionary): string {
  const m = value.match(/^(\d+)\s+pages?$/);
  return m ? d.options.pageCountLabel(Number(m[1])) : value;
}
