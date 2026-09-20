import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

/** Squelette générique pour les sections en cours de chargement. */
export function LoadingState({
  className,
  label = "Chargement…",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("space-y-6", className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-[4.5rem] rounded-xl" />
        <Skeleton className="h-[4.5rem] rounded-xl" />
        <Skeleton className="h-[4.5rem] rounded-xl" />
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
