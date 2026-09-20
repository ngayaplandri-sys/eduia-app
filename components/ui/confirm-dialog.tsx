"use client";

import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/** Boîte de confirmation générique (utilisée avant les suppressions). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const { dict } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">
              {cancelLabel ?? dict.ui.cancel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={cn(
              destructive &&
                "bg-danger-600 text-white shadow-none hover:bg-danger-600 hover:opacity-90 active:bg-danger-600",
            )}
          >
            {confirmLabel ?? dict.ui.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
