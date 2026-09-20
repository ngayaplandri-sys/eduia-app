"use client";

import * as React from "react";
import { useInViewReveal } from "@/lib/motion/use-in-view-reveal";
import { cn } from "@/lib/utils/cn";

/**
 * Révélation au scroll (fondu + léger décalage vertical) — enrobe un fragment
 * server-rendu sans convertir toute la section en Client Component (patron
 * Next.js standard : un Client Component peut envelopper des enfants
 * server-rendus reçus via `children`). Voir `lib/motion/use-in-view-reveal.ts`
 * pour la gestion `prefers-reduced-motion`/repli SSR.
 */
interface RevealProps extends Omit<React.ComponentProps<"div">, "style"> {
  delayMs?: number;
}

export function Reveal({ children, className, delayMs = 0, ...props }: RevealProps) {
  const { ref, isRevealed } = useInViewReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out",
        isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
