import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface AdminColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Colonne mise en avant : sert de titre de la carte sur mobile. */
  primary?: boolean;
  className?: string;
  align?: "left" | "right";
}

/**
 * Tableau responsive de l'espace admin : `<table>` à partir de `md`, cartes
 * empilées (clé/valeur) en dessous. Composant serveur — les `cell()` peuvent
 * renvoyer des composants client.
 */
export function AdminTable<T>({
  columns,
  rows,
  getRowKey,
  empty,
}: {
  columns: AdminColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  empty: React.ReactNode;
}) {
  if (rows.length === 0) return <>{empty}</>;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-soft text-left text-[0.7rem] font-semibold uppercase tracking-wide text-ink-400">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "py-3 pr-4 font-semibold",
                    col.align === "right" && "text-right",
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="border-b border-line-soft transition-colors duration-200 last:border-0 hover:bg-primary-50/40"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "py-3.5 pr-4 align-middle text-ink-700",
                      col.align === "right" && "text-right",
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div
            key={getRowKey(row)}
            className="rounded-xl border border-line-soft p-3.5"
          >
            {columns.map((col) =>
              col.primary ? (
                <div key={col.key} className="mb-2 text-sm font-semibold text-ink-900">
                  {col.cell(row)}
                </div>
              ) : (
                <div
                  key={col.key}
                  className="flex items-start justify-between gap-3 py-1 text-fine"
                >
                  <span className="shrink-0 text-ink-400">{col.header}</span>
                  <span className="min-w-0 text-right text-ink-700">
                    {col.cell(row)}
                  </span>
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </>
  );
}
