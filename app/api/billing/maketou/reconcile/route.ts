import { NextResponse } from "next/server";
import { runMaketouReconcile } from "@/lib/data/maketou";
import { hasCronSecret } from "@/lib/http/guards";

/**
 * Rapprochement des paiements Maketou — à appeler toutes les 5 minutes par un
 * planificateur (cron-job.org, Vercel Cron…) avec
 * `Authorization: Bearer <CRON_SECRET>`. Hors du proxy de connexion
 * (`proxy.ts` ignore `/api/`) : authentifié par le secret uniquement.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }
  const report = await runMaketouReconcile();
  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}
