"use client";

import * as React from "react";
import Link from "next/link";
import {
  EllipsisVertical,
  Eye,
  PenLine,
  Download,
  Trash2,
  Sparkles,
} from "lucide-react";
import { buttonVariants, Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/select";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/**
 * Actions d'une carte de document : « Résumer » + menu (Ouvrir, Renommer,
 * Télécharger, Supprimer). « Ouvrir » navigue vers le résumé réellement lié à
 * ce document (`summaryId`, calculé côté serveur) ; le renommage et la
 * suppression agissent sur la liste locale — la persistance (Supabase) et le
 * fichier réel restent à connecter.
 */
export function DocumentActions({
  id,
  name,
  summaryId,
  onRename,
  onDelete,
}: {
  id: string;
  name: string;
  summaryId: string | null;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { toast } = useToast();
  const { dict } = useI18n();
  const t = dict.documents;
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(name);

  function openRename() {
    setDraft(name);
    setRenameOpen(true);
  }

  function saveRename(event: React.FormEvent) {
    event.preventDefault();
    const next = draft.trim();
    if (next && next !== name) {
      onRename?.(id, next);
      toast(t.renamed, "success");
    }
    setRenameOpen(false);
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/resumer"
        className={buttonVariants({ variant: "lavender", size: "sm" })}
      >
        <Sparkles className="size-4" aria-hidden />
        {t.summarize}
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label={t.actionsAria(name)} size="sm">
            <EllipsisVertical />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {summaryId ? (
            <DropdownMenuItem asChild>
              <Link href={`/resumer?id=${summaryId}`}>
                <Eye />
                {t.open}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => toast(t.openUnavailable)}>
              <Eye />
              {t.open}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={openRename}>
            <PenLine />
            {t.rename}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toast(t.downloadSoon)}>
            <Download />
            {t.download}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-danger-600 focus:bg-danger-50 focus:text-danger-600 [&_svg]:text-danger-600"
          >
            <Trash2 />
            {t.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent title={t.renameTitle} description={t.renameBody}>
          <form className="mt-4 space-y-4" onSubmit={saveRename}>
            <Field label={t.renameField} htmlFor={`rename-${id}`}>
              <Input
                id={`rename-${id}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm">
                  {dict.common.cancel}
                </Button>
              </DialogClose>
              <Button type="submit" size="sm">
                {dict.common.save}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t.deleteTitle}
        description={t.deleteBody(name)}
        confirmLabel={dict.common.delete}
        destructive
        onConfirm={() => {
          onDelete?.(id);
          toast(t.deleted, "success");
        }}
      />
    </div>
  );
}
