import Image from "next/image";
import logoLockup from "@/public/brand/eduia-logo.png";
import logoLockupLight from "@/public/brand/eduia-logo-light.png";
import { cn } from "@/lib/utils/cn";

/**
 * Logo EduIA qui suit le thème : version d'origine (« Edu » bleu nuit) en
 * clair, version claire (« Edu » blanc, même symbole et même dégradé « IA »)
 * en sombre. `forceLight` : toujours la version claire (posé sur une scène
 * sombre, quel que soit le thème).
 */
export function BrandLockup({
  className,
  forceLight = false,
  sizes = "124px",
}: {
  className?: string;
  forceLight?: boolean;
  sizes?: string;
}) {
  if (forceLight) {
    return <Image src={logoLockupLight} alt="" sizes={sizes} className={cn("h-full w-auto", className)} />;
  }
  return (
    <>
      <Image src={logoLockup} alt="" sizes={sizes} className={cn("h-full w-auto dark:hidden", className)} />
      <Image src={logoLockupLight} alt="" sizes={sizes} className={cn("hidden h-full w-auto dark:block", className)} />
    </>
  );
}
