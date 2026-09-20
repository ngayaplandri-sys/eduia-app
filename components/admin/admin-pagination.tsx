"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminPagination({
  page,
  pageCount,
  total,
}: {
  page: number;
  pageCount: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (pageCount <= 1) {
    return (
      <p className="text-fine text-ink-400">
        {total} résultat{total > 1 ? "s" : ""}
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-fine text-ink-400">
        Page {page} sur {pageCount} · {total} résultats
      </p>
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
          disabled={page >= pageCount}
          onClick={() => go(page + 1)}
        >
          Suivant
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
