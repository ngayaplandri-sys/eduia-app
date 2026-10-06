"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AnswerSubmissionPanel,
  type GenerateCorrectionInput,
} from "./answer-submission-panel";
import { CorrectionReportPanel } from "./correction-report-panel";
import {
  CorrectionReportLoading,
  type CorrectionProgress,
} from "./correction-report-loading";
import { ToolWorkspaceLayout } from "@/components/common/tool-workspace-layout";
import { useI18n } from "@/lib/i18n/client";
import type {
  CorrectionConfig,
  CorrectionStreamEvent,
  ExamCorrection,
} from "@/types";

/**
 * Abandon si la route ne répond plus (protège contre une requête qui pend) :
 * analyse de l'épreuve + correction raisonnée d'une longue épreuve peuvent
 * approcher les 5 minutes allouées à la route.
 */
const REQUEST_TIMEOUT_MS = 310_000;

/** Lit un flux NDJSON (une ligne JSON par événement) au fil de l'eau. */
async function* readEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<CorrectionStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield JSON.parse(line) as CorrectionStreamEvent;
      newline = buffer.indexOf("\n");
    }
    if (done) break;
  }
  if (buffer.trim()) yield JSON.parse(buffer) as CorrectionStreamEvent;
}

/**
 * Coordonne les deux panneaux de « Corriger une épreuve » : le formulaire
 * déclenche l'appel réel à `POST /api/ai/grade`, dont la progression arrive en
 * flux (analyse de l'épreuve → matière et questions détectées → correction) ;
 * l'état de chargement / d'erreur et l'affichage du corrigé vivent ici.
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
  const [progress, setProgress] = React.useState<CorrectionProgress>({
    stage: "correcting",
    analysis: null,
    withAnalysis: false,
  });
  const [error, setError] = React.useState<string | null>(null);
  const [errorCode, setErrorCode] = React.useState<string | null>(null);
  const [correction, setCorrection] = React.useState<ExamCorrection | null>(
    initialCorrection,
  );
  // Remonter le formulaire (nouvelle `key`) le remet à zéro.
  const [formKey, setFormKey] = React.useState(0);
  const formRef = React.useRef<HTMLDivElement>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);

  function fail(message: string, code: string | null = null) {
    setError(message);
    setErrorCode(code);
  }

  async function handleGenerate({ request, examFiles, copyFiles }: GenerateCorrectionInput) {
    setPending(true);
    setError(null);
    setErrorCode(null);
    setProgress({
      stage: examFiles.length > 0 ? "analyzing" : "correcting",
      analysis: null,
      withAnalysis: examFiles.length > 0,
    });
    // Le bouton est en bas d'un long formulaire : on amène la progression
    // (puis le corrigé) sous les yeux, sur ordinateur comme sur mobile.
    window.requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );

    const body = new FormData();
    body.append("payload", JSON.stringify(request));
    for (const file of examFiles) body.append("examFiles", file, file.name);
    for (const file of copyFiles) body.append("copyFiles", file, file.name);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/ai/grade", {
        method: "POST",
        body,
        signal: controller.signal,
      });

      // Refus avant tout traitement (requête invalide, crédits, format…) : JSON.
      if (!response.ok || !response.body) {
        const data: { error?: string; code?: string } | null = await response
          .json()
          .catch(() => null);
        fail(data?.error ?? t.genericFailure, data?.code ?? null);
        return;
      }

      let finished = false;
      for await (const event of readEvents(response.body)) {
        if (event.type === "stage") {
          setProgress((current) => ({ ...current, stage: event.stage }));
        } else if (event.type === "analysis") {
          setProgress((current) => ({ ...current, analysis: event }));
        } else if (event.type === "error") {
          fail(event.error, event.code ?? null);
          finished = true;
        } else if (event.type === "result") {
          setCorrection(event.correction);
          finished = true;
          // Resynchronise le dashboard / l'historique / les crédits.
          router.refresh();
        }
      }
      if (!finished) fail(t.genericFailure);
    } catch (caught) {
      fail(
        caught instanceof DOMException && caught.name === "AbortError"
          ? t.timeout
          : t.connectionLost,
      );
    } finally {
      window.clearTimeout(timer);
      setPending(false);
    }
  }

  function startNew() {
    setFormKey((key) => key + 1);
    setError(null);
    setErrorCode(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <ToolWorkspaceLayout
      config={
        <div ref={formRef} className="min-w-0 scroll-mt-24">
          <AnswerSubmissionPanel
            key={formKey}
            config={initialConfig}
            pending={pending}
            errorMessage={error}
            errorCode={errorCode}
            onGenerate={handleGenerate}
          />
        </div>
      }
      result={
        <div ref={resultRef} className="min-w-0 scroll-mt-24">
          {pending ? (
            <CorrectionReportLoading progress={progress} />
          ) : (
            <CorrectionReportPanel
              correction={correction}
              onNew={correction ? startNew : undefined}
            />
          )}
        </div>
      }
    />
  );
}
