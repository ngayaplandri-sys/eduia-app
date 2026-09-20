"use client";

import * as React from "react";

/**
 * Révélation au scroll (fondu + léger décalage vertical), déclenchée une seule
 * fois quand l'élément entre dans le viewport. Vanilla `IntersectionObserver`
 * (aucune librairie d'animation dans ce projet) — le composant appelant bascule
 * lui-même ses classes Tailwind (`opacity`/`translate`/`transition`) selon la
 * valeur retournée, ce qui garde l'effet 100% CSS une fois déclenché.
 *
 * Pas de marge négative en bas du root (`rootMargin` par défaut) : un élément
 * qui se trouve tout près de la toute fin de la page (juste avant le pied de
 * page, par exemple) doit pouvoir déclencher sa révélation même quand la
 * fenêtre est déjà scrollée au maximum — une marge négative l'en empêcherait
 * dans ce cas précis, la page ne pouvant pas défiler plus loin.
 *
 * Repli SSR/no-JS : si le script échoue à s'hydrater, l'élément reste tel que
 * rendu côté serveur (cf. le composant appelant, qui applique la classe
 * "masqué" par défaut) — un contenu marketing en dessous du pli qui reste
 * invisible sans JS est un compromis acceptable ici, le reste de l'app
 * (formulaires, boutons) nécessitant de toute façon JavaScript.
 */
export function useInViewReveal<T extends HTMLElement>(
  options: IntersectionObserverInit = {},
) {
  const ref = React.useRef<T | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Différé au tick suivant : `setState` synchrone en tout début d'effet
      // déclenche des rendus en cascade — pattern déjà rencontré ailleurs.
      const id = window.setTimeout(() => setIsVisible(true), 0);
      return () => window.clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, ...options },
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `options` recréé à chaque rendu par l'appelant : capturé une fois au montage, pas re-souscrit.
  }, []);

  return { ref, isRevealed: isVisible };
}
