import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasUnlimitedAccess } from "@/lib/data/user";
import {
  consumeCredits,
  getCreditWallet,
  refundCredits,
} from "@/lib/data/credits";
import { getTutorProfile } from "@/lib/data/onboarding";
import {
  audioExtension,
  signSpeechText,
  streamVoiceTutor,
  transcribeQuestion,
} from "@/lib/ai/voice-tutor";
import { voiceTutorRequestSchema } from "@/lib/ai/schemas";
import { describeAIError } from "@/lib/ai/errors";
import { OPENAI_MODEL } from "@/lib/ai/openai-client";
import { logAiUsage } from "@/lib/ai/usage";
import { isSameOriginRequest } from "@/lib/http/guards";
import { VOICE_TUTOR_MAX_AUDIO_BYTES } from "@/lib/config/voice-tutor";
import { getDictionary } from "@/lib/i18n/server";
import type { CreditDebitResult } from "@/types";

/** Transcription + réponse en flux : laisse la fonction respirer en serverless. */
export const maxDuration = 60;

/**
 * Question orale au « Professeur vocal » (formulaire `multipart/form-data`) :
 *  - `payload` : JSON validé par `voiceTutorRequestSchema` (texte du PDF page
 *    par page, langues, page affichée, historique de la conversation) ;
 *  - `audio` : la question enregistrée au micro.
 *
 * L'audio est d'abord transcrit (sans débit : une question inaudible ne coûte
 * rien, et les erreurs sont renvoyées avec leur code HTTP). La question est
 * ensuite facturée comme un message à l'assistant (`CREDIT_COSTS.assistant`,
 * prélevé avant l'appel OpenAI et remboursé en cas d'échec — sauf accès
 * illimité de l'admin), puis la réponse part en flux NDJSON, une ligne JSON
 * par évènement :
 *  - `question` : la question transcrite ;
 *  - `delta` : le texte de la réponse au fil de l'écriture ;
 *  - `speech` : un passage prêt à être prononcé, avec le jeton qui autorise sa
 *    lecture par `POST /api/ai/voice-tutor/speech` ;
 *  - `done` (réponse complète, pages citées) ou `error`.
 */
export async function POST(request: Request) {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);
  const t = dict.ai;

  if (!user) {
    return NextResponse.json({ error: t.notSignedIn }, { status: 401 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: t.invalidRequest }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }
  const parsed = voiceTutorRequestSchema.safeParse(payload);
  const audio = form.get("audio");
  if (!parsed.success || !(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }
  const data = parsed.data;

  if (audio.size > VOICE_TUTOR_MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: dict.voiceTutor.errorRecordingTooLong, code: "AUDIO_TOO_LARGE" },
      { status: 413 },
    );
  }
  const extension = audioExtension(audio.type);
  if (!extension) {
    return NextResponse.json(
      { error: dict.voiceTutor.errorMicUnsupported, code: "UNSUPPORTED_AUDIO" },
      { status: 415 },
    );
  }

  let question: string;
  try {
    question = await transcribeQuestion(audio, extension, data.replyLanguage);
  } catch (error) {
    console.error("[/api/ai/voice-tutor] échec de la transcription :", error);
    const { status, message } = describeAIError(error, dict);
    return NextResponse.json({ error: message }, { status });
  }
  if (!question) {
    return NextResponse.json(
      { error: dict.voiceTutor.errorNoSpeech, code: "NO_SPEECH" },
      { status: 422 },
    );
  }

  const unlimited = hasUnlimitedAccess(user);
  let debit: CreditDebitResult | null = null;
  try {
    if (!unlimited) {
      debit = await db.transaction((tx) => consumeCredits(tx, user.id, "assistant"));
      if (!debit.ok) {
        return NextResponse.json(
          { error: dict.credits.insufficientMessage, code: "INSUFFICIENT_CREDITS", question },
          { status: 402 },
        );
      }
    }
  } catch (error) {
    console.error("[/api/ai/voice-tutor] échec du débit :", error);
    const { status, message } = describeAIError(error, dict);
    return NextResponse.json({ error: message, question }, { status });
  }

  const profile = await getTutorProfile(user.id).catch(() => ({
    firstName: null,
    schoolLevel: null,
  }));
  const upstream = new AbortController();
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Flux déjà fermé (l'élève a quitté la page) : rien à envoyer.
        }
      };

      send({ type: "question", text: question });
      try {
        for await (const event of streamVoiceTutor(data, question, profile, dict, upstream.signal)) {
          if (event.type === "delta") {
            send({ type: "delta", text: event.text });
          } else if (event.type === "speech") {
            send({ type: "speech", text: event.text, token: signSpeechText(user.id, event.text) });
          } else {
            await logAiUsage({
              userId: user.id,
              kind: "assistant",
              model: OPENAI_MODEL,
              status: "success",
              tokens: event.usage,
            });
            const credits = unlimited ? null : await getCreditWallet(user.id).catch(() => null);
            send({ type: "done", answer: event.answer, pages: event.pages, credits });
          }
        }
      } catch (error) {
        console.error("[/api/ai/voice-tutor] échec de la réponse :", error);
        if (debit?.ok) {
          const { drawnFromSubscription, drawnFromRecharge } = debit;
          await db
            .transaction((tx) =>
              refundCredits(tx, user.id, drawnFromSubscription, drawnFromRecharge, "assistant"),
            )
            .catch((refundError) =>
              console.error("[/api/ai/voice-tutor] échec du remboursement :", refundError),
            );
        }
        await logAiUsage({
          userId: user.id,
          kind: "assistant",
          model: OPENAI_MODEL,
          status: "error",
        });
        send({ type: "error", message: describeAIError(error, dict).message });
      }
      try {
        controller.close();
      } catch {
        // Déjà fermé.
      }
    },
    cancel() {
      // L'élève a quitté la page ou changé de cours : on coupe la génération.
      upstream.abort();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
