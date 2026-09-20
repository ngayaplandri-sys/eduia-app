"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserRound, Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/client";
import { localizeRole } from "@/lib/i18n/labels";
import type { User } from "@/types";
import { SettingsSection } from "./settings-section";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line-soft pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-fine font-medium text-ink-500">{label}</span>
      <span className="truncate text-sm font-semibold text-ink-900">{value}</span>
    </div>
  );
}

export function ProfileSettings({ user }: { user: User }) {
  const { toast } = useToast();
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.parametres;
  const [name, setName] = React.useState(user.name);
  const [editing, setEditing] = React.useState(false);
  const [draftName, setDraftName] = React.useState(user.name);
  const [pending, setPending] = React.useState(false);

  function startEdit() {
    setDraftName(name);
    setEditing(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const nextName = draftName.trim();
    if (!nextName || pending) return;
    setPending(true);

    const result = await authClient.updateUser({ name: nextName });
    setPending(false);

    if (result.error) {
      toast(result.error.message || t.profileSaveFailed);
      return;
    }

    setName(nextName);
    setEditing(false);
    toast(t.profileSaved, "success");
    router.refresh();
  }

  return (
    <SettingsSection
      icon={UserRound}
      title={t.profileTitle}
      description={t.profileDescription}
    >
      <div className="flex items-center gap-4">
        <Avatar src={user.avatarUrl} name={name} size={56} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink-900">{name}</p>
          <p className="truncate text-fine text-ink-400">
            {localizeRole(user.role, dict)}
          </p>
        </div>
      </div>

      {editing ? (
        <form className="mt-5 space-y-4" onSubmit={save}>
          <Field label={t.fullName} htmlFor="profile-name">
            <Input
              id="profile-name"
              value={draftName}
              autoComplete="name"
              onChange={(e) => setDraftName(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? t.saving : t.save}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
            >
              {t.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-5 space-y-3">
          <InfoRow label={t.fullName} value={name} />
          <InfoRow label={t.email} value={user.email} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={startEdit}
            className="mt-1"
          >
            <Pencil className="size-4" aria-hidden />
            {t.edit}
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}
