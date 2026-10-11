"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/select";
import { InlineErrorBanner } from "@/components/common/inline-error-banner";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/client";

/**
 * Choix du nouveau mot de passe, depuis le lien reçu par e-mail : Better Auth
 * valide le jeton puis redirige ici avec `?token=…` (ou `?error=INVALID_TOKEN`
 * si le lien a expiré ou a déjà servi).
 */
export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const { dict } = useI18n();
  const t = dict.auth;
  const token = searchParams.get("token");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<"form" | "invalid" | "done">(() =>
    token && !searchParams.get("error") ? "form" : "invalid",
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    if (password !== confirm) {
      setError(t.errPasswordMismatch);
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        const code = result.error.code;
        if (code === "INVALID_TOKEN") setState("invalid");
        else if (code === "PASSWORD_TOO_SHORT") setError(t.errPasswordShort);
        else if (code === "PASSWORD_TOO_LONG") setError(t.errPasswordLong);
        else setError(t.resetFailed);
        return;
      }
      setState("done");
    } catch {
      setError(t.resetFailed);
    } finally {
      setPending(false);
    }
  }

  if (state !== "form") {
    const done = state === "done";
    return (
      <div className="w-full max-w-sm">
        <span
          className={
            done
              ? "flex size-11 items-center justify-center rounded-xl bg-success-100 text-success-600"
              : "flex size-11 items-center justify-center rounded-xl bg-danger-50 text-danger-600"
          }
        >
          {done ? (
            <CircleCheck className="size-5" aria-hidden />
          ) : (
            <TriangleAlert className="size-5" aria-hidden />
          )}
        </span>
        <h1 className="mt-4 font-display text-2xl font-medium tracking-[-0.01em] text-ink-900 sm:text-[1.75rem]">
          {done ? t.resetDoneTitle : t.resetInvalidTitle}
        </h1>
        <p className="mt-2 text-sm text-ink-500" role="status">
          {done ? t.resetDoneBody : t.resetInvalidBody}
        </p>
        <Link
          href={done ? "/login" : "/forgot-password"}
          className={buttonVariants({ size: "md", block: true, className: "mt-6" })}
        >
          {done ? t.loginSubmit : t.requestNewLink}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink-900 sm:text-[1.75rem]">
          {t.resetTitle}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">{t.resetSubtitle}</p>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        <Field label={t.newPassword} htmlFor="reset-password">
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label={t.confirmPassword} htmlFor="reset-confirm">
          <Input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        {error ? <InlineErrorBanner message={error} assertive /> : null}

        <Button type="submit" size="md" block disabled={pending}>
          {pending ? t.resetPending : t.resetSubmit}
        </Button>
      </form>
    </div>
  );
}
