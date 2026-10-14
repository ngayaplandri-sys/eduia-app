# EduIA

Assistant d'apprentissage basé sur l'IA pour les élèves : on importe son cours,
EduIA le résume, en tire une épreuve, puis corrige la copie de l'élève.

**En ligne : https://eduai.fyi**

## Fonctionnalités

- **Résumer un cours** : PDF, Word, texte ou photos (y compris scanner avec la caméra),
  résumé structuré ancré strictement sur le document fourni, export PDF.
- **Générer une épreuve** à partir d'un cours, avec barème, export PDF.
- **Corriger une épreuve** : épreuves EduIA (corrigé fidèle au cours d'origine)
  ou épreuves externes (PDF/photos de plusieurs pages), barème respecté ou proposé,
  « Points à retenir », export PDF.
- **Fichiers jusqu'à 15 Mo** : au-delà de 4 Mo, le navigateur les dépose dans le
  stockage privé (Vercel Blob) pour contourner la limite de 4,5 Mo des fonctions Vercel.
- **Documents** : bibliothèque des cours importés, avec téléchargement du fichier
  d'origine (stockage privé, liens signés de 60 s), renommage et suppression.
- **Assistant IA**, **Historique**, **recherche** globale.
- **Mot de passe oublié** : lien de réinitialisation par e-mail (Resend), valable 1 h.
- **Deux offres** : **Gratuit** (0 FCFA, 20 crédits à l'inscription) et **Premium**
  (2 500 FCFA / mois, 500 crédits). Le paiement passe par **Maketou** (Orange Money,
  MTN Mobile Money, carte) et les crédits sont décomptés côté serveur.
- Interface **français / anglais**, thème **clair / sombre / système**, responsive.
- **Espace admin** (`/admin`) : utilisateurs, abonnements, paiements, usage IA,
  signalements, statistiques.

## Stack

- **Next.js 16** (App Router, React 19, Turbopack), **TypeScript** strict
- **Tailwind CSS v4**, design system centralisé dans [`app/globals.css`](app/globals.css) (`@theme`)
- **Neon** (PostgreSQL) + **Drizzle ORM**, migrations dans [`drizzle/`](drizzle)
- **Better Auth** (e-mail/mot de passe, réinitialisation par e-mail, Google en option)
- **Vercel Blob** (stockage privé des fichiers), **Resend** (e-mails transactionnels)
- **OpenAI** (Responses API + Structured Outputs) pour les outils IA et la lecture des photos
- **pdfmake** pour les exports PDF, **Radix UI** + **lucide-react** pour l'interface
- Hébergement **Vercel** : chaque push sur `main` déploie la production

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs (voir le fichier)
npm run db:migrate           # crée/met à jour les tables
npm run dev                  # http://localhost:3000
```

Node.js 20.9 ou plus récent est requis (la production tourne sous Node 24).

> ⚠️ Si `.env.local` pointe sur la base de **production**, tout ce que vous
> faites en local s'y retrouve. `npm run db:reset` et `npm run db:seed` **effacent
> toute la base** : ils sont bloqués sauf confirmation explicite
> (`EDUIA_CONFIRM_DB_WIPE=oui`), à réserver à une base de développement séparée.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | développement, build et serveur de production |
| `npm run lint` / `typecheck` | ESLint, `tsc --noEmit` |
| `npm run db:generate` / `db:migrate` | générer puis appliquer les migrations Drizzle |
| `npm run db:verify` | vérifier l'état de la base |
| `npm run db:studio` | explorer la base (Drizzle Studio) |
| `npm run set-admin -- email@exemple.com [--revoke]` | donner/retirer le rôle admin |
| `npm run db:reset` / `db:seed` | **destructifs**, verrouillés (voir ci-dessus) |

## Structure

```
app/
  (app)/        Espace élève : dashboard, resumer, generer, corriger, documents,
                historique, assistant, premium, parametres, aide
  (auth)/       Connexion, inscription, mot de passe oublié
  admin/        Espace administrateur (rôle admin vérifié côté serveur)
  api/          Routes IA, crédits, recherche, documents, envois de fichiers,
                paiement Maketou, Better Auth
  billing/      Page de retour après paiement
components/     Composants par fonctionnalité + primitives `ui/`
lib/
  ai/           Prompts, schémas et appels OpenAI (serveur uniquement)
  data/         Accès aux données (toutes les requêtes filtrées par utilisateur)
  maketou/      Client et catalogue de paiement
  uploads/      Envoi des fichiers (direct ou via le stockage privé)
  email/        Envoi d'e-mails (Resend) et modèles
  db/           Schéma Drizzle et client Neon
  i18n/         Dictionnaires FR/EN typés
  config/       Constantes (site, crédits, support, niveaux…)
drizzle/        Migrations SQL
docs/           Guides d'exploitation
scripts/        Outils base de données (migration, admin…)
```

## Configuration et sécurité

- Toutes les variables sont listées (sans valeur) dans [`.env.example`](.env.example).
  Les vraies valeurs vont dans `.env.local` (local) et dans Vercel (production),
  **jamais dans git**.
- Les clés OpenAI, Maketou, base de données et Better Auth ne sont lues que côté
  serveur (`server-only`). Aucun secret n'est exposé au navigateur.
- Les fichiers des élèves sont **privés** : un élève ne peut déposer, lire ou
  télécharger que les siens (vérifié côté serveur à chaque requête).
- Tâches planifiées (Vercel Cron, [`vercel.json`](vercel.json), une fois par jour) :
  rapprochement des paiements Maketou et ménage des fichiers temporaires abandonnés.
- Paiement : voir [docs/PAIEMENT-MAKETOU.md](docs/PAIEMENT-MAKETOU.md) (mise en service,
  tâches planifiées, contrôle de configuration, premier paiement réel).
