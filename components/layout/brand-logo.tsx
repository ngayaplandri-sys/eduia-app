import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { siteConfig } from "@/lib/config/site";
import logoLockup from "@/public/brand/eduia-logo.png";
import logoMark from "@/public/brand/eduia-mark.png";

interface BrandLogoProps {
  /** Masque le sous-titre (utile dans des espaces contraints). */
  withTagline?: boolean;
  /** Texte du sous-titre (déjà localisé). Par défaut : la baseline française. */
  tagline?: string;
  /** N'affiche que le symbole « cerveau + livre » (très petites tailles). */
  compact?: boolean;
  /** Cible du lien (l'espace admin pointe vers `/admin`). */
  href?: string;
  className?: string;
}

export function BrandLogo({
  withTagline = true,
  tagline = siteConfig.tagline,
  compact = false,
  href = "/dashboard",
  className,
}: BrandLogoProps) {
  return (
    <Link
      href={href}
      aria-label={siteConfig.name}
      className={cn(
        "group flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4",
        className,
      )}
    >
      {compact ? (
        <Image
          src={logoMark}
          alt={siteConfig.name}
          priority
          sizes="48px"
          className="h-11 w-auto shrink-0 transition-transform group-hover:scale-105"
        />
      ) : (
        <span className="flex min-w-0 flex-col gap-1">
          <Image
            src={logoLockup}
            alt={siteConfig.name}
            priority
            sizes="180px"
            className="h-10 w-auto sm:h-11 transition-transform group-hover:scale-[1.02]"
          />
          {withTagline ? (
            <span className="pl-0.5 text-[0.72rem] font-medium text-ink-400">
              {tagline}
            </span>
          ) : null}
        </span>
      )}
    </Link>
  );
}
