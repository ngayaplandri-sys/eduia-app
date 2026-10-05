"use client";

import * as React from "react";

/**
 * Affiche un contenu conçu à taille réelle (`baseWidth` × `baseHeight`, comme
 * un vrai écran) réduit pour tenir dans son conteneur, quelle que soit sa
 * largeur. L'échelle est recalculée par ResizeObserver et écrite en variable
 * CSS (aucun re-rendu React). Rendu serveur : échelle estimée, corrigée dès
 * l'hydratation (contenu sous le pli, aucun saut visible).
 */
export function ScaledScreen({
  baseWidth,
  baseHeight,
  initialScale = 0.42,
  children,
}: {
  baseWidth: number;
  baseHeight: number;
  initialScale?: number;
  children: React.ReactNode;
}) {
  const frame = React.useRef<HTMLDivElement>(null);
  const inner = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const box = frame.current;
    const content = inner.current;
    if (!box || !content) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) content.style.setProperty("--screen-scale", String(width / baseWidth));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [baseWidth]);

  return (
    <div
      ref={frame}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${baseWidth} / ${baseHeight}` }}
    >
      <div
        ref={inner}
        className="absolute left-0 top-0 origin-top-left"
        style={
          {
            width: baseWidth,
            height: baseHeight,
            "--screen-scale": initialScale,
            transform: "scale(var(--screen-scale))",
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}
