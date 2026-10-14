"use client";

import { Check, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";
import type { ComparisonRow } from "@/lib/config/premium";

export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  const { dict } = useI18n();
  const t = dict.premium;
  const tr = (value: string) => t.comparisonRows[value] ?? value;

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader className="mb-5">
        <CardTitle>{t.comparisonTitle}</CardTitle>
      </CardHeader>

      {/* Desktop / tablette : tableau 3 colonnes. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[30rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-soft text-left text-badge font-semibold tracking-wide text-ink-400 uppercase">
              <th className="py-3 pr-4">{t.colFeature}</th>
              <th className="px-4 py-3">{t.colFree}</th>
              <th className="py-3 pl-4 text-primary-700">{t.colPremium}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line-soft last:border-0">
                <td className="py-3.5 pr-4 font-medium text-ink-800">
                  {tr(row.label)}
                </td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center gap-1.5 text-ink-500">
                    {row.freeIncluded ? (
                      <Check className="size-4 shrink-0 text-success-600" aria-hidden />
                    ) : (
                      <Minus className="size-4 shrink-0 text-ink-400" aria-hidden />
                    )}
                    {tr(row.free)}
                  </span>
                </td>
                <td className="py-3.5 pl-4">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-ink-900">
                    <Check className="size-4 shrink-0 text-primary-600" aria-hidden />
                    {tr(row.premium)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2.5 sm:hidden">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl border border-line-soft p-3.5">
            <p className="text-fine font-bold text-ink-900">
              {tr(row.label)}
            </p>
            <div className="mt-2.5 flex items-center justify-between gap-3 text-fine">
              <span className="text-ink-400">{t.colFree}</span>
              <span className="inline-flex items-center gap-1.5 text-ink-500">
                {row.freeIncluded ? (
                  <Check className="size-3.5 shrink-0 text-success-600" aria-hidden />
                ) : (
                  <Minus className="size-3.5 shrink-0 text-ink-400" aria-hidden />
                )}
                {tr(row.free)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3 text-fine">
              <span className="font-semibold text-primary-700">
                {t.colPremium}
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-ink-900">
                <Check className="size-3.5 shrink-0 text-primary-600" aria-hidden />
                {tr(row.premium)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
