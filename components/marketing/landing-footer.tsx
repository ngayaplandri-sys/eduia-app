import Link from "next/link";
import { siteConfig } from "@/lib/config/site";
import { supportConfig } from "@/lib/config/support";
import { getDictionary } from "@/lib/i18n/server";
import { LanguageToggle } from "./language-toggle";
import { BrandLockup } from "./brand-lockup";

const linkClass =
  "inline-block text-[0.92rem] text-ink-500 transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 hover:text-ink-900 motion-reduce:hover:translate-x-0";

/**
 * Pied de page (ancre « À propos »). Uniquement des liens qui existent :
 * ancres de la landing, Aide & support (`/aide`, espace connecté), contact
 * par e-mail (adresse du support, `lib/config/support.ts`), connexion,
 * inscription et bascule de langue. Aucune page « Mentions légales » ni
 * « Politique de confidentialité » n'existe encore : aucun lien n'y renvoie.
 */
export async function LandingFooter() {
  const dict = await getDictionary();
  const t = dict.marketing;
  const mailto = `mailto:${supportConfig.email}?subject=${encodeURIComponent(dict.aide.contactSubject)}`;

  const columns = [
    {
      heading: t.footer.productHeading,
      links: [
        { href: "#fonctionnalites", label: t.nav.features },
        { href: "#comment-ca-marche", label: t.nav.how },
        { href: "#tarifs", label: t.nav.pricing },
      ],
    },
    {
      heading: t.footer.resourcesHeading,
      links: [
        { href: "/aide", label: t.footer.help, internal: true },
        { href: mailto, label: t.footer.contact },
      ],
    },
    {
      heading: t.footer.accountHeading,
      links: [
        { href: "/login", label: t.footer.login, internal: true },
        { href: "/signup", label: t.footer.signup, internal: true },
      ],
    },
  ];

  return (
    <footer id="a-propos" className="relative scroll-mt-20 border-t border-line-soft bg-surface">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,0.7fr))] lg:gap-10">
          <div>
            <Link href="/" aria-label={t.header.homeAria} className="relative block h-10 w-[7.7rem]">
              <BrandLockup />
            </Link>
            <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed text-ink-500">
              {t.footer.description(siteConfig.name)}
            </p>
            <div className="mt-6">
              <p className="text-fine font-semibold text-ink-700">{t.footer.languageHeading}</p>
              <LanguageToggle full className="mt-2.5" />
            </div>
          </div>

          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <p className="text-fine font-bold text-ink-900">{column.heading}</p>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {"internal" in link && link.internal ? (
                      <Link href={link.href} className={linkClass}>
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} className={linkClass}>
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line-soft pt-6 text-fine text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>{t.footer.copyright(siteConfig.name, new Date().getFullYear())}</p>
        </div>
      </div>
    </footer>
  );
}
