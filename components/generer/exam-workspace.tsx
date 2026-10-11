"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ExamConfigPanel,
  type GenerateExamInput,
} from "./exam-config-panel";
import { ExamResultPanel } from "./exam-result-panel";
import { ExamResultLoading } from "./exam-result-loading";
import { ToolWorkspaceLayout } from "@/components/common/tool-workspace-layout";
import { useI18n } from "@/lib/i18n/client";
import { UploadFailedError, buildUploadForm } from "@/lib/uploads/client";
import type { ExamConfig, GeneratedExam } from "@/types";

/** Abandon si la route ne répond pas (protège contre une requête qui pend). */
const REQUEST_TIMEOUT_MS = 150_000;

/**
 * Coordonne les deux panneaux de « Générer une épreuve » : le formulaire
 * déclenche l'appel réel à `POST /api/ai/generate-exam`, l'état de chargement /
 * d'erreur et l'affichage de l'épreuve générée vivent ici.
 *
 * Même patron que `components/resumer/resumer-workspace.tsx` : `initialExam` est
 * la dernière épreuve de l'élève (lue en base par la page) ; une épreuve
 * fraîchement générée la remplace immédiatement, et `router.refresh()`
 * resynchronise le reste (dashboard, historique, `/corriger`).
 */
export function ExamWorkspace({
  initialConfig,
  initialExam,
}: {
  initialConfig: ExamConfig;
  initialExam: GeneratedExam | null;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.generer;
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errorCode, setErrorCode] = React.useState<string | null>(null);
  const [exam, setExam] = React.useState<GeneratedExam | null>(initialExam);

  async function handleGenerate({ request, files }: GenerateExamInput) {
    setPending(true);
    setError(null);
    setErrorCode(null);

    const controller = new AbortController();
    const timer = window.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      const body = await buildUploadForm(request, { files }, controller.signal);
      const response = await fetch("/api/ai/generate-exam", {
        method: "POST",
        body,
        signal: controller.signal,
      });

      const data: { exam?: GeneratedExam; error?: string; code?: string } | null =
        await response.json().catch(() => null);

      if (!response.ok || !data?.exam) {
        setError(data?.error ?? t.genericFailure);
        setErrorCode(data?.code ?? null);
        return;
      }

      setExam(data.exam);
      // Resynchronise le dashboard / l'historique / les épreuves de `/corriger`.
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof UploadFailedError
          ? dict.ai.uploadFailed
          : caught instanceof DOMException && caught.name === "AbortError"
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
        <ExamConfigPanel
          config={initialConfig}
          pending={pending}
          errorMessage={error}
          errorCode={errorCode}
          onGenerate={handleGenerate}
        />
      }
      result={pending ? <ExamResultLoading /> : <ExamResultPanel exam={exam} />}
    />
  );
}
