"use client";

import { usePathname } from "next/navigation";
import { resolvePageTitleKey } from "@/lib/navigation";
import { useI18n } from "@/lib/i18n/client";

export function HeaderTitle() {
  const pathname = usePathname();
  const { dict } = useI18n();
  const key = resolvePageTitleKey(pathname);
  const title = key ? dict.nav[key] : "EduIA";

  return (
    <h1 className="truncate text-xl font-bold tracking-[-0.02em] text-ink-900 sm:text-2xl lg:text-[1.75rem]">
      {title}
    </h1>
  );
}
