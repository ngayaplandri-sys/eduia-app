import "./_env";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";

const BASE = "http://localhost:3000";
const PW = "Test1234!pw";

async function main() {
  const email = `nr-${Date.now()}@eduia.test`;
  const u = await auth.api.signUpEmail({
    body: { email, password: PW, name: "No Ref" },
  });
  const uid = u.user.id;
  await db
    .update(schema.user)
    .set({ plan: "premium", emailVerified: true })
    .where(eq(schema.user.id, uid));
  const si = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email, password: PW }),
  });
  const cookie = si.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  const payload = {
    selectedExam: "",
    selectedExamId: "",
    level: "Terminale",
    answerFileName: null,
    answerSourceKind: null,
    answerText:
      "1. The Cold War began with the Truman Doctrine in 1947. " +
      "2. The Marshall Plan was US economic aid to Europe. " +
      "3. The Berlin Wall was built in 1961.",
    answerSourceText: null,
    scale: "/20",
    strictness: "Standard",
    pageCount: "4 pages",
    options: { conseils: true, explications: true },
  };

  for (let i = 1; i <= 6; i++) {
    const form = new FormData();
    form.set("payload", JSON.stringify(payload));
    const res = await fetch(`${BASE}/api/ai/grade`, {
      method: "POST",
      headers: { cookie: `${cookie}; eduia.locale=en`, origin: BASE },
      body: form,
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      _dbg?: string;
      correction?: { questions: unknown[]; score: number; maxScore: number };
    };
    console.log(
      `#${i} HTTP ${res.status} ${
        res.ok
          ? `ok · ${json.correction?.questions.length} q · ${json.correction?.score}/${json.correction?.maxScore}`
          : `${json.error} | ${json._dbg ?? ""}`
      }`,
    );
  }

  await db.delete(schema.activities).where(eq(schema.activities.userId, uid));
  await db.delete(schema.corrections).where(eq(schema.corrections.userId, uid));
  await db.delete(schema.aiUsage).where(eq(schema.aiUsage.userId, uid));
  await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, uid));
  await db.delete(schema.session).where(eq(schema.session.userId, uid));
  await db.delete(schema.account).where(eq(schema.account.userId, uid));
  await db.delete(schema.user).where(eq(schema.user.id, uid));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
