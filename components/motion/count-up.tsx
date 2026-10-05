"use client";

import * as React from "react";
import { observeOnce } from "@/lib/motion/observe-once";

const DURATION_MS = 1500;

/**
 * Valeur chiffrée qui « compte » jusqu'à sa cible à son entrée dans le
 * viewport (« 100 % », « 3 min », « 24/7 »…) : seul le nombre en tête de
 * chaîne s'anime, le reste (unité, suffixe) reste fixe. Le texte final est
 * rendu côté serveur (SEO, sans JS) et exposé tel quel aux lecteurs d'écran ;
 * l'animation écrit directement dans le DOM, sans re-rendu React. Aucune
 * animation pour une cible à 0 ou sous `prefers-reduced-motion`.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const match = value.match(/^(\d+)([\s\S]*)$/);
    if (!match) return;
    const target = Number(match[1]);
    const suffix = match[2];
    if (target === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    node.textContent = `0${suffix}`;
    const stop = observeOnce(node, () => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / DURATION_MS);
        const eased = 1 - Math.pow(1 - progress, 4);
        node.textContent = `${Math.round(target * eased)}${suffix}`;
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });

    return () => {
      stop();
      cancelAnimationFrame(frame);
      node.textContent = value;
    };
  }, [value]);

  return (
    <>
      {/* `key` : nouveau nœud si la valeur change (bascule de langue) — le
          texte animé est écrit hors de React, on ne réutilise jamais ce nœud. */}
      <span key={value} ref={ref} aria-hidden className={className}>
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
