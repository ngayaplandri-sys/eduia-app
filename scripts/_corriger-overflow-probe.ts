import "./_env";
import { desc, eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";
import { chromium, type Page } from "playwright-core";

/**
 * Débordement horizontal de « Corriger une épreuve » : génère une VRAIE
 * correction (OpenAI) + un VRAI corrigé type, charge /corriger, balaie
 * 320→1920 px et signale tout dépassement (+ l'élément fautif le plus profond).
 *
 *   npx tsx scripts/_corriger-overflow-probe.ts
 */

const BASE = "http://localhost:3000";
const SYS_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PW = "Test1234!pw";
const WIDTHS = [320, 360, 375, 390, 414, 480, 640, 768, 834, 1024, 1180, 1280, 1440, 1920];

const DEEPEST_JS = `(function () {
  var vw = document.documentElement.clientWidth;
  var best = null, bestDepth = -1;
  function walk(el, depth) {
    if ((el.scrollWidth > vw + 4 || el.getBoundingClientRect().width > vw + 4) && depth > bestDepth) {
      var cs = getComputedStyle(el);
      bestDepth = depth;
      var path = [], n = el;
      while (n && path.length < 7) {
        var c = (n.className && typeof n.className === "string")
          ? "." + n.className.trim().split(/\\s+/).slice(0, 3).join(".") : "";
        path.unshift(n.tagName.toLowerCase() + c);
        n = n.parentElement;
      }
      best = { path: path.join(" > "), html: el.outerHTML.slice(0, 240), sw: el.scrollWidth,
        ws: cs.whiteSpace, ow: cs.overflowWrap };
    }
    for (var i = 0; i < el.children.length; i++) walk(el.children[i], depth + 1);
  }
  walk(document.body, 0);
  return best;
})()`;

async function signIn(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email, password: PW }),
  });
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

async function postForm(path: string, cookie: string, payload: Record<string, unknown>) {
  const form = new FormData();
  form.set("payload", JSON.stringify(payload));
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { cookie, origin: BASE },
    body: form,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function sweep(page: Page, label: string): Promise<boolean> {
  console.log(`\n── ${label} ──`);
  let anyBad = false;
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(300);
    const scrollW = Number(await page.evaluate("document.documentElement.scrollWidth"));
    const clientW = Number(await page.evaluate("document.documentElement.clientWidth"));
    const bad = scrollW > clientW + 1;
    anyBad = anyBad || bad;
    console.log(`  ${bad ? "❌" : "✅"} ${String(w).padStart(4)}px  scrollW=${scrollW} clientW=${clientW}`);
    if (bad) {
      const d = (await page.evaluate(DEEPEST_JS)) as
        | { path: string; html: string; sw: number; ws: string; ow: string }
        | null;
      if (d) {
        console.log(`       ↳ ${d.path}`);
        console.log(`         sw=${d.sw} white-space=${d.ws} overflow-wrap=${d.ow}`);
        console.log(`         ${d.html}`);
      }
    }
  }
  return anyBad;
}

async function main() {
  const email = `ovp-${Date.now()}@eduia.test`;
  const su = await auth.api.signUpEmail({ body: { email, password: PW, name: "Ovp Test" } });
  const uid = su.user.id;
  await db.update(schema.user).set({ plan: "premium", emailVerified: true }).where(eq(schema.user.id, uid));
  await db.insert(schema.onboarding).values({
    userId: uid, firstName: "Ovp", schoolLevel: "Terminale", subjects: ["Histoire"],
    goal: "reviser", improveSubjects: ["Histoire"], learningStyle: "resume",
  });
  const cookie = await signIn(email);

  console.log("\n── Génération épreuve + corrections réelles (OpenAI) ──\n");
  const ex = await postForm("/api/ai/generate-exam", cookie, {
    fileName: null, sourceKind: null, sourceText: null,
    subject: "Histoire", level: "Terminale", theme: "La Guerre froide",
    examType: "Devoir surveillé", questionCount: 6, questionMix: "Mixte",
    durationLabel: "2h", pageCount: "2 pages", options: {},
  });
  console.log(`  épreuve : HTTP ${ex.status}`);
  const [examRow] = await db.select().from(schema.exams).where(eq(schema.exams.userId, uid)).orderBy(desc(schema.exams.createdAt)).limit(1);
  const examLabel = examRow ? `${examRow.title} — ${examRow.theme} (${examRow.questionCount} questions)` : "";
  const examId = examRow?.id ?? "";

  const gr = await postForm("/api/ai/grade", cookie, {
    selectedExam: examLabel, selectedExamId: examId,
    level: "Terminale", answerFileName: null, answerSourceKind: null,
    answerText:
      "1. La doctrine Truman (1947) marque le début de l'endiguement. " +
      "2. Le plan Marshall est une aide économique des États-Unis à l'Europe de l'Ouest. " +
      "3. Le blocus de Berlin (1948-1949) est contré par un pont aérien. " +
      "4. Le mur de Berlin est érigé en 1961. " +
      "5. La crise des missiles de Cuba (octobre 1962) est le point culminant. " +
      "6. La détente des années 1970 : accords SALT et Ostpolitik.",
    answerSourceText: null, scale: "/20", strictness: "Standard", pageCount: "4 pages",
    options: { conseils: true, explications: true },
  });
  const corr = (gr.json as { correction?: { appreciation: string; score: number; maxScore: number } }).correction;
  console.log(`  correction notée : HTTP ${gr.status}  appréciation="${corr?.appreciation}" (${corr?.appreciation?.length ?? 0} car.)`);

  const browser = await chromium.launch({ executablePath: SYS_CHROME });
  const ctx = await browser.newContext({ baseURL: BASE });
  await ctx.addCookies(
    cookie.split("; ").map((p) => {
      const i = p.indexOf("=");
      return { name: p.slice(0, i), value: p.slice(i + 1), url: BASE };
    }),
  );
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`  [pageerror] ${e.message}`));
  await page.goto("/corriger", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  let bad = await sweep(page, "Copie notée (correction réelle)");
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: "scripts/_corriger-overflow.png", fullPage: true });

  // Corrigé type
  await postForm("/api/ai/grade", cookie, {
    selectedExam: examLabel, selectedExamId: examId, level: "Terminale",
    answerFileName: null, answerSourceKind: null, answerText: "", answerSourceText: null,
    scale: "/20", strictness: "Standard", pageCount: "3 pages", options: { conseils: true },
  });
  await page.goto("/corriger", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  bad = (await sweep(page, "Corrigé type (answer-key réel)")) || bad;

  await browser.close();

  await db.delete(schema.activities).where(eq(schema.activities.userId, uid));
  await db.delete(schema.corrections).where(eq(schema.corrections.userId, uid));
  await db.delete(schema.exams).where(eq(schema.exams.userId, uid));
  await db.delete(schema.aiUsage).where(eq(schema.aiUsage.userId, uid));
  await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, uid));
  await db.delete(schema.onboarding).where(eq(schema.onboarding.userId, uid));
  await db.delete(schema.session).where(eq(schema.session.userId, uid));
  await db.delete(schema.account).where(eq(schema.account.userId, uid));
  await db.delete(schema.user).where(eq(schema.user.id, uid));

  console.log(`\n${bad ? "❌ DÉBORDEMENT" : "✅ aucun débordement (320→1920 px, 2 modes)"}`);
  process.exit(bad ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
