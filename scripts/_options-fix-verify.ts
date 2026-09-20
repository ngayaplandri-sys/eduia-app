import "./_env";
import { chromium } from "playwright-core";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";

const BASE = "http://localhost:3000";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PW = "Test1234!pw";

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const stamp = Date.now();
  const email = `opts-${stamp}@eduia.test`;
  const u = await auth.api.signUpEmail({ body: { email, password: PW, name: "Opts Test" } });
  const uid = u.user.id;
  await db.update(schema.user).set({ plan: "premium", emailVerified: true }).where(eq(schema.user.id, uid));
  await db.insert(schema.onboarding).values({
    userId: uid, firstName: "Opts", schoolLevel: "Terminale", subjects: ["SVT"],
    goal: "reviser", improveSubjects: ["SVT"], learningStyle: "resume",
  });

  const signRes = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email, password: PW }),
  });
  const cookies = signRes.headers.getSetCookie().map((c) => {
    const [pair] = c.split(";");
    const eqIdx = pair.indexOf("=");
    return { name: pair.slice(0, eqIdx).trim(), value: pair.slice(eqIdx + 1).trim(), domain: "localhost", path: "/" };
  });

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  // ── 1. /resumer : les 5 options doivent être décochées au chargement ──────
  console.log("\n── 1. /resumer — état initial des options ──\n");
  await page.goto(`${BASE}/resumer`, { waitUntil: "networkidle" });
  const resumerSwitches = page.locator('[role="switch"]');
  const resumerCount = await resumerSwitches.count();
  check("5 interrupteurs présents", resumerCount === 5, `trouvé ${resumerCount}`);
  let resumerAllOff = true;
  for (let i = 0; i < resumerCount; i++) {
    const checked = await resumerSwitches.nth(i).getAttribute("aria-checked");
    if (checked !== "false") resumerAllOff = false;
  }
  check("aucune option cochée par défaut (résumer)", resumerAllOff);

  // Active 2 options manuellement, vérifie que ça répond au clic
  await resumerSwitches.nth(0).click();
  await resumerSwitches.nth(2).click();
  const c0 = await resumerSwitches.nth(0).getAttribute("aria-checked");
  const c1 = await resumerSwitches.nth(1).getAttribute("aria-checked");
  const c2 = await resumerSwitches.nth(2).getAttribute("aria-checked");
  check("clic sur l'option 1 → activée", c0 === "true");
  check("option 2 (non cliquée) → toujours désactivée", c1 === "false");
  check("clic sur l'option 3 → activée", c2 === "true");
  // Re-clic pour désactiver
  await resumerSwitches.nth(0).click();
  const c0b = await resumerSwitches.nth(0).getAttribute("aria-checked");
  check("re-clic sur l'option 1 → désactivée", c0b === "false");

  // ── 2. /generer : les 4 options doivent être décochées au chargement ──────
  console.log("\n── 2. /generer — état initial des options ──\n");
  await page.goto(`${BASE}/generer`, { waitUntil: "networkidle" });
  const genererSwitches = page.locator('[role="switch"]');
  const genererCount = await genererSwitches.count();
  check("4 interrupteurs présents", genererCount === 4, `trouvé ${genererCount}`);
  let genererAllOff = true;
  for (let i = 0; i < genererCount; i++) {
    const checked = await genererSwitches.nth(i).getAttribute("aria-checked");
    if (checked !== "false") genererAllOff = false;
  }
  check("aucune option cochée par défaut (générer)", genererAllOff);

  await genererSwitches.nth(0).click(); // barème
  await genererSwitches.nth(3).click(); // explications
  const g0 = await genererSwitches.nth(0).getAttribute("aria-checked");
  const g3 = await genererSwitches.nth(3).getAttribute("aria-checked");
  check("clic barème → activé", g0 === "true");
  check("clic explications → activé", g3 === "true");

  console.log("\npageerror:", pageErrors.join("\n") || "(none)");
  await browser.close();

  // ── 3. Bout en bout API : soumission réelle avec options actives ─────────
  console.log("\n── 3. Génération réelle (résumé + épreuve) avec options ──\n");
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const summaryForm = new FormData();
  summaryForm.set(
    "payload",
    JSON.stringify({
      fileName: null,
      sourceKind: null,
      sourceText: "Le cycle de l'eau : évaporation, condensation, précipitations, ruissellement.",
      subject: "SVT",
      level: "Terminale",
      chapter: "Le cycle de l'eau",
      theme: "",
      style: "Résumé clair",
      pageCount: "1 page",
      detailLevel: "Essentiel",
      options: { pointsEssentiels: true, formules: true },
    }),
  );
  const sr = await fetch(`${BASE}/api/ai/summarize`, {
    method: "POST",
    headers: { cookie: cookieHeader, origin: BASE },
    body: summaryForm,
  });
  const sj = await sr.json().catch(() => ({}));
  check("POST /api/ai/summarize (options actives) → 200", sr.status === 200, `HTTP ${sr.status} ${sj.error ?? ""}`);

  const examForm = new FormData();
  examForm.set(
    "payload",
    JSON.stringify({
      fileName: null,
      sourceKind: null,
      sourceText: "Le cycle de l'eau : évaporation, condensation, précipitations, ruissellement.",
      subject: "SVT",
      level: "Terminale",
      theme: "Le cycle de l'eau",
      examType: "Devoir surveillé",
      questionCount: 4,
      questionMix: "Mixte",
      durationLabel: "1h",
      pageCount: "1 page",
      options: { bareme: true, explications: true },
    }),
  );
  const er = await fetch(`${BASE}/api/ai/generate-exam`, {
    method: "POST",
    headers: { cookie: cookieHeader, origin: BASE },
    body: examForm,
  });
  const ej = await er.json().catch(() => ({}));
  check("POST /api/ai/generate-exam (options actives) → 200", er.status === 200, `HTTP ${er.status} ${ej.error ?? ""}`);

  // ── Nettoyage ─────────────────────────────────────────────────────────
  await db.delete(schema.activities).where(eq(schema.activities.userId, uid));
  await db.delete(schema.exams).where(eq(schema.exams.userId, uid));
  await db.delete(schema.summaries).where(eq(schema.summaries.userId, uid));
  await db.delete(schema.aiUsage).where(eq(schema.aiUsage.userId, uid));
  await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, uid));
  await db.delete(schema.onboarding).where(eq(schema.onboarding.userId, uid));
  await db.delete(schema.session).where(eq(schema.session.userId, uid));
  await db.delete(schema.account).where(eq(schema.account.userId, uid));
  await db.delete(schema.user).where(eq(schema.user.id, uid));

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} réussis · ${failed} échoués`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
