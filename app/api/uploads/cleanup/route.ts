import { NextResponse } from "next/server";
import { hasCronSecret } from "@/lib/http/guards";
import { purgeStaleTempUploads } from "@/lib/uploads/server";

/**
 * Ménage quotidien (Vercel Cron, `vercel.json`) : efface les fichiers déposés
 * dans le stockage pour une génération qui n'a jamais eu lieu (onglet fermé,
 * coupure réseau…). Authentifié par `CRON_SECRET`, comme le rapprochement Maketou.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }
  const report = await purgeStaleTempUploads();
  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}
