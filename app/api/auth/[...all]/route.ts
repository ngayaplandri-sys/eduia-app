import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

/** Endpoint Better Auth : /api/auth/* (inscription, connexion, session, déconnexion…). */
export const { GET, POST } = toNextJsHandler(auth);
