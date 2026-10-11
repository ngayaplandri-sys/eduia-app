"use client";

import * as React from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/select";
import { InlineErrorBanner } from "@/components/common/inline-error-banner";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/client";

/**
 * « Mot de passe oublié » : demande un lien de réinitialisation par e-mail
 * (Better Auth `request-password-reset`). La réponse est la même que le
 * compte existe ou non : elle ne révèle jamais quelles adresses sont inscrites.
 */
export function ForgotPasswordForm() {
  const { dict } = useI18n();
  const t = dict.auth;
  const [email, setEmail] = React.useState("");
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const address = email.trim();
      const result = await authClient.requestPasswordReset({
        email: address,
        redirectTo: "/reset-password",
      });
      if (result.error) {
        setError(result.error.code === "INVALID_EMAIL" ? t.errInvalidEmail : t.forgotFailed);
        return;
      }
      setSentTo(address);
    } catch {
      setError(t.forgotFailed);
    } finally {
      setPending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="w-full max-w-sm">
        <span className="flex size-11 items-center justify-center rounded-xl bg-success-100 text-success-600">
          <MailCheck className="size-5" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-2xl font-medium tracking-[-0.01em] text-ink-900 sm:text-[1.75rem]">
          {t.forgotSentTitle}
        </h1>
        <p className="mt-2 text-sm text-ink-500" role="status">
          {t.forgotSentBody(sentTo)}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700"
        >
          {t.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink-900 sm:text-[1.75rem]">
          {t.forgotTitle}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">{t.forgotSubtitle}</p>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        <Field label={t.email} htmlFor="forgot-email">
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        {error ? <InlineErrorBanner message={error} assertive /> : null}

        <Button type="submit" size="md" block disabled={pending}>
          {pending ? t.forgotPending : t.forgotSubmit}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm">
        <Link
          href="/login"
          className="font-semibold text-primary-600 transition-colors hover:text-primary-700"
        >
          {t.backToLogin}
        </Link>
      </p>
    </div>
  );
}
