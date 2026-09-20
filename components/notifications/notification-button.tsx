"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";

interface NotificationEntry {
  id: string;
  icon: LucideIcon;
  tone: "success" | "primary" | "warning";
  title: string;
  time: string;
  href: string;
}

const toneClass: Record<NotificationEntry["tone"], string> = {
  success: "bg-success-100 text-success-600",
  primary: "bg-primary-100 text-primary-600",
  warning: "bg-warning-100 text-warning-600",
};

export function NotificationButton() {
  const router = useRouter();
  const { toast } = useToast();
  const { dict } = useI18n();
  const t = dict.layout;
  const [open, setOpen] = React.useState(false);
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());

  // Aucune notification pour l'instant : le flux réel (requête Neon filtrée par
  // `userId`, comme le reste de l'app) reste à brancher. Alimenter ce tableau
  // suffira à réactiver la liste, le badge et « Tout marquer comme lu ».
  const notifications: NotificationEntry[] = [];

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  function openNotification(entry: NotificationEntry) {
    setReadIds((current) => {
      const next = new Set(current);
      next.add(entry.id);
      return next;
    });
    setOpen(false);
    router.push(entry.href);
  }

  function markAllRead() {
    setReadIds(new Set(notifications.map((n) => n.id)));
    toast(t.allMarkedRead, "success");
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <IconButton label={t.notificationsAria(unreadCount)}>
          <Bell />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full border-2 border-surface bg-danger-500 px-1 text-[0.625rem] font-bold leading-none text-white">
              {unreadCount}
            </span>
          ) : null}
        </IconButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[20rem] p-0">
        <div className="flex items-center justify-between px-3 py-3">
          <DropdownMenuLabel className="p-0">{t.notifications}</DropdownMenuLabel>
          {notifications.length > 0 ? (
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-700">
              {t.notificationsNew(unreadCount)}
            </span>
          ) : null}
        </div>
        <DropdownMenuSeparator className="mx-0 my-0" />

        {notifications.length > 0 ? (
          <>
            <ul className="max-h-[19rem] overflow-y-auto py-1">
              {notifications.map((entry) => {
                const Icon = entry.icon;
                const unread = !readIds.has(entry.id);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(entry)}
                      className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary-50"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                          toneClass[entry.tone],
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-fine leading-snug text-ink-700">
                          {entry.title}
                        </span>
                        <span className="mt-0.5 block text-[0.6875rem] text-ink-400">
                          {entry.time}
                        </span>
                      </span>
                      {unread ? (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary-500" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <DropdownMenuSeparator className="mx-0 my-0" />
            <div className="p-1.5">
              <button
                type="button"
                onClick={markAllRead}
                className="w-full rounded-lg px-2.5 py-2 text-center text-fine font-semibold text-primary-600 transition-colors hover:bg-primary-50"
              >
                {t.markAllRead}
              </button>
            </div>
          </>
        ) : (
          <p className="px-3 py-8 text-center text-fine text-ink-400">
            {t.notificationsEmpty}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
