import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/data/user";
import { MAX_UPLOAD_BYTES } from "@/lib/ai/extract";
import { isBlobConfigured } from "@/lib/uploads/server";
import { UPLOAD_CONTENT_TYPES, isTempUploadPathOf } from "@/lib/uploads/shared";

/**
 * Autorise le navigateur à déposer UN fichier dans le stockage privé (envoi
 * des fichiers de plus de 4 Mo, voir `lib/uploads/shared.ts`) : élève
 * connecté, chemin `tmp/<son id>/…` uniquement, 15 Mo et types de cours au
 * maximum, jeton valable 10 minutes. Le contenu réel est revérifié par la
 * route IA qui lira le fichier.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "NOT_SIGNED_IN" }, { status: 401 });
  if (!isBlobConfigured()) {
    return NextResponse.json({ error: "STORAGE_NOT_CONFIGURED" }, { status: 503 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  // Aucun rappel de fin d'envoi n'est configuré : seule la demande de jeton est attendue.
  if (body?.type !== "blob.generate-client-token") {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isTempUploadPathOf(pathname, user.id)) {
          throw new Error("chemin refusé");
        }
        return {
          allowedContentTypes: UPLOAD_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "INVALID_REQUEST" },
      { status: 400 },
    );
  }
}
