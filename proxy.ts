import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Protection des routes (Next 16 : ex-`middleware`).
 *
 * Contrôle **optimiste** : présence du cookie de session uniquement, pour
 * rediriger vite un visiteur non connecté hors des pages privées. La vraie
 * validation se fait au plus près des données (`requireUser()` dans les pages
 * `(app)` et dans `DashboardShell`).
 *
 * On ne fait volontairement PAS l'inverse (cookie présent → renvoyer `/login`
 * vers `/dashboard`) : un cookie périmé mais encore présent créerait une boucle
 * de redirections (`/login` → `/dashboard` → `requireUser` → `/login` → …).
 * « Sauter la page de connexion quand on est déjà connecté » est géré côté
 * client dans `AuthForm`, où une session invalide n'entraîne aucune redirection.
 */
const AUTH_PAGES = ["/login", "/signup"];

/** Page de retour de paiement Maketou (voir `app/billing/maketou/return`). */
const MAKETOU_RETURN_PATH = "/billing/maketou/return";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));
  const onAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  );
  // La page d'accueil (`/`) est publique : landing marketing, accessible sans
  // session. Le retour de paiement Maketou l'est aussi : il doit toujours
  // aboutir (la confirmation, elle, exige la session). Toutes les autres pages
  // hors auth restent protégées.
  const isPublicPage =
    pathname === "/" || onAuthPage || pathname === MAKETOU_RETURN_PATH;

  if (!hasSession && !isPublicPage) {
    const url = new URL("/login", request.url);
    // Garde aussi les paramètres de la page demandée (retour après connexion).
    if (pathname !== "/") url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Tout sauf : routes API, internes Next, et fichiers statiques (avec extension).
  matcher: ["/((?!api/|_next/|.*\\.[\\w]+$).*)"],
};
