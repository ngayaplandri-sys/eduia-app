"use client";

import * as React from "react";
import { ChevronRight, Flag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { submitReport } from "@/lib/actions/reports";
import { useI18n } from "@/lib/i18n/client";

const MIN_LENGTH = 10;

/**
 * Tuile « Signaler un problème » de la page Aide : ouvre un formulaire léger
 * qui enregistre un vrai signalement (table `reports` → `/admin/reports`).
 */
export function ReportProblemDialog() {
  const { toast } = useToast();
  const { dict } = useI18n();
  const t = dict.aide;
  const types = [
    { value: "bug", label: t.reportTypeBug },
    { value: "suggestion", label: t.reportTypeSuggestion },
    { value: "question", label: t.reportTypeQuestion },
    { value: "autre", label: t.reportTypeOther },
  ];
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState("bug");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function reset() {
    setType("bug");
    setDescription("");
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitReport({ type, description });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      reset();
      toast(t.reportSent, "success");
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="hover-lift group flex w-full items-start gap-3 rounded-xl border border-line-soft bg-surface p-4 text-left hover:border-line hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning-100 text-warning-700">
            <Flag className="size-[1.15rem]" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink-900">
              {t.reportTitle}
            </span>
            <span className="mt-0.5 block text-fine leading-snug text-ink-500">
              {t.reportTileDesc}
            </span>
          </span>
          <ChevronRight
            className="size-4 shrink-0 self-center text-ink-400 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </button>
      </DialogTrigger>

      <DialogContent title={t.reportTitle} description={t.reportDialogBody}>
        <div className="mt-4 space-y-4">
          <Field label={t.reportType} htmlFor="report-type">
            <Select
              id="report-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              {types.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t.reportDescription} htmlFor="report-description">
            <textarea
              id="report-description"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t.reportDescriptionPlaceholder}
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </Field>

          {error ? (
            <p className="rounded-lg bg-danger-50 px-3 py-2 text-fine font-medium text-danger-600">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                {dict.common.cancel}
              </Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={submit}
              disabled={pending || description.trim().length < MIN_LENGTH}
            >
              {pending ? t.reportSending : t.reportSend}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
