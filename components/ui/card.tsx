import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

/**
 * Trois rôles plutôt qu'une seule "boîte blanche" partout :
 * - `content` (défaut, inchangé) : panneaux de config, feuilles de document.
 * - `interactive` : cartes cliquables (action cards, cartes documents, lignes
 *   d'historique) — survol tactile (bordure + fond en plus du lift existant).
 * - `stat` : tuiles de statistiques, sans bordure/fond teinté (le ton vient du
 *   className de l'appelant, ex. `bg-primary-50`), pour ne pas se confondre
 *   avec les cartes-conteneurs.
 * - `elevated` : le petit nombre de moments volontairement mis en scène (plan
 *   recommandé, carte spotlight) — profondeur teintée plus marquée
 *   (`shadow-elevated`), jamais utilisée pour une grille répétitive entière.
 */
export const cardVariants = cva("rounded-xl", {
  variants: {
    variant: {
      content: "border border-line bg-surface shadow-card",
      interactive:
        "hover-lift border border-line bg-surface shadow-card hover:border-primary-200",
      stat: "border-0 bg-canvas",
      elevated: "border border-primary-200/70 bg-surface shadow-elevated",
    },
  },
  defaultVariants: { variant: "content" },
});

export interface CardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof cardVariants> {}

export function Card({ className, variant, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant }), className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-between gap-4", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "text-title-sm font-bold tracking-[-0.01em] text-ink-900",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm text-ink-500", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-5 border-t border-line-soft pt-4", className)}
      {...props}
    />
  );
}
