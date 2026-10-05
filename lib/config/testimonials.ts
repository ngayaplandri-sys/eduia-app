/**
 * Témoignages affichés sur la landing (section « Preuves »).
 *
 * VIDE VOLONTAIREMENT : aucun témoignage réel n'a encore été recueilli, et la
 * landing n'affiche jamais de faux avis. Dès qu'un élève ou un enseignant
 * accepte d'être cité, ajoute-le ici : la grille de témoignages apparaît
 * automatiquement (rien d'autre à modifier). Garde des citations courtes
 * (3 lignes maximum) et la langue d'origine du témoignage.
 */
export interface Testimonial {
  /** Prénom et initiale du nom, tels qu'acceptés par la personne. */
  name: string;
  /** Rôle affiché sous le nom (« Élève de Terminale », « Professeure de SVT »…). */
  role: string;
  quote: string;
  /** Photo facultative (chemin sous `public/`), avec l'accord de la personne. */
  avatar?: string;
}

export const testimonials: Testimonial[] = [];
