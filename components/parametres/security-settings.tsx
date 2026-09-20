"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/client";
import { SettingsSection } from "./settings-section";

export function SecuritySettings() {
  const { toast } = useToast();
  const { dict } = useI18n();
  const t = dict.parametres;
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const filled = current !== "" && next !== "" && confirm !== "";
  const mismatch = confirm !== "" && next !== confirm;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!filled || mismatch || pending) return;
    setError(null);
    setPending(true);

    const result = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });

    setPending(false);

    if (result.error) {
      setError(
        result.error.code === "INVALID_PASSWORD"
          ? t.currentPasswordWrong
          : result.error.message || t.passwordUpdateFailed,
      );
      return;
    }

    setCurrent("");
    setNext("");
    setConfirm("");
    toast(t.passwordUpdated, "success");
  }

  return (
    <SettingsSection
      icon={ShieldCheck}
      title={t.securityTitle}
      description={t.securityDescription}
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label={t.currentPassword} htmlFor="sec-current">
          <Input
            id="sec-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>

        <Field label={t.newPassword} htmlFor="sec-new">
          <Input
            id="sec-new"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>

        <Field label={t.confirmPassword} htmlFor="sec-confirm">
          <Input
            id="sec-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            aria-invalid={mismatch}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        {mismatch ? (
          <p className="text-fine font-medium text-danger-600">
            {t.passwordMismatch}
          </p>
        ) : null}

        {error ? (
          <p className="text-fine font-medium text-danger-600">{error}</p>
        ) : null}

        <Button
          type="submit"
          size="sm"
          disabled={!filled || mismatch || pending}
        >
          {pending ? t.updatingPassword : t.updatePassword}
        </Button>
      </form>
    </SettingsSection>
  );
}
