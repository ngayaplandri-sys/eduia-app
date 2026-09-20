import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data/user";
import { applyRecharge } from "@/lib/data/credits";
import { getRechargePackage } from "@/lib/config/credits";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Achat d'un pack de crédits de recharge — paiement **simulé** (validation
 * immédiate, aucun encaissement réel, voir `applyRecharge` dans
 * `lib/data/credits.ts`). Toujours ajouté au compartiment `rechargeBalance`,
 * jamais au quota mensuel d'abonnement.
 */
export async function POST(request: Request) {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);

  if (!user) {
    return NextResponse.json({ error: dict.ai.notSignedIn }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: dict.ai.invalidRequest }, { status: 400 });
  }

  const packageId =
    payload && typeof payload === "object" && "packageId" in payload
      ? String((payload as { packageId: unknown }).packageId)
      : "";

  if (!getRechargePackage(packageId)) {
    return NextResponse.json({ error: dict.ai.invalidRequest }, { status: 400 });
  }

  const wallet = await applyRecharge(user.id, packageId);
  return NextResponse.json({ wallet });
}
