"use client";

import * as React from "react";
import * as RD from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import { IconButton } from "./icon-button";

export const Dialog = RD.Root;
export const DialogTrigger = RD.Trigger;
export const DialogClose = RD.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  showClose = true,
  ...props
}: React.ComponentProps<typeof RD.Content> & {
  title: string;
  description?: string;
  showClose?: boolean;
}) {
  const { dict } = useI18n();
  return (
    <RD.Portal>
      <RD.Overlay className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-[1px] data-[state=open]:animate-overlay-in" />
      <RD.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-6 shadow-pop outline-none data-[state=open]:animate-pop-in",
          className,
        )}
        {...props}
      >
        <RD.Title className="text-lg font-bold text-ink-900">{title}</RD.Title>
        {description ? (
          <RD.Description className="mt-1 text-sm text-ink-500">
            {description}
          </RD.Description>
        ) : (
          <RD.Description className="sr-only">{title}</RD.Description>
        )}
        {showClose ? (
          <RD.Close asChild>
            <IconButton label={dict.ui.close} className="absolute right-3 top-3">
              <X />
            </IconButton>
          </RD.Close>
        ) : null}
        {children}
      </RD.Content>
    </RD.Portal>
  );
}
