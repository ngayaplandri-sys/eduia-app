"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/select";
import { InlineErrorBanner } from "@/components/common/inline-error-banner";
import { useToast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { siteConfig } from "@/lib/config/site";
import { supportConfig } from "@/lib/config/support";
import { useI18n } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface AuthError {
  code?: string;
  message?: string;
}

/**
 * Destination après connexion (`?next=`), limitée aux chemins internes :
 * sans ce filtre, un lien `…/login?next=https://site-pirate` renverrait
 * l'élève connecté vers un site externe (redirection ouverte → hameçonnage).
 * `//hôte`, `/\hôte` et les caractères de contrôle (tabulation, retour à la
 * ligne, que le navigateur supprime : `/\t/hôte` → `//hôte`) sont refusés.
 */
function safeNextPath(next: string | null): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(next)
  ) {
    return "/dashboard";
  }
  return next;
}

function translateError(
  error: AuthError,
  isSignup: boolean,
  t: Dictionary["auth"],
): string {
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return t.errInvalidCredentials;
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return t.errUserExists;
    case "PASSWORD_TOO_SHORT":
      return t.errPasswordShort;
    case "PASSWORD_TOO_LONG":
      return t.errPasswordLong;
    case "INVALID_EMAIL":
      return t.errInvalidEmail;
    default:
      return (
        error.message ||
        (isSignup ? t.errSignupFailed : t.errLoginFailed)
      );
  }
}

export function AuthForm({
  mode,
  passwordResetEnabled = false,
}: {
  mode: "login" | "signup";
  /** `true` si l'envoi d'e-mails est configuré (lien « Mot de passe oublié » actif). */
  passwordResetEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dict } = useI18n();
  const { toast } = useToast();
  const t = dict.auth;
  const isSignup = mode === "signup";
  const nextUrl = safeNextPath(searchParams.get("next"));

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);
  // Honeypot anti-bot : champ leurre invisible pour un humain (hors écran,
  // ignoré du tabulateur) mais que les bots de remplissage automatique
  // renseignent souvent. Rempli => on abandonne silencieusement, sans jamais
  // appeler l'API d'inscription. N'affecte aucun utilisateur réel.
  const [honeypot, setHoneypot] = React.useState("");
  // Le retour d'un échec Google se fait par redirection plein-écran (voir
  // `errorCallbackURL` ci-dessous), qui reperd l'état du composant : l'erreur
  // se lit donc depuis l'URL dès le premier rendu plutôt que via un effet.
  const [error, setError] = React.useState<string | null>(() =>
    searchParams.get("error") === "google" ? t.errGoogleFailed : null,
  );
  const [pending, setPending] = React.useState(false);
  const [pendingGoogle, setPendingGoogle] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    authClient.getSession().then((result) => {
      if (active && result.data?.user) router.replace(nextUrl);
    });
    return () => {
      active = false;
    };
  }, [router, nextUrl]);

  async function signInWithGoogle() {
    setError(null);
    setPendingGoogle(true);
    try {
      const errorParams = new URLSearchParams({ error: "google" });
      if (nextUrl !== "/dashboard") errorParams.set("next", nextUrl);

      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: nextUrl,
        errorCallbackURL: `${isSignup ? "/signup" : "/login"}?${errorParams.toString()}`,
      });

      // En cas de succès, Better Auth redirige lui-même le navigateur vers
      // Google (voir plugin de redirection du client), puis vers `callbackURL`
      // une fois authentifié — rien d'autre à déclencher ici.
      if (result.error) {
        setPendingGoogle(false);
        setError(t.errGoogleFailed);
      }
    } catch {
      setPendingGoogle(false);
      setError(t.errGoogleFailed);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (isSignup && honeypot) {
      // Bot détecté : on simule un succès muet plutôt que d'exposer le
      // mécanisme (pas d'appel API, pas de message d'erreur révélateur).
      return;
    }

    setError(null);
    setPending(true);

    try {
      const result = isSignup
        ? await authClient.signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
          })
        : await authClient.signIn.email({
            email: email.trim(),
            password,
            rememberMe,
          });

      if (result.error || !result.data) {
        setPending(false);
        setError(
          result.error
            ? translateError(result.error, isSignup, t)
            : isSignup
              ? t.errSignupFailed
              : t.errLoginFailed,
        );
        return;
      }

      router.push(nextUrl);
      router.refresh();
    } catch {
      // Erreur réseau ou réponse inattendue : ne jamais laisser le formulaire
      // silencieux — on réactive le bouton et on affiche un message.
      setPending(false);
      setError(isSignup ? t.errSignupFailed : t.errLoginFailed);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink-900 sm:text-[1.75rem]">
          {isSignup ? t.signupTitle : t.loginTitle}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          {isSignup
            ? t.signupSubtitle(siteConfig.name)
            : t.loginSubtitle(siteConfig.name)}
        </p>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        {isSignup ? (
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] top-auto size-px overflow-hidden"
          />
        ) : null}

        {isSignup ? (
          <Field label={t.fullName} htmlFor="auth-name">
            <Input
              id="auth-name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        ) : null}

        <Field label={t.email} htmlFor="auth-email">
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="auth-password"
              className="block text-fine font-medium text-ink-700"
            >
              {t.password}
            </label>
            {isSignup ? null : passwordResetEnabled ? (
              <Link
                href="/forgot-password"
                className="text-fine font-medium text-primary-600 transition-colors hover:text-primary-700"
              >
                {t.forgotPassword}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => toast(t.forgotPasswordUnavailable(supportConfig.email))}
                className="text-fine font-medium text-primary-600 transition-colors hover:text-primary-700"
              >
                {t.forgotPassword}
              </button>
            )}
          </div>
          <Input
            id="auth-password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={isSignup ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {isSignup ? null : (
          <label className="flex w-fit items-center gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-4 rounded border-line text-primary-600 accent-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2"
            />
            {t.rememberMe}
          </label>
        )}

        {error ? <InlineErrorBanner message={error} assertive /> : null}

        <Button type="submit" size="md" block disabled={pending}>
          {pending
            ? isSignup
              ? t.signupPending
              : t.loginPending
            : isSignup
              ? t.signupSubmit
              : t.loginSubmit}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-line-soft" />
        <span className="text-meta font-medium uppercase tracking-wide text-ink-400">
          {t.orDivider}
        </span>
        <span className="h-px flex-1 bg-line-soft" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="md"
        block
        onClick={() => void signInWithGoogle()}
        disabled={pendingGoogle || pending}
      >
        {pendingGoogle ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <GoogleIcon className="size-[1.05rem]" aria-hidden />
        )}
        {pendingGoogle ? t.googlePending : t.continueWithGoogle}
      </Button>

      <p className="mt-5 text-center text-sm text-ink-500">
        {isSignup ? t.haveAccount : t.noAccount}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-semibold text-primary-600 transition-colors hover:text-primary-700"
        >
          {isSignup ? t.goLogin : t.goSignup}
        </Link>
      </p>
    </div>
  );
}

/** Logomark « G » officiel Google (4 couleurs de marque), en SVG inline. */
function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" {...props}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.68 9c0-.593.102-1.17.284-1.706V4.962H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}
