import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/data/user";
import { getStoredDocumentFile } from "@/lib/data/documents";
import { presignedDownloadUrl } from "@/lib/uploads/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Téléchargement d'un fichier d'origine de la bibliothèque : vérifie que le
 * document appartient à l'élève connecté, puis redirige vers un lien signé du
 * stockage privé valable 60 secondes (le fichier n'est jamais public).
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/documents/[id]/files/[index]">,
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: "NOT_SIGNED_IN" }, { status: 401 });

  const { id, index } = await ctx.params;
  const position = Number(index);
  if (!UUID.test(id) || !Number.isInteger(position) || position < 0 || position > 20) {
    return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
  }

  const file = await getStoredDocumentFile(user.id, id, position);
  if (!file) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });

  try {
    const url = await presignedDownloadUrl(file.pathname);
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[documents] lien de téléchargement impossible :", (error as Error)?.message);
    return NextResponse.json({ code: "STORAGE_UNAVAILABLE" }, { status: 502 });
  }
}
