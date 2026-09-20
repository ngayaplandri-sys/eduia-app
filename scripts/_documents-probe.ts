import "./_env";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";

const BASE = "http://localhost:3000";
const PW = "Test1234!pw";

async function signIn(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email, password: PW }),
  });
  if (!res.ok) throw new Error(`sign-in → HTTP ${res.status}`);
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

async function main() {
  const stamp = Date.now();
  const email = `docprobe-${stamp}@eduia.test`;
  const u = await auth.api.signUpEmail({
    body: { email, password: PW, name: "Doc Probe" },
  });
  const uid = u.user.id;
  await db
    .update(schema.user)
    .set({ plan: "premium", emailVerified: true })
    .where(eq(schema.user.id, uid));
  await db.insert(schema.onboarding).values({
    userId: uid, firstName: "Doc", schoolLevel: "Terminale", subjects: ["SVT"],
    goal: "reviser", improveSubjects: ["SVT"], learningStyle: "resume",
  });
  const cookie = await signIn(email);

  for (const path of ["/documents", "/dashboard", "/historique"]) {
    const res = await fetch(`${BASE}${path}`, { headers: { cookie } });
    const body = await res.text();
    const isError =
      body.includes("Something went wrong") ||
      body.includes("appErrorTitle") ||
      body.includes("digest") ||
      res.status >= 400;
    console.log(`\n=== GET ${path} → HTTP ${res.status} (${body.length} bytes) ${isError ? "⚠️" : "✅"}`);
    // extract <title> and any error markers
    const title = body.match(/<title>([^<]*)<\/title>/)?.[1];
    console.log(`  title: ${title ?? "(none)"}`);
    for (const marker of ["error", "Error", "digest", "stack", "went wrong", "s'est produite", "Exception"]) {
      const idx = body.indexOf(marker);
      if (idx >= 0) {
        console.log(`  found "${marker}" @ ${idx}: …${body.slice(idx - 80, idx + 200).replace(/\s+/g, " ")}…`);
        break;
      }
    }
  }

  // cleanup
  await db.delete(schema.onboarding).where(eq(schema.onboarding.userId, uid));
  await db.delete(schema.session).where(eq(schema.session.userId, uid));
  await db.delete(schema.account).where(eq(schema.account.userId, uid));
  await db.delete(schema.user).where(eq(schema.user.id, uid));
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
