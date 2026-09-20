import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const iconButtonVariants = cva(
  "relative inline-flex items-center justify-center rounded-md text-ink-500 transition-[background-color,color,transform] duration-200 ease-out hover:bg-primary-50 hover:text-ink-900 hover:-translate-y-px active:translate-y-0 motion-reduce:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      size: {
        sm: "size-8 [&_svg]:size-4",
        md: "size-10 [&_svg]:size-[1.125rem]",
        lg: "size-11 [&_svg]:size-5",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface IconButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof iconButtonVariants> {
  /** Libellé accessible obligatoire (le bouton n'a pas de texte visible). */
  label: string;
}

export function IconButton({
  className,
  size,
  label,
  type = "button",
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(iconButtonVariants({ size }), className)}
      {...props}
    >
      {children}
    </button>
  );
}
