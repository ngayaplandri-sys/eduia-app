import { requireDbWipeConfirmation } from "./_env";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";
import { mockActivityHistory } from "../lib/data/mock/activity";
import { mockDocuments } from "../lib/data/mock/documents";
import { mockCourseSummary } from "../lib/data/mock/summary";
import { mockGeneratedExam } from "../lib/data/mock/exam";
import { mockExamCorrection } from "../lib/data/mock/correction";

/**
 * Compte de démonstration `demo@eduia.app` + données vitrine (celles de
 * `lib/data/mock/*`). Idempotent : vide tout puis réinsère.
 * Les vrais comptes créés via l'app démarrent, eux, sans aucune donnée.
 */
const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@eduia.app";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD;

async function main() {
  requireDbWipeConfirmation("db:seed");
  if (!DEMO_PASSWORD) {
    throw new Error("DEMO_USER_PASSWORD manquant dans .env.local");
  }

  // 1. Base propre (ordre inverse des clés étrangères).
  await db.delete(schema.aiUsage);
  await db.delete(schema.reports);
  await db.delete(schema.corrections);
  await db.delete(schema.exams);
  await db.delete(schema.summaries);
  await db.delete(schema.documents);
  await db.delete(schema.activities);
  await db.delete(schema.onboarding);
  await db.delete(schema.subscriptions);
  await db.delete(schema.session);
  await db.delete(schema.account);
  await db.delete(schema.user);

  // 2. Compte de démo via Better Auth (hash du mot de passe + account "credential").
  const signUp = await auth.api.signUpEmail({
    body: { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: "Alex Traoré" },
  });
  const userId = signUp.user.id;

  await db
    .update(schema.user)
    .set({ emailVerified: true })
    .where(eq(schema.user.id, userId));

  // 3. Données de démonstration.
  await db.insert(schema.activities).values(
    mockActivityHistory.map((item) => ({
      userId,
      title: item.title,
      meta: item.meta,
      fileKind: item.fileKind,
      type: item.type,
      statusLabel: item.status.label,
      statusTone: item.status.tone,
      actionLabel: item.action.label,
      actionHref: item.action.href,
      occurredAt: new Date(item.date),
    })),
  );

  await db.insert(schema.documents).values(
    mockDocuments.map((doc) => ({
      userId,
      name: doc.name,
      fileKind: doc.fileKind,
      subject: doc.subject,
      level: doc.level,
      sizeLabel: doc.sizeLabel,
      pageCount: doc.pageCount,
      hasSummary: doc.hasSummary,
      uploadedAt: new Date(doc.uploadedAt),
    })),
  );

  await db.insert(schema.summaries).values({
    userId,
    title: mockCourseSummary.title,
    subject: mockCourseSummary.subject,
    level: mockCourseSummary.level,
    theme: mockCourseSummary.theme,
    status: mockCourseSummary.status,
    payload: mockCourseSummary,
  });

  await db.insert(schema.exams).values({
    userId,
    title: mockGeneratedExam.title,
    subject: mockGeneratedExam.subject,
    level: mockGeneratedExam.level,
    theme: mockGeneratedExam.theme,
    examType: mockGeneratedExam.examType,
    status: mockGeneratedExam.status,
    questionCount: mockGeneratedExam.questionCount,
    totalPoints: mockGeneratedExam.totalPoints,
    payload: mockGeneratedExam,
  });

  await db.insert(schema.corrections).values({
    userId,
    examTitle: mockExamCorrection.examTitle,
    subject: mockExamCorrection.subject,
    level: mockExamCorrection.level,
    status: mockExamCorrection.status,
    score: mockExamCorrection.score,
    maxScore: mockExamCorrection.maxScore,
    payload: mockExamCorrection,
  });

  // Onboarding déjà complété : le compte de démo ne doit jamais y retomber.
  await db.insert(schema.onboarding).values({
    userId,
    firstName: "Alex",
    schoolLevel: "Terminale",
    subjects: ["Histoire", "Philosophie", "Mathématiques"],
    goal: "reviser",
    improveSubjects: ["Histoire"],
    learningStyle: "resume",
  });

  console.log("✅ Compte de démo + données vitrine insérés dans Neon");
  console.log(`   compte     : ${DEMO_EMAIL} (id ${userId})`);
  console.log(`   activités  : ${mockActivityHistory.length}`);
  console.log(`   documents  : ${mockDocuments.length}`);
  console.log("   résumés : 1 · épreuves : 1 · corrections : 1");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Échec du seed :", error);
    process.exit(1);
  });
