"use client";

import * as React from "react";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";

export function ImportDocumentButton() {
  const { toast } = useToast();
  const { dict } = useI18n();
  const t = dict.documents;
  const inputRef = React.useRef<HTMLInputElement>(null);

  function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files && files.length > 0) {
      const names = Array.from(files)
        .map((file) => file.name)
        .join(", ");
      toast(t.importSelected(names));
    }
    event.target.value = "";
  }

  return (
    <>
      <Button
        type="button"
        className="shrink-0"
        onClick={() => inputRef.current?.click()}
      >
        <CloudUpload className="size-4" aria-hidden />
        {t.importButton}
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onFiles}
      />
    </>
  );
}
