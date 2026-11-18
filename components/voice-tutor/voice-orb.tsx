"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type VoicePhase = "idle" | "listening" | "thinking" | "speaking";

/** Hauteur relative et amplitude de chacune des cinq barres de l'onde. */
const BARS = [
  { height: 0.45, amp: 0.9, delay: "-0.45s" },
  { height: 0.75, amp: 1.2, delay: "-0.2s" },
  { height: 1, amp: 1.4, delay: "0s" },
  { height: 0.75, amp: 1.2, delay: "-0.3s" },
  { height: 0.45, amp: 0.9, delay: "-0.6s" },
];

/**
 * Cercle vocal du professeur : un disque violet avec une onde audio, entouré
 * de cercles concentriques. Repos : respiration lente ; écoute : les cercles
 * suivent le niveau du micro ; réflexion : anneau qui tourne ; parole : les
 * cercles pulsent et l'onde s'anime. Styles et animations : `.voice-orb` dans
 * `app/globals.css` (neutralisés sous `prefers-reduced-motion`).
 */
export function VoiceOrb({
  phase,
  getLevel,
  className,
}: {
  phase: VoicePhase;
  /** Niveau du micro (0 à 1), lu à chaque image pendant l'écoute. */
  getLevel: () => number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const getLevelRef = React.useRef(getLevel);
  React.useEffect(() => {
    getLevelRef.current = getLevel;
  });

  // Niveau écrit directement en variable CSS : aucun rendu React par image.
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (phase !== "listening") {
      element.style.setProperty("--level", "0");
      return;
    }
    let frame = 0;
    const loop = () => {
      element.style.setProperty("--level", getLevelRef.current().toFixed(3));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  return (
    <div ref={ref} data-state={phase} aria-hidden className={cn("voice-orb", className)}>
      <span className="voice-orb__ring voice-orb__ring--3" />
      <span className="voice-orb__ring voice-orb__ring--2" />
      <span className="voice-orb__ring voice-orb__ring--1" />
      <span className="voice-orb__spinner" />
      <span className="voice-orb__core">
        {BARS.map((bar, index) => (
          <span
            key={index}
            className="voice-orb__bar"
            style={
              {
                "--h": bar.height,
                "--amp": bar.amp,
                "--delay": bar.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </span>
    </div>
  );
}

/** Petite pastille assortie (avatar du professeur dans l'en-tête et les bulles). */
export function TeacherBadge({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("voice-badge", className)}>
      {[0.5, 0.85, 1, 0.85, 0.5].map((height, index) => (
        <span key={index} style={{ height: `${height * 42}%` }} />
      ))}
    </span>
  );
}
