import { cn } from "@/lib/utils/cn";

/**
 * Bloc de chargement : aplat discret + balayage lumineux (`@utility skeleton`
 * dans globals.css), neutralisé si `prefers-reduced-motion` est actif.
 */
export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("skeleton rounded-md", className)} {...props} />;
}
