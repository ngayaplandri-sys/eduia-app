import "./_env";
import { eq, desc } from "drizzle-orm";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";

async function main() {
  const [u] = await db.select().from(schema.user).where(eq(schema.user.email, "ngayaplandri@gmail.com"));
  if (!u) { console.log("no such user"); return; }
  console.log("user:", u.id, "plan:", u.plan, "role:", u.role, "locale:", u.locale, "theme:", u.theme);

  const docs = await db.select().from(schema.documents).where(eq(schema.documents.userId, u.id));
  console.log("\ndocuments:", docs.length);
  for (const d of docs) console.log("  -", d.id, d.name, d.fileKind, d.sizeLabel, d.pageCount, "hasSummary=" + d.hasSummary);

  const sums = await db.select().from(schema.summaries).where(eq(schema.summaries.userId, u.id)).orderBy(desc(schema.summaries.createdAt));
  console.log("\nsummaries:", sums.length);
  for (const s of sums) console.log("  -", s.id, "| title:", s.title, "| documentId:", s.documentId);

  const exams = await db.select().from(schema.exams).where(eq(schema.exams.userId, u.id)).orderBy(desc(schema.exams.createdAt));
  console.log("\nexams:", exams.length);
  for (const e of exams) console.log("  -", e.id, "| title:", e.title, "| theme:", e.theme, "| sourceText:", e.sourceText ? e.sourceText.length + " chars" : "NULL");

  const corr = await db.select().from(schema.corrections).where(eq(schema.corrections.userId, u.id)).orderBy(desc(schema.corrections.createdAt));
  console.log("\ncorrections:", corr.length);
  for (const c of corr) console.log("  -", c.id, "| examTitle:", c.examTitle, "| examId:", c.examId);

  const acts = await db.select().from(schema.activities).where(eq(schema.activities.userId, u.id)).orderBy(desc(schema.activities.occurredAt));
  console.log("\nactivities:", acts.length);
  for (const a of acts) console.log("  -", a.type, "| title:", a.title, "| action:", a.actionLabel, "->", a.actionHref);
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
