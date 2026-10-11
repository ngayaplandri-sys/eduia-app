import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "./db/client";
import { grantSignupCredits } from "./db/credit-grants";
import { isEmailConfigured, sendEmail } from "./email/send";
import { resetPasswordEmail } from "./email/reset-password-email";

/**
 * Instance Better Auth (auto-hébergée) — e-mail / mot de passe.
 *
 * Les tables `user` / `session` / `account` / `verification` vivent dans notre
 * base Neon (adaptateur Drizzle). `role` (`student` | `admin`, contrôle d'accès)
 * et `plan` (`free` | `premium`) sont des champs additionnels du profil, non
 * modifiables à l'inscription (`input: false`). Le rôle admin s'attribue
 * uniquement hors ligne : `npm run set-admin -- <email>`.
 *
 * Schéma généré par `npx @better-auth/cli generate` → `lib/db/auth-schema.ts`.
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    // « Mot de passe oublié » : actif seulement si l'envoi d'e-mails est
    // configuré (`lib/email/send.ts`) — sinon la page de connexion l'indique.
    // Lien valable 1 h, à usage unique ; toutes les sessions du compte sont
    // fermées après le changement. Un échec d'envoi est journalisé sans être
    // renvoyé au navigateur (la réponse ne révèle jamais si le compte existe).
    ...(isEmailConfigured()
      ? {
          sendResetPassword: async ({ user, url }: { user: { id: string; email: string; name: string }; url: string }) => {
            try {
              await sendEmail(
                resetPasswordEmail({
                  to: user.email,
                  name: user.name,
                  url,
                  locale: (user as { locale?: string | null }).locale,
                }),
              );
            } catch (error) {
              console.error("[auth] e-mail de réinitialisation non envoyé :", {
                userId: user.id,
                message: (error as Error)?.message,
              });
            }
          },
        }
      : {}),
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
  },
  // Connexion Google : activée seulement si les identifiants OAuth sont fournis
  // (voir .env.example) — évite de casser le démarrage tant qu'ils ne sont pas
  // configurés. Un compte Google inconnu est créé automatiquement à la première
  // connexion (comportement standard Better Auth), puis passe par le même
  // contrôle d'onboarding que les comptes e-mail/mot de passe.
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {}),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "student",
        input: false,
      },
      plan: {
        type: "string",
        required: false,
        defaultValue: "free",
        input: false,
      },
      // Préférences d'affichage : non modifiables à l'inscription, mais lisibles
      // dans `session.user`. L'écriture passe par `lib/actions/preferences.ts`
      // (mise à jour directe de la colonne, relue à la session suivante).
      locale: {
        type: "string",
        required: false,
        defaultValue: "fr",
        input: false,
      },
      theme: {
        type: "string",
        required: false,
        defaultValue: "system",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // prolonge si la session a plus d'un jour
  },
  // Better Auth applique déjà une règle intégrée stricte sur /sign-in* et
  // /sign-up* (3 requêtes/10s par IP), mais uniquement en production, et elle
  // n'empêche pas un test lent et soutenu (quelques tentatives toutes les 10s,
  // indéfiniment). Ces règles dédiées ajoutent une fenêtre plus longue et plus
  // stricte, spécifique à la connexion/l'inscription (audit sécurité, contrôle
  // « rate limiting sur l'authentification »).
  rateLimit: {
    // Comportement par défaut de Better Auth, rendu explicite ici : désactivé
    // en dev pour ne jamais bloquer un développeur qui teste manuellement,
    // actif en production.
    enabled: process.env.NODE_ENV === "production",
    customRules: {
      "/sign-in/email": { window: 900, max: 5 }, // 5 tentatives / 15 min / IP
      "/sign-up/email": { window: 3600, max: 10 }, // 10 inscriptions / heure / IP
      "/request-password-reset": { window: 3600, max: 5 }, // 5 e-mails / heure / IP
    },
    // Stockage "memory" (par défaut) : suffisant pour un serveur Node unique
    // (Railway, Render, VPS…). Sur un déploiement serverless multi-instances
    // (Vercel), chaque instance aurait son propre compteur — passer à
    // storage: "database" (après avoir ajouté la table `rateLimit` au schéma,
    // voir @better-auth/core/db/schema/rate-limit) ou à un stockage secondaire
    // partagé (Redis/Upstash) dans ce cas.
  },
  databaseHooks: {
    // Octroie les 20 crédits gratuits une seule fois, à la création réelle du
    // compte — couvre e-mail/mot de passe ET Google OAuth (même chemin de
    // création `user`). Ne bloque jamais l'inscription si l'octroi échoue.
    user: {
      create: {
        after: async (createdUser) => {
          try {
            await grantSignupCredits(createdUser.id);
          } catch (error) {
            console.error(
              "[auth] échec de l'octroi des crédits gratuits à l'inscription :",
              error,
            );
          }
        },
      },
    },
  },
  plugins: [nextCookies()], // doit rester le dernier plugin
});

export type AuthSession = typeof auth.$Infer.Session;
