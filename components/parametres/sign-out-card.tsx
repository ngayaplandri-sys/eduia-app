"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n/client";

export function SignOutCard() {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.parametres;

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="min-w-0">
        <h2 className="text-title-sm font-bold text-ink-900">
          {t.signOutTitle}
        </h2>
        <p className="mt-0.5 text-sm text-ink-500">{t.signOutBody}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={() => {
          signOut();
        }}
        className="shrink-0 border-danger-100 text-danger-600 hover:bg-danger-50 hover:text-danger-600"
      >
        <LogOut className="size-4" aria-hidden />
        {t.signOut}
      </Button>
    </Card>
  );
}
