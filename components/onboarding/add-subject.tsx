"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CUSTOM_SUBJECT_MAX_COUNT,
  CUSTOM_SUBJECT_MAX_LENGTH,
  isValidSubjectName,
  normalizeSubjectName,
  subjectKey,
} from "@/lib/config/tool-options";
import { useI18n } from "@/lib/i18n/client";
import { localizeSubject } from "@/lib/i18n/labels";

/**
 * « + Ajouter une matière » : saisie d'une matière absente de la liste
 * proposée. Une matière déjà présente (même écrite sans accents, en minuscules
 * ou sous son nom traduit) n'est pas dupliquée : elle est simplement
 * sélectionnée.
 */
export function AddSubject({
  options,
  customCount,
  onAdd,
  onSelectExisting,
}: {
  /** Matières affichées (proposées + déjà ajoutées), valeurs canoniques. */
  options: readonly string[];
  /** Nombre de matières déjà ajoutées par l'utilisateur. */
  customCount: number;
  onAdd: (subject: string) => void;
  onSelectExisting: (subject: string) => void;
}) {
  const { dict } = useI18n();
  const t = dict.onboarding;
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setValue("");
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const name = normalizeSubjectName(value);
    const key = subjectKey(name);

    const existing = options.find(
      (option) =>
        subjectKey(option) === key || subjectKey(localizeSubject(option, dict)) === key,
    );
    if (existing) {
      onSelectExisting(existing);
      setNotice(t.customSubjectExists(localizeSubject(existing, dict)));
      close();
      return;
    }
    if (!isValidSubjectName(name)) {
      setError(t.customSubjectInvalid);
      return;
    }
    if (customCount >= CUSTOM_SUBJECT_MAX_COUNT) {
      setError(t.customSubjectLimit(CUSTOM_SUBJECT_MAX_COUNT));
      return;
    }
    onAdd(name);
    setNotice(t.customSubjectAdded(name));
    close();
  }

  return (
    <div className="space-y-2">
      {open ? (
        <form onSubmit={submit} className="space-y-2" noValidate>
          <label htmlFor="onboarding-custom-subject" className="sr-only">
            {t.customSubjectLabel}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              ref={inputRef}
              id="onboarding-custom-subject"
              value={value}
              maxLength={CUSTOM_SUBJECT_MAX_LENGTH}
              placeholder={t.customSubjectPlaceholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "onboarding-custom-subject-error" : undefined}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
              }}
            />
            <div className="flex shrink-0 gap-2">
              <Button type="submit" disabled={value.trim() === ""}>
                {t.customSubjectAdd}
              </Button>
              <Button type="button" variant="ghost" onClick={close}>
                {t.customSubjectCancel}
              </Button>
            </div>
          </div>
          {error ? (
            <p
              id="onboarding-custom-subject-error"
              className="text-fine font-medium text-danger-600"
            >
              {error}
            </p>
          ) : null}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary-300 bg-surface px-4 py-2 text-fine font-semibold text-primary-700 transition-[background-color,border-color,transform] duration-200 ease-out hover:-translate-y-px hover:border-primary-400 hover:bg-primary-50 active:translate-y-0 motion-reduce:hover:translate-y-0"
        >
          <Plus className="size-4" aria-hidden />
          {t.addSubject}
        </button>
      )}
      <p className="text-meta text-ink-500" aria-live="polite">
        {notice}
      </p>
    </div>
  );
}
