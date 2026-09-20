"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AnswerSubmissionPanel,
  type GenerateCorrectionInput,
} from "./answer-submission-panel";
import { CorrectionReportPanel } from "./correction-report-panel";
import { CorrectionReportLoading } from "./correction-report-loading";
import { ToolWorkspaceLayout } from "@/components/common/tool-workspace-layout";
import { useI18n } from "@/lib/i18n/client";
import type { CorrectionConfig, ExamCorrection } from "@/types";

/** Abandon si la route ne répond pas (protège contre une requête qui pend). */
const REQUEST_TIMEOUT_MS = 150_000;

/**
 * Coordonne les deux panneaux de « Corriger une épreuve » : le formulaire
 * déclenche l'appel réel à `POST /api/ai/grade`, l'état de chargement / d'erreur
 * et l'affichage du bilan vivent ici.
 *
 * Même patron que `resumer-workspace.tsx` / `exam-workspace.tsx` :
 * `initialCorrection` est la dernière correction de l'élève (lue en base par la
 * page) ; une correction fraîchement générée la remplace immédiatement, et
 * `router.refresh()` resynchronise le reste (dashboard, historique).
 */
export function CorrectionWorkspace({
  initialConfig,
  initialCorrection,
}: {
  initialConfig: CorrectionConfig;
  initialCorrection: ExamCorrection | null;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.corriger;
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errorCode, setErrorCode] = React.useState<string | null>(null);
  const [correction, setCorrection] = React.useState<ExamCorrection | null>(
    initialCorrection,
  );

  async function handleGenerate({ request, file }: GenerateCorrectionInput) {
    setPending(true);
    setError(null);
    setErrorCode(null);

    const body = new FormData();
    body.append("payload", JSON.stringify(request));
    if (file) body.append("file", file, file.name);

    const controller = new AbortController();
    const timer = window.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch("/api/ai/grade", {
        method: "POST",
        body,
        signal: controller.signal,
      });

      const data: { correction?: ExamCorrection; error?: string; code?: string } | null =
        await response.json().catch(() => null);

      if (!response.ok || !data?.correction) {
        setError(data?.error ?? t.genericFailure);
        setErrorCode(data?.code ?? null);
        return;
      }

      setCorrection(data.correction);
      // Resynchronise le dashboard / l'historique.
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof DOMException && caught.name === "AbortError"
          ? t.timeout
          : t.connectionLost,
      );
    } finally {
      window.clearTimeout(timer);
      setPending(false);
    }
  }

  return (
    <ToolWorkspaceLayout
      config={
        <AnswerSubmissionPanel
          config={initialConfig}
          pending={pending}
          errorMessage={error}
          errorCode={errorCode}
          onGenerate={handleGenerate}
        />
      }
      result={
        pending ? (
          <CorrectionReportLoading />
        ) : (
          <CorrectionReportPanel correction={correction} />
        )
      }
    />
  );
}
