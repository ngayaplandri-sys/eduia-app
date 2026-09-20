"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { SettingsSection } from "./settings-section";

export function NotificationsSettings() {
  const { toast } = useToast();
  const { dict } = useI18n();
  const t = dict.parametres;
  const [enabled, setEnabled] = React.useState(true);

  function change(value: boolean) {
    setEnabled(value);
    toast(value ? t.notificationsOn : t.notificationsOff, "success");
  }

  return (
    <SettingsSection
      icon={Bell}
      title={t.notificationsTitle}
      description={t.notificationsDescription}
    >
      <div className="flex items-center justify-between gap-4 rounded-lg border border-line-soft p-3.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">
            {t.emailNotifications}
          </p>
          <p className="mt-0.5 text-fine text-ink-400">
            {enabled ? t.enabled : t.disabled}
          </p>
        </div>
        <Toggle
          checked={enabled}
          onChange={change}
          label={t.notificationsToggleAria}
        />
      </div>
    </SettingsSection>
  );
}
