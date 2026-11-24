import type { Metadata } from "next";
import { cookies } from "next/headers";
import { VoiceTutorWorkspace } from "@/components/voice-tutor/voice-tutor-workspace";
import {
  VOICE_TUTOR_LANGUAGES_COOKIE,
  parseVoiceTutorLanguages,
} from "@/lib/config/voice-tutor";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getCurrentUser, hasUnlimitedAccess } from "@/lib/data/user";
import { getVoiceTrialState } from "@/lib/data/credits";

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
 * l'interface pour les deux. Compte gratuit : essai limité à quelques pages
 * (vérifié aussi côté serveur à chaque question).
 */
export default async function VoiceTutorPage() {
  const [locale, cookieStore, user] = await Promise.all([getLocale(), cookies(), getCurrentUser()]);
  const saved = parseVoiceTutorLanguages(cookieStore.get(VOICE_TUTOR_LANGUAGES_COOKIE)?.value);
  // Toutes les langues de l'interface sont aussi des langues du professeur.
  const fallback = locale;
  const voiceTrial =
    user && !hasUnlimitedAccess(user) ? await getVoiceTrialState(user.id).catch(() => null) : null;

  return (
    <VoiceTutorWorkspace
      userId={user?.id ?? "anonymous"}
      initialDocumentLanguage={saved?.document ?? fallback}
      initialReplyLanguage={saved?.reply ?? fallback}
      voiceTrial={voiceTrial}
    />
  );
}
