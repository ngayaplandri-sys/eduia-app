import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * `true` dès qu'une ligne `onboarding` existe pour ce compte — c'est le seul
 * signal utilisé pour décider d'afficher `/onboarding` (voir `app/(app)/layout.tsx`
 * et `app/onboarding/page.tsx`).
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.onboarding.id })
    .from(schema.onboarding)
    .where(eq(schema.onboarding.userId, userId))
    .limit(1);

  return Boolean(row);
}

/**
 * `true` si l'élève a terminé l'onboarding AVANT la question du pays (comptes
 * plus anciens) : le tableau de bord la lui pose une fois.
 */
export async function needsCountryAnswer(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ country: schema.onboarding.country })
    .from(schema.onboarding)
    .where(eq(schema.onboarding.userId, userId))
    .limit(1);

  return Boolean(row) && !row.country;
}

/**
 * Prénom et niveau scolaire déclarés à l'onboarding : le Professeur vocal
 * appelle l'élève par son prénom et adapte ses explications à son niveau.
 */
export async function getTutorProfile(
  userId: string,
): Promise<{ firstName: string | null; schoolLevel: string | null }> {
  const [row] = await db
    .select({
      firstName: schema.onboarding.firstName,
      schoolLevel: schema.onboarding.schoolLevel,
    })
    .from(schema.onboarding)
    .where(eq(schema.onboarding.userId, userId))
    .limit(1);

  return {
    firstName: row?.firstName.trim() || null,
    schoolLevel: row?.schoolLevel ?? null,
  };
}

export interface StudentProfile {
  firstName: string | null;
  /** Niveau scolaire déclaré (valeur canonique française, ex. « Terminale »). */
  schoolLevel: string | null;
  /** Matières suivies puis matières à améliorer, sans doublon. */
  subjects: string[];
  goal: string | null;
  learningStyle: string | null;
}

/**
 * Tout ce que l'élève a répondu à l'onboarding, pour que l'application s'en
 * serve tout de suite : prénom de l'accueil, niveau prérempli et matières
 * proposées dans Résumer / Générer / Corriger, objectif et façon d'apprendre
 * transmis à l'IA. Mis en cache pour la requête (layout + page).
 */
export const getStudentProfile = cache(async (userId: string): Promise<StudentProfile | null> => {
  const [row] = await db
    .select({
      firstName: schema.onboarding.firstName,
      schoolLevel: schema.onboarding.schoolLevel,
      subjects: schema.onboarding.subjects,
      improveSubjects: schema.onboarding.improveSubjects,
      goal: schema.onboarding.goal,
      learningStyle: schema.onboarding.learningStyle,
    })
    .from(schema.onboarding)
    .where(eq(schema.onboarding.userId, userId))
    .limit(1);
  if (!row) return null;
  const subjects = [...(row.subjects ?? []), ...(row.improveSubjects ?? [])]
    .map((subject) => subject.trim())
    .filter(Boolean);
  return {
    firstName: row.firstName.trim() || null,
    schoolLevel: row.schoolLevel.trim() || null,
    subjects: [...new Set(subjects)],
    goal: row.goal || null,
    learningStyle: row.learningStyle || null,
  };
});
