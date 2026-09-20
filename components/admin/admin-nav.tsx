"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminNav, isAdminNavActive } from "@/lib/admin/navigation";
import { cn } from "@/lib/utils/cn";

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation administration"
      className="flex flex-col gap-1"
    >
      {adminNav.map((link) => {
        const active = isAdminNavActive(link.href, pathname);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-[background-color,color,transform] duration-200 ease-out motion-reduce:hover:translate-x-0",
              active
                ? "bg-primary-100 font-semibold text-primary-700"
                : "text-ink-500 hover:translate-x-0.5 hover:bg-primary-50 hover:text-ink-900",
            )}
          >
            <Icon
              className={cn(
                "size-[1.15rem] shrink-0 transition-colors",
                active ? "text-primary-600" : "text-ink-400",
              )}
              strokeWidth={2}
              aria-hidden
            />
            <span className="truncate">{link.label}</span>
          </Link>
        );
      })}

      <div className="my-3 h-px bg-line-soft" />

      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-ink-500 transition-[background-color,color,transform] duration-200 ease-out hover:-translate-x-0.5 hover:bg-primary-50 hover:text-ink-900 motion-reduce:hover:translate-x-0"
      >
        <ArrowLeft className="size-[1.15rem] shrink-0 text-ink-400 transition-transform group-hover:-translate-x-0.5" strokeWidth={2} aria-hidden />
        <span className="truncate">Retour à EduIA</span>
      </Link>
    </nav>
  );
}
