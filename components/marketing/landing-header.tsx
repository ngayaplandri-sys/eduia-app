"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight } from "lucide-react";
import logoLockup from "@/public/brand/eduia-logo.png";
import logoLockupLight from "@/public/brand/eduia-logo-light.png";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils/cn";
import {
  LANDING_BOTTOM_SENTINEL,
  LANDING_HERO_END_SENTINEL,
  LANDING_TOP_SENTINEL,
  marketingNavHrefs,
} from "@/lib/config/marketing";
import { useI18n } from "@/lib/i18n/client";
import { LanguageToggle } from "./language-toggle";
import { BrandLockup } from "./brand-lockup";

/**
 * États visuels de l'en-tête, calculés sans écouteur de scroll :
 *  - `scrolled` : la page a quitté son tout premier pixel → en-tête compact ;
 *  - `overDark` : l'en-tête recouvre encore la scène sombre du hero → texte
 *    clair et logo clair ; sinon verre clair et texte encre ;
 *  - `active`   : section actuellement au centre de l'écran (lien souligné).
 */
function useHeaderState(sectionIds: readonly string[]) {
  const [scrolled, setScrolled] = React.useState(false);
  const [overDark, setOverDark] = React.useState(true);
  const [active, setActive] = React.useState<string>(sectionIds[0]);

  React.useEffect(() => {
    const observers: IntersectionObserver[] = [];

    const top = document.getElementById(LANDING_TOP_SENTINEL);
    if (top) {
      const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
      io.observe(top);
      observers.push(io);
    }

    // Repère placé en bas du hero, à la hauteur de l'en-tête : tant qu'il est
    // sous le haut de l'écran, l'en-tête survole encore la scène sombre.
    const heroEnd = document.getElementById(LANDING_HERO_END_SENTINEL);
    if (heroEnd) {
      const io = new IntersectionObserver(([entry]) =>
        setOverDark(entry.isIntersecting || entry.boundingClientRect.top > 0),
      );
      io.observe(heroEnd);
      observers.push(io);
    }

    // Bande horizontale au milieu de l'écran : la section qui la traverse est active.
    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const id of sectionIds) {
      const node = document.getElementById(id.slice(1));
      if (node) spy.observe(node);
    }
    observers.push(spy);

    // Tout en bas de la page, le pied de page (« À propos ») devient actif même
    // s'il est trop court pour atteindre la bande centrale.
    const bottom = document.getElementById(LANDING_BOTTOM_SENTINEL);
    if (bottom) {
      const io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) setActive(sectionIds[sectionIds.length - 1]);
      });
      io.observe(bottom);
      observers.push(io);
    }

    return () => observers.forEach((io) => io.disconnect());
  }, [sectionIds]);

  return { scrolled, overDark, active };
}

export function LandingHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = React.useState(false);
  const { dict } = useI18n();
  const t = dict.marketing;
  const { scrolled, overDark, active } = useHeaderState(marketingNavHrefs);

  const labels = [t.nav.home, t.nav.features, t.nav.how, t.nav.pricing, t.nav.about];
  const nav = marketingNavHrefs.map((href, i) => ({ href, label: labels[i] }));
  const dark = overDark;

  return (
    <header
      data-scrolled={scrolled}
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ease-out",
        dark
          ? scrolled
            ? "border-b border-white/10 bg-[#120b23]/60 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
          : "border-b border-line-soft bg-surface/80 shadow-[0_10px_30px_-24px_rgb(27_31_42/0.45)] backdrop-blur-xl",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 transition-[height] duration-500 ease-out sm:px-6 lg:px-8",
          scrolled ? "h-[3.75rem]" : "h-[4.5rem]",
        )}
      >
        <Link
          href="/"
          aria-label={t.header.homeAria}
          className="relative flex h-9 w-[6.9rem] shrink-0 items-center rounded-md sm:h-10 sm:w-[7.7rem]"
        >
          {/* Deux versions du logo superposées : fondu enchaîné clair ↔ sombre. */}
          <Image
            src={logoLockupLight}
            alt=""
            preload
            sizes="124px"
            className={cn(
              "absolute inset-0 h-full w-auto transition-opacity duration-500",
              dark ? "opacity-100" : "opacity-0 dark:opacity-100",
            )}
          />
          <Image
            src={logoLockup}
            alt=""
            preload
            sizes="124px"
            className={cn(
              "absolute inset-0 h-full w-auto transition-opacity duration-500",
              dark ? "opacity-0" : "opacity-100 dark:opacity-0",
            )}
          />
        </Link>

        <nav aria-label={t.header.navLabel} className="hidden items-center gap-0.5 xl:flex">
          {nav.map((item) => {
            const isActive = active === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "group relative whitespace-nowrap rounded-md px-3 py-2 text-[0.88rem] font-medium transition-colors duration-300",
                  dark
                    ? isActive
                      ? "text-white"
                      : "text-white/70 hover:text-white"
                    : isActive
                      ? "text-ink-900"
                      : "text-ink-500 hover:text-ink-900",
                )}
              >
                {item.label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3 -bottom-0.5 h-[2px] origin-left rounded-full transition-transform duration-500 ease-out",
                    dark ? "bg-[#cbb6f3]" : "bg-primary-500",
                    isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50",
                  )}
                />
              </a>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-3 xl:flex">
          <LanguageToggle tone={dark ? "dark" : "light"} />
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "primary", size: "md" }),
                "cta-sheen group rounded-xl",
              )}
            >
              {t.header.dashboardCta}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  "rounded-md px-2 py-2 text-[0.88rem] font-semibold transition-colors duration-300",
                  dark ? "text-white/85 hover:text-white" : "text-ink-700 hover:text-ink-900",
                )}
              >
                {t.header.login}
              </Link>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ variant: "primary", size: "md" }),
                  "cta-sheen group rounded-xl",
                )}
              >
                {t.header.signup}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </>
          )}
        </div>

        {/* Tablette / petit portable : CTA principal + menu (la nav complète
            ne tient sur une ligne qu'à partir de `xl`). */}
        <div className="flex items-center gap-2 xl:hidden">
          <Link
            href={isAuthenticated ? "/dashboard" : "/signup"}
            className={cn(
              buttonVariants({ variant: "primary", size: "sm" }),
              "cta-sheen hidden rounded-xl sm:inline-flex",
            )}
          >
            {isAuthenticated ? t.header.dashboardCta : t.header.signup}
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <IconButton
                label={open ? t.header.closeMenu : t.header.openMenu}
                className={cn(dark && "text-white hover:bg-white/10 hover:text-white")}
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
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  aria-label={t.header.homeAria}
                  className="relative block h-10 w-[7.7rem]"
                >
                  <BrandLockup />
                </Link>
                <nav aria-label={t.header.mobileNavLabel} className="mt-8 flex flex-col gap-1">
                  {nav.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active === item.href ? "true" : undefined}
                      className={cn(
                        "rounded-lg px-3 py-3 text-[0.95rem] font-medium transition-[background-color,color,transform] duration-200 ease-out hover:translate-x-0.5 hover:bg-primary-50 hover:text-ink-900 motion-reduce:hover:translate-x-0",
                        active === item.href ? "bg-primary-50 text-primary-700" : "text-ink-700",
                      )}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
                <div className="mt-6">
                  <LanguageToggle full />
                </div>
                <div className="mt-auto flex flex-col gap-2 border-t border-line-soft pt-4">
                  {isAuthenticated ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className={buttonVariants({ variant: "primary", size: "md", block: true })}
                    >
                      {t.header.dashboardCta}
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setOpen(false)}
                        className={buttonVariants({ variant: "outline", size: "md", block: true })}
                      >
                        {t.header.login}
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setOpen(false)}
                        className={buttonVariants({ variant: "primary", size: "md", block: true })}
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
      </div>
    </header>
  );
}
