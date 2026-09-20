"use client";

import * as React from "react";
import Link from "next/link";
import { EllipsisVertical, Eye, Download, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { downloadTextFile } from "@/lib/utils/download";
import { formatActivityDate, slugify } from "@/lib/utils/format";
import { useI18n } from "@/lib/i18n/client";
import {
  localizeActivityStatus,
  localizeActivityType,
} from "@/lib/i18n/labels";
import type { ActivityItem } from "@/types";

export function ActivityRowMenu({
  item,
  onDelete,
}: {
  item: ActivityItem;
  onDelete?: (id: string) => void;
}) {
  const { toast } = useToast();
  const { dict, locale } = useI18n();
  const t = dict.dashboard;
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  function handleDownload() {
    const content = [
      t.rowSummaryPrefix(localizeActivityType(item.type, dict)),
      item.title,
      item.meta,
      t.rowDateLabel(formatActivityDate(item.date, locale)),
      t.rowStatusLabel(localizeActivityStatus(item.status.label, dict)),
    ].join("\n");
    downloadTextFile(`${slugify(item.title)}.txt`, content);
    toast(t.recapDownloaded, "success");
  }

  function handleDelete() {
    if (onDelete) {
      onDelete(item.id);
      toast(t.itemRemoved, "success");
    } else {
      toast(t.deleteNeedsDb);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label={t.rowActionsAria(item.title)} size="sm">
            <EllipsisVertical />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Link href={item.action.href}>
              <Eye />
              {dict.common.open}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDownload}>
            <Download />
            {dict.common.download}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setConfirmOpen(true)}
            className="text-danger-600 focus:bg-danger-50 focus:text-danger-600 [&_svg]:text-danger-600"
          >
            <Trash2 />
            {dict.common.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t.deleteItemTitle}
        description={t.deleteItemBody(item.title)}
        confirmLabel={dict.common.delete}
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
