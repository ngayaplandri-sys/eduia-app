import type { Metadata } from "next";
import { cookies } from "next/headers";
import { VoiceTutorWorkspace } from "@/components/voice-tutor/voice-tutor-workspace";
import {
  VOICE_TUTOR_LANGUAGES_COOKIE,
  parseVoiceTutorLanguages,
} from "@/lib/config/voice-tutor";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.voiceTutor.metaTitle,
    description: dict.voiceTutor.metaDescription,
  };
}

/**
 * « Professeur vocal » : remplace l'Assistant IA dans la navigation. Langues
 * de départ : les dernières choisies sur cet appareil, sinon la langue de
 * l'interface pour les deux.
 */
export default async function VoiceTutorPage() {
  const [locale, cookieStore] = await Promise.all([getLocale(), cookies()]);
  const saved = parseVoiceTutorLanguages(cookieStore.get(VOICE_TUTOR_LANGUAGES_COOKIE)?.value);
  const fallback = locale === "en" ? "en" : "fr";

  return (
    <VoiceTutorWorkspace
      initialDocumentLanguage={saved?.document ?? fallback}
      initialReplyLanguage={saved?.reply ?? fallback}
    />
  );
}
