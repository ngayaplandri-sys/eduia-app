"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/client";
import {
  localizeActivityStatus,
  localizeActivityType,
} from "@/lib/i18n/labels";
import type { ActivityStatus, ActivityType } from "@/types";

const typeTone: Record<ActivityType, "success" | "primary" | "warning"> = {
  Résumé: "success",
  Épreuve: "primary",
  Correction: "warning",
};

export function ActivityTypeBadge({ type }: { type: ActivityType }) {
  const { dict } = useI18n();
  return <Badge tone={typeTone[type]}>{localizeActivityType(type, dict)}</Badge>;
}

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  const { dict } = useI18n();
  return (
    <Badge tone={status.tone}>{localizeActivityStatus(status.label, dict)}</Badge>
  );
}
