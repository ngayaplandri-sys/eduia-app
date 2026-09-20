"use client";

import * as React from "react";
import * as RDM from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils/cn";

export const DropdownMenu = RDM.Root;
export const DropdownMenuTrigger = RDM.Trigger;
export const DropdownMenuGroup = RDM.Group;
export const DropdownMenuSeparatorRoot = RDM.Separator;

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  align = "end",
  ...props
}: React.ComponentProps<typeof RDM.Content>) {
  return (
    <RDM.Portal>
      <RDM.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 min-w-[13rem] origin-[var(--radix-dropdown-menu-content-transform-origin)] rounded-xl border border-line bg-surface p-1.5 shadow-pop",
          "data-[state=open]:animate-pop-in",
          className,
        )}
        {...props}
      />
    </RDM.Portal>
  );
}

export function DropdownMenuItem({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof RDM.Item> & { inset?: boolean }) {
  return (
    <RDM.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-700 outline-none transition-colors",
        "focus:bg-primary-50 focus:text-ink-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-400",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof RDM.Label>) {
  return (
    <RDM.Label
      className={cn(
        "px-2.5 pb-1 pt-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-400",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof RDM.Separator>) {
  return (
    <RDM.Separator
      className={cn("-mx-1.5 my-1.5 h-px bg-line-soft", className)}
      {...props}
    />
  );
}
