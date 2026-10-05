"use client";

import * as React from "react";
import { observeOnce } from "@/lib/motion/observe-once";

export type RevealVariant = "up" | "left" | "right" | "scale" | "fade" | "media" | "phone";

interface RevealProps extends React.ComponentProps<"div"> {
  /** Décalage avant la révélation (cascade d'éléments voisins). */
  delayMs?: number;
  variant?: RevealVariant;
}

/**
 * Révélation au scroll (fondu + mouvement + léger flou qui se dissipe),
 * déclenchée une fois quand l'élément entre dans le viewport. Le rendu visuel
 * est 100 % CSS (`[data-reveal]` dans app/globals.css) : ce composant ne fait
 * que poser `data-revealed` au bon moment, sans re-rendu React. Il peut
 * envelopper des enfants rendus côté serveur.
 */
export function Reveal({
  children,
  delayMs = 0,
  variant = "up",
  style,
  ...props
}: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    return observeOnce(node, () => node.setAttribute("data-revealed", ""));
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={variant}
      style={
        delayMs
          ? ({ ...style, "--reveal-delay": `${delayMs}ms` } as React.CSSProperties)
          : style
      }
      {...props}
    >
      {children}
    </div>
  );
}
