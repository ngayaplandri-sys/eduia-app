import "server-only";

/**
 * Point d'entrée BDD pour le code applicatif (Server Components, Server Actions,
 * `lib/data/*`). Protégé par `server-only`. L'implémentation vit dans
 * `./client` (sans `server-only`, pour Better Auth et sa CLI).
 */
export { db, schema } from "./client";
