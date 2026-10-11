"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CourseUploadPanel,
  type GenerateSummaryInput,
} from "./course-upload-panel";
import { SummaryResultPanel } from "./summary-result-panel";
import { SummaryResultLoading } from "./summary-result-loading";
import { ToolWorkspaceLayout } from "@/components/common/tool-workspace-layout";
import { useI18n } from "@/lib/i18n/client";
import { UploadFailedError, buildUploadForm } from "@/lib/uploads/client";
import type { CourseDocument, CourseSummary } from "@/types";

/** Abandon si la route ne répond pas (protège contre une requête qui pend). */
const REQUEST_TIMEOUT_MS = 150_000;

/**
 * Coordonne les deux panneaux de « Résumer mes cours » : le formulaire déclenche
 * l'appel réel à `POST /api/ai/summarize`, l'état de chargement / d'erreur et
 * l'affichage du résumé généré vivent ici.
 *
 * `initialSummary` est le dernier résumé de l'élève (lu en base par la page) ;
 * un résumé fraîchement généré le remplace immédiatement, et `router.refresh()`
 * resynchronise le reste (dashboard, historique, documents).
 */
export function ResumerWorkspace({
  initialDocument,
  initialSummary,
}: {
  initialDocument: CourseDocument;
  initialSummary: CourseSummary | null;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.resumer;
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errorCode, setErrorCode] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<CourseSummary | null>(
    initialSummary,
  );

  async function handleGenerate({ request, files }: GenerateSummaryInput) {
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
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        body,
        signal: controller.signal,
      });

      const data: { summary?: CourseSummary; error?: string; code?: string } | null =
        await response.json().catch(() => null);

      if (!response.ok || !data?.summary) {
        setError(data?.error ?? t.genericFailure);
        setErrorCode(data?.code ?? null);
        return;
      }

      setSummary(data.summary);
      // Resynchronise le dashboard / l'historique / la bibliothèque de documents.
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
        <CourseUploadPanel
          courseDocument={initialDocument}
          pending={pending}
          errorMessage={error}
          errorCode={errorCode}
          onGenerate={handleGenerate}
        />
      }
      result={
        pending ? (
          <SummaryResultLoading />
        ) : (
          <SummaryResultPanel summary={summary} />
        )
      }
    />
  );
}
