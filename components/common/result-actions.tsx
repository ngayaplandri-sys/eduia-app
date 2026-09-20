"use client";

import * as React from "react";
import { Download, Printer, Copy, Check, Share2, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/components/ui/toast";
import { downloadTextFile } from "@/lib/utils/download";
import { useI18n } from "@/lib/i18n/client";

const actionClass =
  "inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-fine font-semibold text-ink-700 transition-colors hover:bg-canvas hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-4 [&_svg]:text-ink-400";

/** L'utilisateur a fermé la feuille de partage native — ce n'est pas une erreur. */
function isShareAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Barre d'actions d'un résultat généré : Télécharger · Imprimer · Copier ·
 * Partager. Identique sur les trois outils (Résumer / Générer / Corriger).
 *
 * - **Télécharger** : si `onDownloadPdf` est fourni, génère et télécharge un vrai
 *   fichier PDF structuré ; sinon, repli sur un fichier texte `.txt` (`fileName`).
 * - **Imprimer** : ouvre la boîte d'impression du navigateur ; les styles
 *   `@media print` (`data-print-root` / `data-print-hide`) n'impriment que le
 *   document.
 * - **Partager** : si `sharePdf` est fourni, partage **le PDF généré par l'app**
 *   comme fichier via la feuille de partage native (`navigator.share({ files })`
 *   — WhatsApp, Gmail, Drive…) ; sinon (ou si le navigateur ne sait pas partager
 *   de fichier) repli sur le partage du texte, puis sur la copie presse-papiers.
 * - **Copier** : presse-papiers.
 *
 * `plainText` alimente le téléchargement `.txt`, la copie et le partage texte.
 */
export function ResultActions({
  plainText,
  fileName = "eduia-export.txt",
  shareTitle = "EduIA",
  onDownloadPdf,
  sharePdf,
}: {
  plainText: string;
  fileName?: string;
  shareTitle?: string;
  /** Génère et télécharge un vrai PDF. Fourni par les panneaux Résumé / Épreuve. */
  onDownloadPdf?: () => Promise<void>;
  /** Renvoie le PDF à partager comme fichier. Fourni par les panneaux Résumé / Épreuve. */
  sharePdf?: () => Promise<File | null>;
}) {
  const { toast } = useToast();
  const { dict } = useI18n();
  const t = dict.resultActions;
  const [copied, setCopied] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);

  async function download() {
    if (!onDownloadPdf) {
      downloadTextFile(fileName, plainText);
      toast(t.fileDownloaded, "success");
      return;
    }

    setDownloading(true);
    toast(t.preparingPdf);
    try {
      await onDownloadPdf();
      toast(t.pdfDownloaded, "success");
    } catch {
      toast(t.pdfFailed);
    } finally {
      setDownloading(false);
    }
  }

  function print() {
    if (typeof window !== "undefined") window.print();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(t.clipboardUnavailable);
    }
  }

  async function shareByClipboard() {
    try {
      await navigator.clipboard.writeText(plainText);
      toast(t.sharedByClipboard, "success");
    } catch {
      toast(t.shareUnavailable);
    }
  }

  /** Repli : partage du texte via la feuille native, sinon copie presse-papiers. */
  async function shareTextOrClipboard() {
    const shareData: ShareData = { title: shareTitle, text: plainText };
    const canUseWebShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      (typeof navigator.canShare !== "function" || navigator.canShare(shareData));

    if (canUseWebShare) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (isShareAbort(error)) return;
      }
    }
    await shareByClipboard();
  }

  async function share() {
    // Priorité : partager le PDF généré par l'application, comme fichier.
    if (sharePdf) {
      setSharing(true);
      toast(t.preparingPdf);
      try {
        const file = await sharePdf();
        const canShareFile =
          file != null &&
          typeof navigator !== "undefined" &&
          typeof navigator.share === "function" &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] });

        if (canShareFile) {
          await navigator.share({ files: [file], title: shareTitle });
          return;
        }
      } catch (error) {
        if (isShareAbort(error)) return;
        // PDF indisponible / partage fichier refusé → repli texte ci-dessous.
      } finally {
        setSharing(false);
      }
    }

    await shareTextOrClipboard();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={download}
        disabled={downloading}
        className={actionClass}
      >
        {downloading ? (
          <LoaderCircle className="animate-spin" aria-hidden />
        ) : (
          <Download aria-hidden />
        )}
        {downloading ? t.preparing : t.download}
      </button>
      <button type="button" onClick={print} className={actionClass}>
        <Printer aria-hidden />
        {t.print}
      </button>
      <button
        type="button"
        onClick={copy}
        className={cn(
          actionClass,
          copied && "text-success-700 [&_svg]:text-success-600",
        )}
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? t.copied : t.copy}
      </button>
      <button
        type="button"
        onClick={share}
        disabled={sharing}
        className={actionClass}
      >
        {sharing ? (
          <LoaderCircle className="animate-spin" aria-hidden />
        ) : (
          <Share2 aria-hidden />
        )}
        {t.share}
      </button>
    </div>
  );
}
