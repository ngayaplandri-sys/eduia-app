"use client";

import * as React from "react";
import { useI18n } from "@/lib/i18n/client";
import { localizeLevel, localizeSubject } from "@/lib/i18n/labels";

/** Réponses de l'onboarding utiles aux formulaires (voir `getStudentProfile`). */
export interface StudentProfileValue {
  firstName: string | null;
  schoolLevel: string | null;
  subjects: string[];
}

const StudentProfileContext = React.createContext<StudentProfileValue | null>(null);

/** Monté par le layout de l'application avec le profil de l'élève connecté. */
export function StudentProfileProvider({
  profile,
  children,
}: {
  profile: StudentProfileValue | null;
  children: React.ReactNode;
}) {
  return (
    <StudentProfileContext.Provider value={profile}>{children}</StudentProfileContext.Provider>
  );
}

/**
 * Niveau scolaire et matières déclarés à l'onboarding, affichés dans la langue
 * de l'interface : pour préremplir le niveau et proposer les matières dans
 * Résumer, Générer et Corriger.
 */
export function useStudentDefaults(): { level: string; subjects: string[] } {
  const profile = React.useContext(StudentProfileContext);
  const { dict } = useI18n();
  return React.useMemo(
    () => ({
      level: profile?.schoolLevel ? localizeLevel(profile.schoolLevel, dict) : "",
      subjects: (profile?.subjects ?? []).map((subject) => localizeSubject(subject, dict)),
    }),
    [profile, dict],
  );
}

/** Liste de suggestions de matières (`<input list=…>`), une par formulaire. */
export function SubjectSuggestions({ id, subjects }: { id: string; subjects: string[] }) {
  if (subjects.length === 0) return null;
  return (
    <datalist id={id}>
      {subjects.map((subject) => (
        <option key={subject} value={subject} />
      ))}
    </datalist>
  );
}
