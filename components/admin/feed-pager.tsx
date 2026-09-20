"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Pagination « précédent / suivant » pour les flux sans total connu
 * (l'espace admin agrège plusieurs sources : seul `hasMore` est fiable).
 */
export function FeedPager({
  page,
  hasMore,
}: {
  page: number;
  hasMore: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  if (page <= 1 && !hasMore) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-fine text-ink-400">Page {page}</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasMore}
          onClick={() => go(page + 1)}
        >
          Suivant
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
