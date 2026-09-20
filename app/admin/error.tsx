"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/feedback/error-state";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="Cette page d'administration n'a pas pu se charger"
      description="Une erreur est survenue lors de la récupération des données. Réessaie dans un instant."
      onRetry={reset}
      className="my-4"
    />
  );
}
