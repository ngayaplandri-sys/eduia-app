"use client";

/**
 * Un seul `IntersectionObserver` partagé par toute la page : chaque élément
 * inscrit déclenche son rappel UNE fois, la première fois qu'il entre dans le
 * viewport (révélations au scroll, compteurs animés…). Un observateur par
 * élément fonctionnerait aussi, mais la landing en déclare plusieurs dizaines.
 *
 * Pas de marge négative en bas du viewport : un élément situé tout en bas de
 * la page doit pouvoir se révéler même quand la page ne peut plus défiler.
 */
type Callback = () => void;

const callbacks = new Map<Element, Callback>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const callback = callbacks.get(entry.target);
        callbacks.delete(entry.target);
        observer?.unobserve(entry.target);
        callback?.();
      }
    },
    { threshold: 0.14 },
  );
  return observer;
}

/** Inscrit `element` ; renvoie la fonction de désinscription (nettoyage d'effet). */
export function observeOnce(element: Element, callback: Callback): () => void {
  if (typeof IntersectionObserver === "undefined") {
    callback();
    return () => {};
  }
  callbacks.set(element, callback);
  getObserver().observe(element);
  return () => {
    callbacks.delete(element);
    observer?.unobserve(element);
  };
}
