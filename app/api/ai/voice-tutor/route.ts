import { gunzipSync } from "node:zlib";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasUnlimitedAccess } from "@/lib/data/user";
import {
  consumeCredits,
  consumeVoiceTrialPage,
  getCreditWallet,
  getVoiceTrialState,
  refundCredits,
  refundVoiceTrialPage,
} from "@/lib/data/credits";
import { getTutorProfile } from "@/lib/data/onboarding";
import {
  audioExtension,
  isBackchannel,
  promptCacheKey,
  signSpeechText,
  streamVoiceTutor,
  transcribeQuestion,
} from "@/lib/ai/voice-tutor";
import { voiceTutorRequestSchema } from "@/lib/ai/schemas";
import { describeAIError } from "@/lib/ai/errors";
import { OPENAI_MODEL } from "@/lib/ai/openai-client";
import { logAiUsage } from "@/lib/ai/usage";
import { isSameOriginRequest } from "@/lib/http/guards";
import {
  VOICE_TUTOR_FREE_TRIAL_PAGES,
  VOICE_TUTOR_MAX_AUDIO_BYTES,
  isChargedLessonPage,
  type VoiceTrialState,
} from "@/lib/config/voice-tutor";
import { getDictionary } from "@/lib/i18n/server";
import type { CreditDebitResult } from "@/types";

/**
 * Transcription + réponse en flux. Une page entière lue, traduite et
 * expliquée s'écrit en une minute ou plus : on laisse 5 minutes.
 */
export const maxDuration = 300;

/**
 * `payload` compressé (gzip) par le navigateur : taille maximale reçue, et
 * taille maximale une fois décompressé (cours de 50 pages + historique).
 */
const MAX_COMPRESSED_PAYLOAD_BYTES = 1024 * 1024;
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;

/** Lit `payload` : texte JSON, ou fichier JSON compressé en gzip. */
async function readPayload(value: FormDataEntryValue | null): Promise<unknown> {
  if (typeof value === "string") return JSON.parse(value);
  if (!(value instanceof File) || value.size > MAX_COMPRESSED_PAYLOAD_BYTES) {
    throw new Error("payload invalide");
  }
  const json = gunzipSync(Buffer.from(await value.arrayBuffer()), {
    maxOutputLength: MAX_PAYLOAD_BYTES,
  });
  return JSON.parse(json.toString("utf8"));
}

/**
 * Question orale au « Professeur vocal » (formulaire `multipart/form-data`) :
 *  - `payload` : JSON validé par `voiceTutorRequestSchema` (texte du PDF page
 *    par page, langues, page affichée, historique de la conversation), envoyé
 *    compressé en gzip par les navigateurs qui le permettent ;
 *  - `audio` : la question enregistrée au micro (absente pour la suite
 *    automatique d'une explication page par page : `continueLesson`, facturée
 *    comme une question).
 *
 * L'audio est d'abord transcrit (sans débit : une question inaudible ne coûte
 * rien, et les erreurs sont renvoyées avec leur code HTTP). La question est
 * ensuite facturée comme un message à l'assistant (`CREDIT_COSTS.assistant`,
 * prélevé avant l'appel OpenAI et remboursé en cas d'échec — sauf accès
 * illimité de l'admin), puis la réponse part en flux NDJSON, une ligne JSON
 * par évènement. Compte gratuit : essai de `VOICE_TUTOR_FREE_TRIAL_PAGES`
 * pages (1 crédit par réponse, une fois pour toutes), puis 402
 * `VOICE_TRIAL_ENDED` (Premium) ; une réponse échouée rend la page d'essai.
 *  - `question` : la question transcrite (+ `trialRemaining` pendant l'essai) ;
 *  - `focus` : la page (et quelques mots) du cours dont parle la réponse, et
 *    sa langue si l'élève a demandé d'en changer ;
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
    payload = await readPayload(form.get("payload"));
  } catch {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }
  const parsed = voiceTutorRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }
  const data = parsed.data;

  const unlimited = hasUnlimitedAccess(user);
  // Compte gratuit : essai limité à quelques pages, vérifié AVANT la
  // transcription pour ne rien dépenser une fois l'essai terminé.
  let trial: VoiceTrialState | null = null;
  if (!unlimited) {
    try {
      trial = await getVoiceTrialState(user.id);
    } catch (error) {
      console.error("[/api/ai/voice-tutor] lecture de l'essai impossible :", error);
      const { status, message } = describeAIError(error, dict);
      return NextResponse.json({ error: message }, { status });
    }
  }
  const trialEnded = () =>
    NextResponse.json(
      {
        error: dict.voiceTutor.trialEndedMessage(VOICE_TUTOR_FREE_TRIAL_PAGES),
        code: "VOICE_TRIAL_ENDED",
      },
      { status: 402 },
    );
  // Exception : l'élève a coupé la dernière réponse de l'essai. Un simple
  // « oui » doit laisser la voix reprendre (NO_SPEECH plus bas) ; une vraie
  // question est refusée au moment du débit.
  if (trial && trial.remaining <= 0 && !data.interrupted) return trialEnded();

  // Suite automatique d'une explication page par page : pas de question orale.
  let question = "";
  if (!data.continueLesson) {
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
    }
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

    try {
      question = await transcribeQuestion(audio, extension, [data.replyLanguage, data.documentLanguage]);
    } catch (error) {
      console.error("[/api/ai/voice-tutor] échec de la transcription :", error);
      const { status, message } = describeAIError(error, dict);
      return NextResponse.json({ error: message }, { status });
    }
    // Rien d'audible, ou un simple « oui » / « d'accord » glissé pendant que
    // le professeur parlait : aucune réponse ni crédit, la page reprend la
    // voix là où elle s'était arrêtée (ou réécoute l'élève).
    if (!question || (data.interrupted && isBackchannel(question))) {
      return NextResponse.json(
        { error: dict.voiceTutor.errorNoSpeech, code: "NO_SPEECH" },
        { status: 422 },
      );
    }
  }

  // Suite d'une explication page par page : 1 crédit toutes les 3 pages seulement
  // (pendant l'essai gratuit, chaque page coûte 1 crédit).
  const charged = !data.continueLesson || isChargedLessonPage((data.lessonPage ?? 0) + 1);
  let debit: { drawnFromSubscription: number; drawnFromRecharge: number } | null = null;
  let trialRemaining: number | null = null;
  try {
    if (trial) {
      const outcome = await db.transaction((tx) => consumeVoiceTrialPage(tx, user.id));
      if (!outcome.ok) {
        if (outcome.reason === "trial_ended") return trialEnded();
        return NextResponse.json(
          { error: dict.credits.insufficientMessage, code: "INSUFFICIENT_CREDITS", question },
          { status: 402 },
        );
      }
      debit = outcome;
      trialRemaining = outcome.remaining;
    } else if (!unlimited && charged) {
      const result: CreditDebitResult = await db.transaction((tx) =>
        consumeCredits(tx, user.id, "assistant"),
      );
      if (!result.ok) {
        return NextResponse.json(
          { error: dict.credits.insufficientMessage, code: "INSUFFICIENT_CREDITS", question },
          { status: 402 },
        );
      }
      debit = result;
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

      send({
        type: "question",
        text: question,
        ...(trialRemaining !== null ? { trialRemaining } : {}),
      });
      try {
        const cacheKey = promptCacheKey(user.id, data);
        const options = { trialLast: trialRemaining === 0 };
        for await (const event of streamVoiceTutor(data, question, profile, dict, upstream.signal, cacheKey, options)) {
          if (event.type === "focus") {
            send({ type: "focus", ...event.focus });
          } else if (event.type === "delta") {
            send({ type: "delta", text: event.text });
          } else if (event.type === "speech") {
            send({
              type: "speech",
              text: event.text,
              token: signSpeechText(user.id, event.text),
              ...(event.original ? { original: true, language: event.language } : {}),
              ...(event.translation ? { translation: true } : {}),
            });
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
        if (debit) {
          const { drawnFromSubscription, drawnFromRecharge } = debit;
          await db
            .transaction(async (tx) => {
              await refundCredits(tx, user.id, drawnFromSubscription, drawnFromRecharge, "assistant");
              // Page d'essai rendue avec son crédit.
              if (trial) await refundVoiceTrialPage(tx, user.id);
            })
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
