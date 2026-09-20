"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X, Globe } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils/cn";
import { marketingNavHrefs } from "@/lib/config/marketing";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_LABELS } from "@/lib/i18n/config";

/**
 * Bascule FR ↔ EN — un simple bouton suffit (2 langues seulement) : plus
 * discret qu'un menu déroulant, cohérent avec la demande d'un sélecteur
 * "élégant, discret". `useI18n().setLocale` applique le changement
 * immédiatement (contexte client) puis rafraîchit les Server Components
 * (`router.refresh()`, pas de rechargement complet de page).
 */
function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, dict, setLocale } = useI18n();
  const t = dict.marketing.header;
  const next = locale === "fr" ? "en" : "fr";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={t.languageAria}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-ink-500 transition-colors hover:bg-primary-50 hover:text-ink-900",
        className,
      )}
    >
      <Globe className="size-4" aria-hidden />
      {LOCALE_LABELS[locale]}
    </button>
  );
}

export function LandingHeader({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const { dict } = useI18n();
  const t = dict.marketing;

  function closeAndNavigate() {
    setOpen(false);
  }

  const marketingNav = marketingNavHrefs.map((href, i) => ({
    href,
    label: [t.nav.home, t.nav.features, t.nav.how, t.nav.pricing, t.nav.about][i],
  }));

  const authButtons = isAuthenticated ? (
    <Link
      href="/dashboard"
      className={buttonVariants({ variant: "primary", size: "md" })}
    >
      {t.header.dashboardCta}
    </Link>
  ) : (
    <>
      <Link
        href="/login"
        className={buttonVariants({ variant: "outline", size: "md" })}
      >
        {t.header.login}
      </Link>
      <Link
        href="/signup"
        className={buttonVariants({ variant: "primary", size: "md" })}
      >
        {t.header.signup}
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <BrandLogo href="/" withTagline={false} />

        <nav
          aria-label={t.header.navLabel}
          className="hidden shrink-0 items-center lg:flex"
        >
          {marketingNav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-ink-500 transition-colors hover:bg-primary-50 hover:text-ink-900"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-1 lg:flex">
          <LanguageSwitcher className="mr-1" />
          <div className="flex shrink-0 items-center gap-2.5">{authButtons}</div>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <IconButton
              label={open ? t.header.closeMenu : t.header.openMenu}
              className="lg:hidden"
            >
              <Menu />
            </IconButton>
          </SheetTrigger>
          <SheetContent
            title={t.header.sheetTitle}
            description={t.header.sheetDescription}
            className="bg-scene-dashboard"
          >
            <SheetClose asChild>
              <IconButton
                label={t.header.closeMenu}
                className="absolute right-3 top-4 z-10 bg-surface/80"
              >
                <X />
              </IconButton>
            </SheetClose>
            <div className="flex h-full flex-col overflow-y-auto px-5 py-6">
              <div className="flex items-center justify-between gap-3">
                <div onClick={closeAndNavigate}>
                  <BrandLogo href="/" withTagline />
                </div>
                <LanguageSwitcher className="shrink-0" />
              </div>
              <nav
                aria-label={t.header.mobileNavLabel}
                className="mt-8 flex flex-col gap-1"
              >
                {marketingNav.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={closeAndNavigate}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-ink-600 transition-[background-color,color,transform] duration-200 ease-out hover:translate-x-0.5 hover:bg-primary-50 hover:text-ink-900 motion-reduce:hover:translate-x-0"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 border-t border-line-soft pt-4">
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    onClick={closeAndNavigate}
                    className={cn(
                      buttonVariants({ variant: "primary", size: "md", block: true }),
                    )}
                  >
                    {t.header.dashboardCta}
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={closeAndNavigate}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "md", block: true }),
                      )}
                    >
                      {t.header.login}
                    </Link>
                    <Link
                      href="/signup"
                      onClick={closeAndNavigate}
                      className={cn(
                        buttonVariants({ variant: "primary", size: "md", block: true }),
                      )}
                    >
                      {t.header.signup}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
