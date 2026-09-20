"use client";

import * as React from "react";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { updateReportStatus } from "@/lib/actions/reports";
import type { ReportStatus } from "@/types";
import { REPORT_STATUS_LABELS } from "./report-status-badge";

const STATUSES: ReportStatus[] = ["new", "in_progress", "resolved"];

export function ReportStatusControl({
  id,
  status,
}: {
  id: string;
  status: ReportStatus;
}) {
  const { toast } = useToast();
  const [value, setValue] = React.useState<ReportStatus>(status);
  const [pending, startTransition] = React.useTransition();

  function change(next: ReportStatus) {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await updateReportStatus({ id, status: next });
      if (!result.ok) {
        setValue(previous);
        toast(result.error, "info");
        return;
      }
      toast(`Statut : ${REPORT_STATUS_LABELS[next]}`, "success");
    });
  }

  return (
    <Select
      aria-label="Changer le statut du signalement"
      className="h-9 w-[9.5rem] text-fine"
      value={value}
      disabled={pending}
      onChange={(event) => change(event.target.value as ReportStatus)}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {REPORT_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
