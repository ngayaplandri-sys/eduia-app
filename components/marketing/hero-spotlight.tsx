"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Halo qui suit le curseur (desktop, pointeur fin uniquement — voir l'utilitaire
 * `scene-spotlight` dans `globals.css`, qui gère seule le repli tactile/reduced-
 * motion). Écrit directement les variables CSS `--mx`/`--my` sur le nœud DOM
 * plutôt que de passer par `useState` : pas de re-rendu React à chaque
 * `mousemove`, juste une mise à jour de propriété CSS peu coûteuse.
 */
export function HeroSpotlight({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    node.style.setProperty("--mx", `${x}%`);
    node.style.setProperty("--my", `${y}%`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cn("scene-spotlight", className)}
    >
      {children}
    </div>
  );
}
