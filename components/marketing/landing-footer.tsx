import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";
import { siteConfig } from "@/lib/config/site";
import { marketingNavHrefs } from "@/lib/config/marketing";
import { getDictionary } from "@/lib/i18n/server";

export async function LandingFooter() {
  const dict = await getDictionary();
  const t = dict.marketing;
  const nav = marketingNavHrefs.map((href, i) => ({
    href,
    label: [t.nav.home, t.nav.features, t.nav.how, t.nav.pricing, t.nav.about][i],
  }));

  return (
    <footer
      id="a-propos"
      className="scroll-mt-20 border-t border-line-soft bg-surface"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <BrandLogo href="/" withTagline={false} />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-500">
              {t.footer.description(siteConfig.name)}
            </p>
          </div>

          <nav aria-label={t.footer.navLabel}>
            <p className="text-fine font-bold uppercase tracking-wide text-ink-400">
              {t.footer.navHeading}
            </p>
            <ul className="mt-3 space-y-2">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="inline-block text-sm text-ink-500 transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 hover:text-ink-900 motion-reduce:hover:translate-x-0"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t.footer.accountLabel}>
            <p className="text-fine font-bold uppercase tracking-wide text-ink-400">
              {t.footer.accountHeading}
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/login"
                  className="text-sm text-ink-500 transition-colors hover:text-ink-900"
                >
                  {t.footer.login}
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="text-sm text-ink-500 transition-colors hover:text-ink-900"
                >
                  {t.footer.signup}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-line-soft pt-6 text-fine text-ink-400">
          {t.footer.copyright(siteConfig.name, new Date().getFullYear())}
        </div>
      </div>
    </footer>
  );
}
