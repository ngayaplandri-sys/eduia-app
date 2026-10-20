"use client";

import * as React from "react";
import { Globe2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { CountrySelect } from "@/components/common/country-select";
import { saveCountry } from "@/lib/actions/country";
import { useI18n } from "@/lib/i18n/client";

/**
 * Question « Dans quel pays étudies-tu ? » pour les comptes créés avant
 * qu'elle fasse partie de l'onboarding. Disparaît une fois le pays enregistré.
 */
export function CountryPrompt() {
  const { dict } = useI18n();
  const { toast } = useToast();
  const t = dict.country;
  const [country, setCountry] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!country || pending) return;
    startTransition(async () => {
      const result = await saveCountry(country).catch(() => ({ ok: false }));
      toast(result.ok ? t.promptSaved : t.promptFailed);
    });
  }

  return (
    <Card className="p-4 sm:p-5">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Globe2 className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <label htmlFor="dashboard-country" className="block text-fine font-bold text-ink-900">
                {t.promptTitle}
              </label>
              <p className="mt-0.5 text-meta text-ink-500">{t.promptBody}</p>
            </div>
            <CountrySelect id="dashboard-country" value={country} onChange={setCountry} disabled={pending} />
          </div>
        </div>
        <Button type="submit" disabled={!country || pending} className="sm:mb-0.5">
          {pending ? t.promptSaving : t.promptSave}
        </Button>
      </form>
    </Card>
  );
}
