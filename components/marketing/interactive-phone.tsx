"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { IPhoneFrame } from "./iphone-frame";

const MAX_TILT_DEG = 10;

/**
 * Rend `IPhoneFrame` interactif : le mockup s'incline en 3D en suivant le
 * curseur (desktop, pointeur fin — géré par l'utilitaire CSS `phone-tilt`,
 * qui neutralise aussi l'effet en `prefers-reduced-motion`) et revient
 * doucement à plat quand le curseur quitte l'élément. Même technique que
 * `HeroSpotlight` : les variables CSS sont écrites directement sur le nœud
 * DOM (pas de `useState`), pour un suivi du curseur sans re-rendu React.
 */
export function InteractivePhone({
  children,
  className,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  ariaLabel: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty("--tilt-y", `${px * MAX_TILT_DEG}deg`);
    node.style.setProperty("--tilt-x", `${-py * MAX_TILT_DEG}deg`);
  }

  function handleMouseLeave() {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="img"
      aria-label={ariaLabel}
      className={cn("phone-tilt rounded-[2.6rem]", className)}
      style={{ transformStyle: "preserve-3d" }}
    >
      <IPhoneFrame>{children}</IPhoneFrame>
    </div>
  );
}
