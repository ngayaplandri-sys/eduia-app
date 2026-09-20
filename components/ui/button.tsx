import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-semibold select-none transition-[background-color,box-shadow,color,border-color,transform] duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.985] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-55 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-btn-primary",
        success:
          "bg-success-600 text-white hover:bg-success-700 shadow-btn-success",
        warning:
          "bg-warning-600 text-white hover:bg-warning-700 shadow-btn-warning",
        /* Accent or — réservé aux moments précieux (CTA héros marketing, offre
           Premium recommandée) : jamais la couleur de remplissage par défaut,
           ce rôle reste à `primary`. Texte foncé (pas blanc) : l'or clair
           contraste mal avec du blanc, bien avec `ink-900`. */
        accent:
          "bg-accent-400 text-ink-900 hover:bg-accent-500 active:bg-accent-600 shadow-btn-accent",
        tint:
          "bg-primary-100 text-primary-700 hover:bg-primary-200 active:bg-primary-200",
        outline:
          "border border-line bg-surface text-ink-700 hover:bg-canvas hover:text-ink-900",
        ghost: "text-ink-500 hover:bg-primary-50 hover:text-ink-900",
        link: "text-primary-600 hover:text-primary-700 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 gap-1.5 rounded-md px-3.5 text-fine",
        md: "h-11 gap-2 rounded-md px-4 text-sm",
        lg: "h-12 gap-2 rounded-lg px-5 text-[0.9375rem]",
      },
      block: { true: "w-full", false: "" },
    },
    compoundVariants: [
      {
        variant: "link",
        class: "h-auto p-0 shadow-none hover:translate-y-0 active:translate-y-0",
      },
      { variant: "ghost", class: "shadow-none" },
      { variant: "outline", class: "shadow-none" },
      { variant: "tint", class: "shadow-none" },
    ],
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  block,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}
