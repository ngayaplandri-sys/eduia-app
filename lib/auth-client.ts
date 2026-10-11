"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

/**
 * Client Better Auth pour le navigateur. `inferAdditionalFields` type `role` et
 * `plan` sur la session côté client, à partir de la config serveur.
 */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
