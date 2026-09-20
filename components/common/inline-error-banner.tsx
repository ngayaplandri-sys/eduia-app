import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Bandeau d'erreur inline — recopié à quelques nuances près dans 5 formulaires
 * avant cette extraction (panneaux de config Résumer/Générer/Corriger,
 * Assistant IA, formulaire d'auth).
 */
export function InlineErrorBanner({
  message,
  className,
  assertive,
}: {
  message: string;
  className?: string;
  /** Formulaire en cours de soumission : l'erreur doit interrompre le lecteur d'écran. */
  assertive?: boolean;
}) {
  return (
    <div
      role="alert"
      aria-live={assertive ? "assertive" : undefined}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-danger-100 bg-danger-50/70 px-3.5 py-3 text-fine font-medium leading-snug text-danger-600",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{message}</span>
    </div>
  );
}
