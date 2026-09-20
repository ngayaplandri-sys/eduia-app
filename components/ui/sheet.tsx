"use client";

import * as React from "react";
import * as RD from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils/cn";

export const Sheet = RD.Root;
export const SheetTrigger = RD.Trigger;
export const SheetClose = RD.Close;

export function SheetContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentProps<typeof RD.Content> & {
  title: string;
  description?: string;
}) {
  return (
    <RD.Portal>
      <RD.Overlay className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-[1px] data-[state=open]:animate-overlay-in" />
      <RD.Content
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17.5rem] max-w-[85vw] flex-col bg-surface shadow-pop outline-none data-[state=open]:animate-sheet-in",
          className,
        )}
        {...props}
      >
        <RD.Title className="sr-only">{title}</RD.Title>
        {description ? (
          <RD.Description className="sr-only">{description}</RD.Description>
        ) : null}
        {children}
      </RD.Content>
    </RD.Portal>
  );
}
