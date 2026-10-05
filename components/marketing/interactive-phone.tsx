"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { IPhoneFrame } from "./iphone-frame";

const MAX_TILT_DEG = 8;

/**
 * Rend `IPhoneFrame` interactif : le mockup s'incline en 3D en suivant le
 * curseur (souris uniquement, utilitaire CSS `phone-tilt`, neutralisé en
 * `prefers-reduced-motion`) puis revient doucement à plat. Les variables CSS
 * sont écrites directement sur le nœud (pas de `useState`) : suivi du
 * curseur sans re-rendu React. Une ombre au sol, floue, ancre le téléphone
 * dans la scène.
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

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty("--tilt-y", `${px * MAX_TILT_DEG}deg`);
    node.style.setProperty("--tilt-x", `${-py * MAX_TILT_DEG}deg`);
  }

  function handlePointerLeave() {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -bottom-9 left-1/2 h-10 w-[78%] -translate-x-1/2 rounded-[50%] bg-[#2b1b4a]/30 blur-2xl"
      />
      <div
        ref={ref}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        role="img"
        aria-label={ariaLabel}
        className={cn("phone-tilt relative rounded-[2.6rem]", className)}
        style={{ transformStyle: "preserve-3d" }}
      >
        <IPhoneFrame>{children}</IPhoneFrame>
      </div>
    </div>
  );
}
