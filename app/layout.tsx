import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/config/site";
import { Providers } from "@/components/providers";
import { resolvePreferences } from "@/lib/preferences/server";
import { THEME_COOKIE } from "@/lib/theme/config";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// Police d'accent éditoriale — réservée aux très grands titres cinématographiques
// (hero landing, bannière dashboard, hero Premium, score final). Auto-hébergée
// (aucune requête externe, donc aucun impact CSP/connect-src). Voir `--font-display`
// dans app/globals.css et l'utilitaire `font-display` généré automatiquement par
// Tailwind v4 à partir de ce token.
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} · ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6d28d9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Script anti-FOUC : fixe `data-theme` sur `<html>` **avant le premier paint**,
 * d'après le cookie `eduia.theme` (ou le réglage système). `<html>` est rendu
 * sans `data-theme` côté serveur + `suppressHydrationWarning` : le script fait
 * autorité, puis `ThemeProvider` garde l'attribut synchronisé.
 */
const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE.replace(
  ".",
  "\\.",
)}=([^;]+)/);var p=m?decodeURIComponent(m[1]):'system';var d=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);var e=document.documentElement;e.dataset.theme=d?'dark':'light';e.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, themePreference } = await resolvePreferences();

  return (
    <html
      lang={locale}
      className={`${jakarta.variable} ${fraunces.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Providers locale={locale} themePreference={themePreference}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
