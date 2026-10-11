import { NextResponse } from "next/server";
import { checkMaketouSetup } from "@/lib/data/maketou";
import { hasCronSecret } from "@/lib/http/guards";

/**
 * Contrôle de l'intégration Maketou (variables, clé API, adresse de retour,
 * page de retour, dernière exécution du rapprochement) — même secret que le
 * rapprochement. Renvoie réussite / échec par contrôle, jamais une valeur.
 */
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }
  const checks = await checkMaketouSetup();
  return NextResponse.json(
    { ok: checks.every((check) => check.ok), checks },
    { headers: { "Cache-Control": "no-store" } },
  );
}
