import Link from "next/link";
import { CloudUpload } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Les cours entrent dans la bibliothèque en étant résumés : le bouton mène à
 * « Résumer mes cours », où l'import (PDF, Word, TXT, photo) a lieu.
 */
export function ImportDocumentButton({ label }: { label: string }) {
  return (
    <Link href="/resumer" className={cn(buttonVariants(), "shrink-0")}>
      <CloudUpload className="size-4" aria-hidden />
      {label}
    </Link>
  );
}
