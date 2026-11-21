import { NextResponse } from "next/server";
import { getCurrentUser, hasUnlimitedAccess } from "@/lib/data/user";
import { describeAIError } from "@/lib/ai/errors";
import { OPENAI_MODEL } from "@/lib/ai/openai-client";
import { finishAiCall, reserveAiCall } from "@/lib/ai/usage";
import { dailyAiLimit } from "@/lib/config/credits";
import { MAX_UPLOAD_BYTES } from "@/lib/ai/extract";
import { detectImageMime, transcribeCourseImage } from "@/lib/ai/ocr";
import { getDictionary } from "@/lib/i18n/server";

export const maxDuration = 60;

/** En dessous de ce nombre de lettres/chiffres, la transcription est inexploitable. */
const MIN_USEFUL_CHARS = 8;

/**
 * Lecture d'une photo de cours (une page à la fois, appelée par
 * `lib/ocr/recognize-image.ts` pour chaque image importée) : renvoie le texte
 * transcrit, ou un motif précis quand la photo n'est pas lisible.
 *
 * Ne prélève aucun crédit : c'est une étape préparatoire, le coût est porté
 * par la génération (résumé, épreuve, correction) lancée ensuite. En échange,
 * un plafond d'images par jour (`DAILY_AI_LIMITS.ocrImages`, selon l'offre)
 * empêche un compte d'appeler la vision OpenAI en boucle.
 */
export async function POST(request: Request) {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);

  if (!user) {
    return NextResponse.json({ error: dict.ai.notSignedIn }, { status: 401 });
  }

  let image: FormDataEntryValue | null = null;
  try {
    image = (await request.formData()).get("image");
  } catch {
    return NextResponse.json({ error: dict.ai.invalidRequest }, { status: 400 });
  }

  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: dict.ai.invalidRequest }, { status: 400 });
  }
  if (image.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ code: "IMAGE_TOO_LARGE" }, { status: 413 });
  }

  const bytes = Buffer.from(await image.arrayBuffer());
  const mime = detectImageMime(bytes);
  if (!mime) {
    return NextResponse.json({ code: "UNSUPPORTED_IMAGE" }, { status: 415 });
  }

  // Place réservée AVANT l'appel OpenAI : des envois en rafale ne passent pas le plafond.
  const limit = hasUnlimitedAccess(user) ? null : dailyAiLimit("ocrImages", user.plan);
  let callId: string | null;
  try {
    callId = await reserveAiCall({ userId: user.id, kind: "ocr", model: OPENAI_MODEL, limit });
  } catch (error) {
    console.error("[/api/ai/ocr] échec de la réservation :", error);
    return NextResponse.json({ error: dict.ai.unexpected }, { status: 500 });
  }
  if (!callId) {
    return NextResponse.json(
      { error: dict.ai.dailyOcrLimit(limit ?? 0), code: "DAILY_LIMIT" },
      { status: 429 },
    );
  }

  try {
    const { transcription, usage } = await transcribeCourseImage(bytes, mime);

    await finishAiCall(callId, "success", usage);

    const meaningfulChars = transcription.text.replace(/[^\p{L}\p{N}]/gu, "").length;
    if (transcription.quality === "unreadable" || meaningfulChars < MIN_USEFUL_CHARS) {
      const issue =
        transcription.issue === "none" ? "no_text" : transcription.issue;
      return NextResponse.json({ code: "UNREADABLE", issue }, { status: 422 });
    }

    return NextResponse.json({
      text: transcription.text,
      quality: transcription.quality,
      issue: transcription.issue,
    });
  } catch (error) {
    console.error("[/api/ai/ocr] échec de la lecture de l'image :", error);
    await finishAiCall(callId, "error");
    const { status, message } = describeAIError(error, dict);
    return NextResponse.json({ error: message }, { status });
  }
}
