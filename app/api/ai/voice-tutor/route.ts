import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasUnlimitedAccess } from "@/lib/data/user";
import {
  consumeCredits,
  getCreditWallet,
  refundCredits,
} from "@/lib/data/credits";
import { getSchoolLevel } from "@/lib/data/onboarding";
import {
  askVoiceTutor,
  audioExtension,
  signSpeechText,
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

/** Transcription + réponse : laisse la fonction respirer en serverless. */
export const maxDuration = 60;

/**
 * Question au « Professeur vocal » (formulaire `multipart/form-data`) :
 *  - `payload` : JSON validé par `voiceTutorRequestSchema` (texte du PDF page
 *    par page, langues, page affichée, historique, question écrite éventuelle) ;
 *  - `audio` : la question enregistrée au micro, à la place de `question`.
 *
 * L'audio est d'abord transcrit (sans débit : une question inaudible ne coûte
 * rien), puis la question est facturée comme un message à l'assistant
 * (`CREDIT_COSTS.assistant`, prélevé avant l'appel OpenAI et remboursé en cas
 * d'échec — sauf accès illimité de l'admin). La réponse est renvoyée avec un
 * jeton qui autorise sa lecture à voix haute par `POST /api/ai/voice-tutor/speech`.
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
  if (!parsed.success) {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }
  const data = parsed.data;

  const audio = form.get("audio");
  let question = data.question;

  if (audio instanceof File && audio.size > 0) {
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
  }

  if (!question) {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }

  const unlimited = hasUnlimitedAccess(user);
  let debit: CreditDebitResult | null = null;

  try {
    if (!unlimited) {
      debit = await db.transaction((tx) => consumeCredits(tx, user.id, "assistant"));
      if (!debit.ok) {
        return NextResponse.json(
          {
            error: dict.credits.insufficientMessage,
            code: "INSUFFICIENT_CREDITS",
            question,
          },
          { status: 402 },
        );
      }
    }

    const schoolLevel = await getSchoolLevel(user.id);
    const { answer, pages, usage } = await askVoiceTutor(data, question, schoolLevel, dict);

    await logAiUsage({
      userId: user.id,
      kind: "assistant",
      model: OPENAI_MODEL,
      status: "success",
      tokens: usage,
    });

    const credits = unlimited ? null : await getCreditWallet(user.id);
    return NextResponse.json({
      question,
      answer,
      pages,
      speechToken: signSpeechText(user.id, answer),
      credits,
    });
  } catch (error) {
    console.error("[/api/ai/voice-tutor] échec de la réponse :", error);
    if (debit?.ok) {
      const { drawnFromSubscription, drawnFromRecharge } = debit;
      await db.transaction((tx) =>
        refundCredits(tx, user.id, drawnFromSubscription, drawnFromRecharge, "assistant"),
      );
    }
    await logAiUsage({
      userId: user.id,
      kind: "assistant",
      model: OPENAI_MODEL,
      status: "error",
    });
    const { status, message } = describeAIError(error, dict);
    return NextResponse.json({ error: message, question }, { status });
  }
}
