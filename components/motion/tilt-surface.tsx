"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface TiltSurfaceProps extends React.ComponentProps<"div"> {
  /** Inclinaison maximale, en degrés, de chaque côté (reste volontairement faible). */
  maxTilt?: number;
}

/**
 * Surface qui s'incline très légèrement en 3D vers le curseur, avec un reflet
 * violet qui le suit (utilitaire `tilt-surface` dans app/globals.css). Souris
 * uniquement : au doigt, rien ne bouge. Les variables CSS sont écrites
 * directement sur le nœud (une fois par frame au plus), sans re-rendu React.
 */
export function TiltSurface({
  maxTilt = 4,
  className,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: TiltSurfaceProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef(0);

  React.useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    onPointerMove?.(event);
    if (event.pointerType !== "mouse") return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.style.setProperty("--tilt-y", `${((x - 0.5) * 2 * maxTilt).toFixed(2)}deg`);
      node.style.setProperty("--tilt-x", `${((0.5 - y) * 2 * maxTilt).toFixed(2)}deg`);
      node.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      node.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
    });
  }

  function handleLeave(event: React.PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(event);
    const node = ref.current;
    if (!node) return;
    cancelAnimationFrame(frame.current);
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={cn("tilt-surface", className)}
      {...props}
    >
      {children}
    </div>
  );
}
