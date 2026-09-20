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
  const email = `imgrepro-${stamp}@eduia.test`;
  const u = await auth.api.signUpEmail({ body: { email, password: PW, name: "Img Repro" } });
  const uid = u.user.id;
  await db.update(schema.user).set({ plan: "premium", emailVerified: true }).where(eq(schema.user.id, uid));
  await db.insert(schema.onboarding).values({
    userId: uid, firstName: "Img", schoolLevel: "Terminale", subjects: ["SVT"],
    goal: "reviser", improveSubjects: ["SVT"], learningStyle: "resume",
  });
  await db.insert(schema.documents).values({
    userId: uid,
    name: "photo_cours.jpg",
    fileKind: "image",
    subject: "SVT",
    level: "Terminale",
    sizeLabel: "1,2 Mo",
    pageCount: 1,
    hasSummary: true,
  });
  const cookie = await signIn(email);

  const res = await fetch(`${BASE}/documents`, { headers: { cookie } });
  const body = await res.text();
  console.log(`GET /documents → HTTP ${res.status} (${body.length} bytes)`);
  const errState = body.includes("Une erreur") || body.includes("s'est produite") || body.includes("réessay") || body.includes("error-state") || body.includes("global-error");
  console.log("error boundary hit:", errState);
  // dump any digest / message
  const m = body.match(/(TypeError|Cannot read propert[^"<\n]{0,120}|undefined \(reading[^"<\n]{0,60}|digest[^"<\n]{0,60})/);
  console.log("marker:", m ? m[0] : "(none)");
  const seg = body.indexOf("className");
  if (seg >= 0) console.log("…", body.slice(seg - 100, seg + 100).replace(/\s+/g, " "));

  await db.delete(schema.documents).where(eq(schema.documents.userId, uid));
  await db.delete(schema.onboarding).where(eq(schema.onboarding.userId, uid));
  await db.delete(schema.session).where(eq(schema.session.userId, uid));
  await db.delete(schema.account).where(eq(schema.account.userId, uid));
  await db.delete(schema.user).where(eq(schema.user.id, uid));
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
