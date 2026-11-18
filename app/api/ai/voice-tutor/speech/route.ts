import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data/user";
import { isSpeakableText, synthesizeSpeech } from "@/lib/ai/voice-tutor";
import { voiceTutorSpeechSchema } from "@/lib/ai/schemas";
import { describeAIError } from "@/lib/ai/errors";
import { isSameOriginRequest } from "@/lib/http/guards";
import { getDictionary } from "@/lib/i18n/server";

export const maxDuration = 60;

/**
 * Lecture à voix haute d'une réponse du Professeur vocal : renvoie un MP3.
 * N'accepte que le message d'accueil fixe ou une réponse produite pour ce
 * compte (jeton signé renvoyé par `POST /api/ai/voice-tutor`). Pas de débit
 * séparé : la voix fait partie de la question déjà facturée.
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

  try {
    const audio = await synthesizeSpeech(text, language);
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[/api/ai/voice-tutor/speech] échec de la synthèse vocale :", error);
    const { status, message } = describeAIError(error, dict);
    return NextResponse.json({ error: message }, { status });
  }
}
