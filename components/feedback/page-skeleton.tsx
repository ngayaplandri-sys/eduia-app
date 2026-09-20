import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

/**
 * Squelette générique de page (en-tête + blocs de contenu neutres). Utilisé par
 * les `loading.tsx` des segments `(app)` et `admin` pendant le rendu serveur.
 */
export function PageSkeleton({
  className,
  label = "Chargement…",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn("space-y-6", className)}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>

      <div className="space-y-2.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-56" />
      </div>

      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
