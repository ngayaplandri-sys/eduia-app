import { Badge } from "@/components/ui/badge";
import type { ReportStatus } from "@/types";

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  new: "Nouveau",
  in_progress: "En cours",
  resolved: "Résolu",
};

const REPORT_STATUS_TONE: Record<ReportStatus, "warning" | "info" | "success"> = {
  new: "warning",
  in_progress: "info",
  resolved: "success",
};

export const REPORT_TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  suggestion: "Suggestion",
  question: "Question",
  autre: "Autre",
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <Badge tone={REPORT_STATUS_TONE[status]} size="sm">
      {REPORT_STATUS_LABELS[status]}
    </Badge>
  );
}
