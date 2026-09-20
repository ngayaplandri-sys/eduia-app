import "./_env";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";

/**
 * Vérifie que le rôle `admin` contourne toutes les limites des routes IA, alors
 * que les comptes normaux (`student`) gardent leurs quotas.
 *
 *   npx tsx scripts/_admin-unlimited-verify.ts
 *
 * Nécessite : `npm run dev` actif sur http://localhost:3000 + `OPENAI_API_KEY`
 * valide (génère de vrais résumés / épreuves / corrections).
 */

const BASE = "http://localhost:3000";
const PW = "Test1234!pw";

type Json = Record<string, unknown>;

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function signIn(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email, password: PW }),
  });
  if (!res.ok) throw new Error(`sign-in ${email} → HTTP ${res.status}`);
  const jar = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  if (!jar) throw new Error(`sign-in ${email} : aucun cookie renvoyé`);
  return jar;
}

async function postJson(
  path: string,
  cookie: string,
  body: Json,
): Promise<{ status: number; json: Json }> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie, origin: BASE },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Json;
  return { status: res.status, json };
}

async function postSummary(
  cookie: string,
  sourceText: string,
): Promise<{ status: number; json: Json }> {
  const form = new FormData();
  form.set(
    "payload",
    JSON.stringify({
      fileName: null,
      sourceKind: null,
      sourceText,
      subject: "Histoire",
      level: "Terminale",
      chapter: "La guerre froide",
      theme: "Les blocs Est / Ouest",
      style: "Résumé clair",
      pageCount: "1 page",
      detailLevel: "Essentiel",
      options: { pointsEssentiels: true },
    }),
  );
  const res = await fetch(`${BASE}/api/ai/summarize`, {
    method: "POST",
    headers: { cookie, origin: BASE },
    body: form,
  });
  const json = (await res.json().catch(() => ({}))) as Json;
  return { status: res.status, json };
}

const EXAM_BODY: Json = {
  fileName: null,
  sourceKind: null,
  sourceText: null,
  subject: "Histoire",
  level: "Terminale",
  theme: "La guerre froide",
  examType: "Devoir surveillé",
  questionCount: 5,
  questionMix: "Mixte",
  durationLabel: "1h",
  pageCount: "2 pages",
  options: {},
};

const GRADE_BODY: Json = {
  selectedExam: "",
  level: "Terminale",
  answerFileName: null,
  answerSourceKind: null,
  answerText:
    "1. La guerre froide oppose les États-Unis et l'URSS de 1947 à 1991. " +
    "2. Le mur de Berlin est érigé en 1961 et tombe en 1989. " +
    "3. La crise de Cuba a lieu en 1962.",
  answerSourceText: null,
  scale: "/20",
  strictness: "Standard",
  pageCount: "2 pages",
  options: {},
};

const COURSE_TEXT =
  "La guerre froide (1947-1991) est une période de tensions entre le bloc de l'Ouest " +
  "mené par les États-Unis et le bloc de l'Est mené par l'URSS. Elle est marquée par " +
  "la doctrine Truman, le plan Marshall, le blocus de Berlin (1948-1949), la course aux " +
  "armements nucléaires, la crise de Cuba (1962) et la chute du mur de Berlin en 1989.";

async function main() {
  const stamp = Date.now();
  const adminEmail = `admin-nolimit-${stamp}@eduia.test`;
  const userEmail = `user-limited-${stamp}@eduia.test`;

  const adminSignUp = await auth.api.signUpEmail({
    body: { email: adminEmail, password: PW, name: "Admin NoLimit" },
  });
  const userSignUp = await auth.api.signUpEmail({
    body: { email: userEmail, password: PW, name: "User Limited" },
  });
  const adminId = adminSignUp.user.id;
  const userId = userSignUp.user.id;

  // Admin = rôle admin MAIS plan gratuit (prouve que c'est le RÔLE, pas le plan,
  // qui débloque). User = student + plan gratuit = configuration normale.
  await db
    .update(schema.user)
    .set({ role: "admin", plan: "free", emailVerified: true })
    .where(eq(schema.user.id, adminId));
  await db
    .update(schema.user)
    .set({ role: "student", plan: "free", emailVerified: true })
    .where(eq(schema.user.id, userId));

  const adminCookie = await signIn(adminEmail);
  const userCookie = await signIn(userEmail);

  console.log(
    "\n── ADMIN (role=admin, plan=free) : aucune limite ne doit s'appliquer ──\n",
  );

  const aExam = await postJson("/api/ai/generate-exam", adminCookie, EXAM_BODY);
  check(
    "generate-exam → pas de blocage 402",
    aExam.status !== 402,
    `HTTP ${aExam.status}`,
  );
  check(
    "generate-exam → épreuve réelle générée (HTTP 200 + exam)",
    aExam.status === 200 && Boolean(aExam.json.exam),
    aExam.status === 200
      ? `parties: ${((aExam.json.exam as Json)?.parts as unknown[])?.length ?? 0}`
      : JSON.stringify(aExam.json).slice(0, 120),
  );

  const aGrade = await postJson("/api/ai/grade", adminCookie, GRADE_BODY);
  check(
    "grade → pas de blocage 402",
    aGrade.status !== 402,
    `HTTP ${aGrade.status}`,
  );
  check(
    "grade → correction réelle générée (HTTP 200 + correction)",
    aGrade.status === 200 && Boolean(aGrade.json.correction),
    aGrade.status === 200 ? "" : JSON.stringify(aGrade.json).slice(0, 120),
  );

  const aSum1 = await postSummary(adminCookie, COURSE_TEXT);
  const aSum2 = await postSummary(adminCookie, COURSE_TEXT);
  check(
    "summarize #1 → HTTP 200",
    aSum1.status === 200,
    JSON.stringify(aSum1.json).slice(0, 120),
  );
  check(
    "summarize #2 → HTTP 200 (le quota gratuit unique ne s'applique pas)",
    aSum2.status === 200,
    `HTTP ${aSum2.status}`,
  );

  const [adminQuota] = await db
    .select({ used: schema.subscriptions.freeGenerationUsedAt })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, adminId));
  check(
    "quota gratuit JAMAIS marqué comme consommé pour l'admin",
    !adminQuota || adminQuota.used === null,
    adminQuota?.used ? `consommé le ${adminQuota.used.toISOString()}` : "aucune ligne / null",
  );

  console.log(
    "\n── UTILISATEUR NORMAL (role=student, plan=free) : quotas maintenus ──\n",
  );

  const uExam = await postJson("/api/ai/generate-exam", userCookie, EXAM_BODY);
  check(
    "generate-exam → 402 PREMIUM_REQUIRED (limite maintenue)",
    uExam.status === 402 && uExam.json.code === "PREMIUM_REQUIRED",
    `HTTP ${uExam.status}`,
  );

  const uGrade = await postJson("/api/ai/grade", userCookie, GRADE_BODY);
  check(
    "grade → 402 PREMIUM_REQUIRED (limite maintenue)",
    uGrade.status === 402 && uGrade.json.code === "PREMIUM_REQUIRED",
    `HTTP ${uGrade.status}`,
  );

  const uSum1 = await postSummary(userCookie, COURSE_TEXT);
  check(
    "summarize #1 → HTTP 200 (résumé gratuit offert)",
    uSum1.status === 200,
    JSON.stringify(uSum1.json).slice(0, 120),
  );

  const uSum2 = await postSummary(userCookie, COURSE_TEXT);
  check(
    "summarize #2 → 402 PREMIUM_REQUIRED (quota gratuit épuisé)",
    uSum2.status === 402 && uSum2.json.code === "PREMIUM_REQUIRED",
    `HTTP ${uSum2.status}`,
  );

  const [userQuota] = await db
    .select({ used: schema.subscriptions.freeGenerationUsedAt })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, userId));
  check(
    "quota gratuit bien marqué comme consommé pour l'utilisateur",
    Boolean(userQuota?.used),
    userQuota?.used ? `le ${userQuota.used.toISOString()}` : "NON marqué",
  );

  // ── Nettoyage ───────────────────────────────────────────────────────────
  for (const id of [adminId, userId]) {
    await db.delete(schema.activities).where(eq(schema.activities.userId, id));
    await db.delete(schema.summaries).where(eq(schema.summaries.userId, id));
    await db.delete(schema.documents).where(eq(schema.documents.userId, id));
    await db.delete(schema.aiUsage).where(eq(schema.aiUsage.userId, id));
    await db
      .delete(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, id));
    await db.delete(schema.session).where(eq(schema.session.userId, id));
    await db.delete(schema.account).where(eq(schema.account.userId, id));
    await db.delete(schema.user).where(eq(schema.user.id, id));
  }

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} réussis · ${failed} échoués`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\n❌ Échec du script :", error);
  process.exit(1);
});
