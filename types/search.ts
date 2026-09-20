/** Nature d'un résultat de recherche — pilote l'icône et le regroupement. */
export type SearchResultType = "document" | "summary" | "exam" | "correction";

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subject: string;
  level: string;
  /** Date ISO 8601 (import ou génération). */
  date: string;
  /** Page à ouvrir pour ce résultat (`/resumer?id=…`, `/documents?q=…`…). */
  href: string;
}
