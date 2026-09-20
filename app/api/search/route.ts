import { NextResponse } from "next/server";
import { searchLibrary } from "@/lib/data/search";

/**
 * Recherche globale (barre de recherche du header) : documents, résumés,
 * épreuves et corrections de l'utilisateur connecté. `searchLibrary` renvoie
 * déjà `[]` sans session ou requête trop courte — pas de garde 401 ici, la
 * barre de recherche n'est de toute façon rendue que dans la coquille `(app)`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const results = await searchLibrary(q);
  return NextResponse.json({ results });
}
