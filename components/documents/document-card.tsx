"use client";

import { FileText, FileType, Image as ImageIcon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatShortDate } from "@/lib/utils/format";
import { useI18n } from "@/lib/i18n/client";
import { localizeLevel, localizeSubject } from "@/lib/i18n/labels";
import type { DocumentFile, DocumentFileKind } from "@/types";
import { DocumentActions } from "./document-actions";

const KIND: Record<
  DocumentFileKind,
  { label: string; className: string; icon: LucideIcon }
> = {
  pdf: { label: "PDF", className: "bg-danger-100 text-danger-500", icon: FileText },
  docx: { label: "DOCX", className: "bg-info-100 text-info-600", icon: FileType },
  txt: { label: "TXT", className: "bg-success-100 text-success-600", icon: FileText },
  image: {
    label: "IMAGE",
    className: "bg-primary-100 text-primary-600",
    icon: ImageIcon,
  },
};

/** Repli sûr : un `fileKind` inconnu ne doit jamais casser la bibliothèque. */
const KIND_FALLBACK = {
  label: "FICHIER",
  className: "bg-canvas text-ink-500",
  icon: FileText,
};

export function DocumentCard({
  file,
  onRename,
  onDelete,
}: {
  file: DocumentFile;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
}) {
  const kind = KIND[file.fileKind] ?? KIND_FALLBACK;
  const { dict, locale } = useI18n();
  const t = dict.documents;

  return (
    <li className={cn(cardVariants({ variant: "interactive" }), "flex flex-col p-4")}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-lg",
            kind.className,
          )}
        >
          <kind.icon className="size-[1.15rem]" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-bold text-ink-900"
            title={file.name}
          >
            {file.name}
          </p>
          <p className="mt-0.5 text-meta text-ink-400">
            {t.cardPagesMeta(kind.label, file.sizeLabel, file.pageCount)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone="neutral" size="sm">
          {localizeSubject(file.subject, dict)}
        </Badge>
        <Badge tone="neutral" size="sm">
          {localizeLevel(file.level, dict)}
        </Badge>
        {file.hasSummary ? (
          <Badge tone="success" size="sm">
            {t.summaryAvailable}
          </Badge>
        ) : (
          <Badge tone="warning" size="sm">
            {t.toProcess}
          </Badge>
        )}
      </div>

      <div className="mt-auto">
        <p className="mt-4 border-t border-line-soft pt-3 text-meta text-ink-400">
          {t.importedOn(formatShortDate(file.uploadedAt, locale))}
        </p>
        <div className="mt-3">
          <DocumentActions
            id={file.id}
            name={file.name}
            summaryId={file.summaryId}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      </div>
    </li>
  );
}
