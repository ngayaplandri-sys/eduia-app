"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

type ToastTone = "default" | "success" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

/** Renvoie `toast(message, tone?)`. Sans provider, l'appel est ignoré (jamais d'erreur). */
export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  return ctx ?? { toast: () => {} };
}

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { dict } = useI18n();
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback(
    (message: string, tone: ToastTone = "default") => {
      counter += 1;
      const id = counter;
      setItems((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => remove(id), 4500);
    },
    [remove],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
        role="region"
        aria-live="polite"
        aria-label={dict.layout.notifications}
      >
        {items.map((item) => (
          <div
            key={item.id}
            data-state="open"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-700 shadow-pop data-[state=open]:animate-pop-in"
          >
            {item.tone === "success" ? (
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
            ) : null}
            <p className="min-w-0 flex-1 leading-snug">{item.message}</p>
            <button
              type="button"
              aria-label={dict.ui.close}
              onClick={() => remove(item.id)}
              className="-mr-1 -mt-0.5 shrink-0 rounded p-0.5 text-ink-400 transition-colors hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
