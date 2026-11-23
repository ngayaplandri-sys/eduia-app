"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { resetAiUsageCounters } from "@/lib/actions/admin-ai";

/**
 * « Remettre à zéro » les compteurs de `/admin/ai` (après une recharge du
 * solde OpenAI, par exemple). Demande confirmation ; rien n'est effacé.
 */
export function ResetAiUsageButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        <RotateCcw className="size-4" aria-hidden />
        {pending ? "Remise à zéro…" : "Remettre à zéro"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Remettre les compteurs à zéro ?"
        description="Requêtes, tokens, coût estimé, voix et types de génération repartiront de zéro à partir de maintenant. L'historique n'est pas effacé et les élèves ne sont pas touchés."
        confirmLabel="Remettre à zéro"
        onConfirm={() =>
          startTransition(async () => {
            const result = await resetAiUsageCounters();
            if (result.ok) {
              toast("Compteurs remis à zéro.", "success");
              router.refresh();
            } else {
              toast(result.error);
            }
          })
        }
      />
    </>
  );
}
