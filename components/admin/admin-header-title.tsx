"use client";

import { usePathname } from "next/navigation";
import { resolveAdminTitle } from "@/lib/admin/navigation";

export function AdminHeaderTitle() {
  const pathname = usePathname();
  return (
    <h1 className="truncate text-xl font-bold tracking-[-0.02em] text-ink-900 sm:text-2xl lg:text-[1.75rem]">
      {resolveAdminTitle(pathname)}
    </h1>
  );
}
