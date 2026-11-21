import { NextResponse } from "next/server";
import { getCurrentUser, hasUnlimitedAccess } from "@/lib/data/user";
import {
  VOICE_TUTOR_TTS_MODEL,
  isSpeakableText,
  synthesizeSpeech,
} from "@/lib/ai/voice-tutor";
import { mp3DurationMs, reserveSpeech, settleSpeech } from "@/lib/ai/usage";
import { dailyAiLimit } from "@/lib/config/credits";
import { voiceTutorSpeechSchema } from "@/lib/ai/schemas";
import { describeAIError } from "@/lib/ai/errors";
import { isSameOriginRequest } from "@/lib/http/guards";
import { getDictionary } from "@/lib/i18n/server";

export const maxDuration = 60;

/**
 * Lecture à voix haute d'une réponse du Professeur vocal : renvoie un MP3.
 * N'accepte que le message d'accueil fixe ou une réponse produite pour ce
 * compte (jeton signé renvoyé par `POST /api/ai/voice-tutor`, valable 12 h).
 * Pas de débit séparé : la voix fait partie de la question déjà facturée. Mais
 * une réponse se réécoute, donc chaque passage prononcé est compté
 * (`ai_usage`, type `speech`) dans un plafond de caractères par jour
 * (`DAILY_AI_LIMITS.speechChars`, selon l'offre).
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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }
  const parsed = voiceTutorSpeechSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: t.invalidRequest }, { status: 400 });
  }

  const { text, language, token } = parsed.data;
  if (!isSpeakableText(user.id, text, token)) {
    return NextResponse.json({ error: t.invalidRequest }, { status: 403 });
  }

  const limit = hasUnlimitedAccess(user) ? null : dailyAiLimit("speechChars", user.plan);
  let usageId: string | null;
  try {
    usageId = await reserveSpeech({
      userId: user.id,
      model: VOICE_TUTOR_TTS_MODEL,
      chars: text.length,
      limit,
    });
  } catch (error) {
    console.error("[/api/ai/voice-tutor/speech] échec de la réservation :", error);
    return NextResponse.json({ error: t.unexpected }, { status: 500 });
  }
  if (!usageId) {
    return NextResponse.json(
      { error: dict.voiceTutor.speechDailyLimit, code: "DAILY_LIMIT" },
      { status: 429 },
    );
  }

  try {
    const audio = await synthesizeSpeech(text, language);
    await settleSpeech(usageId, { audioMs: mp3DurationMs(audio) });
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[/api/ai/voice-tutor/speech] échec de la synthèse vocale :", error);
    await settleSpeech(usageId, { failedChars: text.length });
    const { status, message } = describeAIError(error, dict);
    return NextResponse.json({ error: message }, { status });
  }
}
