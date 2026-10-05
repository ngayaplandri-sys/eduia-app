"use client";

import * as React from "react";

/**
 * Profondeur « caméra » d'une scène (hero, « Comment ça marche ? ») : quand
 * la souris bouge, chaque couche `depth-layer` (photo, téléphones, cartes
 * flottantes) se décale selon sa `--depth`, ce qui sépare premier plan, plan
 * moyen et arrière-plan. Écrit `--px`/`--py`
 * (−1 → 1) sur le nœud, une fois par frame au plus, sans re-rendu React.
 * Souris uniquement ; neutralisé sous `prefers-reduced-motion` (CSS).
 */
export function ParallaxScene({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef(0);

  React.useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.style.setProperty("--px", x.toFixed(3));
      node.style.setProperty("--py", y.toFixed(3));
    });
  }

  function handleLeave() {
    const node = ref.current;
    if (!node) return;
    cancelAnimationFrame(frame.current);
    node.style.setProperty("--px", "0");
    node.style.setProperty("--py", "0");
  }

  return (
    <div ref={ref} onPointerMove={handleMove} onPointerLeave={handleLeave} className={className}>
      {children}
    </div>
  );
}
