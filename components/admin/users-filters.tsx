"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Select } from "@/components/ui/select";

export function UsersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = React.useState(searchParams.get("q") ?? "");

  const commit = React.useCallback(
    (next: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  React.useEffect(() => {
    const handle = setTimeout(() => {
      if ((searchParams.get("q") ?? "") !== query) commit({ q: query });
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un nom ou un e-mail…"
          className="h-11 w-full rounded-lg border border-line bg-surface pl-10 pr-3.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>

      <Select
        aria-label="Filtrer par plan"
        className="sm:w-40"
        value={searchParams.get("plan") ?? ""}
        onChange={(event) => commit({ plan: event.target.value })}
      >
        <option value="">Tous les plans</option>
        <option value="free">Gratuit</option>
        <option value="premium">Premium</option>
        <option value="premium_plus">Premium+</option>
      </Select>

      <Select
        aria-label="Filtrer par rôle"
        className="sm:w-40"
        value={searchParams.get("role") ?? ""}
        onChange={(event) => commit({ role: event.target.value })}
      >
        <option value="">Tous les rôles</option>
        <option value="student">Élève</option>
        <option value="admin">Administrateur</option>
      </Select>
    </div>
  );
}
