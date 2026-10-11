import { NextResponse } from "next/server";
import { runMaketouReconcile } from "@/lib/data/maketou";
import { hasCronSecret } from "@/lib/http/guards";

/**
 * Rapprochement des paiements Maketou, avec
 * `Authorization: Bearer <CRON_SECRET>` : appelé chaque jour par Vercel Cron
 * (`vercel.json`, offre Hobby) et, en option, plus souvent par un
 * planificateur externe (cron-job.org). Les paiements d'un élève sont aussi
 * confirmés dès son retour dans l'app (`PendingPaymentSync`). Hors du proxy
 * de connexion (`proxy.ts` ignore `/api/`) : authentifié par le secret uniquement.
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
