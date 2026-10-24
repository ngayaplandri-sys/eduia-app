"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/data/user";
import { getDictionary } from "@/lib/i18n/server";
import { SCHOOL_LEVELS } from "@/lib/config/levels";
import {
  CUSTOM_SUBJECT_MAX_COUNT,
  SUBJECTS,
  isValidSubjectName,
  normalizeSubjectName,
  subjectKey,
} from "@/lib/config/tool-options";
import { ONBOARDING_GOAL_IDS, LEARNING_STYLE_IDS } from "@/lib/config/onboarding";
import { isDeclarableCountry } from "@/lib/config/countries";
import { detectCountry } from "@/lib/http/geo";
import type { OnboardingAnswers } from "@/types";

/** Matière proposée, ou ajoutée par l'utilisateur (voir `isValidSubjectName`). */
const subjectSchema = z
  .string()
  .transform(normalizeSubjectName)
  .refine(isValidSubjectName);

const onboardingSchema = z
  .object({
    firstName: z.string().trim().min(1).max(60),
    schoolLevel: z.enum(SCHOOL_LEVELS),
    subjects: z
      .array(subjectSchema)
      .min(1)
      .max(SUBJECTS.length + CUSTOM_SUBJECT_MAX_COUNT),
    goal: z.enum(ONBOARDING_GOAL_IDS),
    improveSubjects: z.array(subjectSchema).min(1),
    learningStyle: z.enum(LEARNING_STYLE_IDS),
    country: z.string().refine(isDeclarableCountry),
  })
  .refine(
    ({ subjects }) => new Set(subjects.map(subjectKey)).size === subjects.length,
  )
  .refine(
    ({ subjects }) =>
      subjects.filter((s) => !(SUBJECTS as readonly string[]).includes(s)).length <=
      CUSTOM_SUBJECT_MAX_COUNT,
  )
  .refine(({ subjects, improveSubjects }) =>
    improveSubjects.every((s) => subjects.includes(s)),
  );

export interface OnboardingActionResult {
  error?: string;
}

/**
 * Enregistre les réponses de l'onboarding pour l'utilisateur connecté (une
 * ligne par compte, `userId` unique → un nouveau passage remplace l'ancien) puis
 * redirige vers `/dashboard`. La redirection est levée hors du `try/catch` :
 * `redirect()` fonctionne en lançant une exception interne que Next.js
 * intercepte — un `catch` englobant l'avalerait par erreur.
 */
export async function saveOnboarding(
  input: OnboardingAnswers,
): Promise<OnboardingActionResult> {
  const [user, dict] = await Promise.all([requireUser(), getDictionary()]);

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: dict.onboarding.invalidAnswers };
  }

  // Pays de connexion (statistiques par pays), lu côté serveur uniquement.
  const detectedCountry = detectCountry(await headers());

  try {
    await db
      .insert(schema.onboarding)
      .values({ userId: user.id, ...parsed.data, detectedCountry })
      .onConflictDoUpdate({
        target: schema.onboarding.userId,
        set: { ...parsed.data, detectedCountry },
      });
  } catch (error) {
    console.error("Échec de l'enregistrement de l'onboarding :", error);
    return { error: dict.onboarding.saveFailed };
  }

  redirect("/dashboard");
}
