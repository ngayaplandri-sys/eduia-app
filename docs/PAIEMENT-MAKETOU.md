# Paiement Maketou — mise en service

EduIA encaisse les abonnements Premium / Premium+ et les recharges de crédits via
**Maketou** (Mobile Money et carte). Tout le code est en place ; les étapes
ci-dessous se font dans les tableaux de bord (Maketou, Vercel). Aucune
modification de code n'est nécessaire.

> **État (11/10/2026) :** site en production sur **https://eduai.fyi**.
> Étapes 1 à 5 faites (produits, clé API, variables Vercel, vérification
> automatique des paiements, contrôle `check` tout vert). **Reste : l'étape 6
> (premier vrai paiement)**, à faire avant d'ouvrir le paiement aux élèves.
> L'intégration a été testée de bout en bout contre une imitation locale de
> l'API Maketou (achat, double clic, onglet fermé, échec, paiement tardif,
> quotas, pannes, sécurité).

## Comment ça marche

1. L'élève clique « Payer avec Maketou » (page Premium) → EduIA crée un panier
   chez Maketou et enregistre l'achat (offre + prix) dans `maketou_checkouts`.
2. L'élève paie sur la page Maketou, puis revient sur `/billing/maketou/return`.
3. EduIA demande à Maketou si le panier est payé. **Seule cette réponse
   serveur accorde l'accès**, une seule fois, même en cas de double clic.
4. Si l'élève ferme la page avant le retour, son paiement est vérifié **dès
   qu'il revient sur EduIA** (puis chaque minute pendant sa visite), et une
   tâche planifiée vérifie **chaque jour** tous les paiements en attente.

Règles :

- **Pas de prélèvement automatique.** Un paiement Premium = un mois (+ ses
  crédits). À la fin du mois payé, le compte repasse au palier gratuit (les
  crédits d'abonnement expirent, les crédits de recharge sont conservés).
  Renouveler avant la fin ajoute un mois à la suite, sans rien perdre.
- Passer de Premium à Premium+ est possible à tout moment (nouveau mois, crédits
  ajoutés). Revenir à Premium n'est possible qu'à la fin du Premium+.
- Maketou prélève **5 % de frais** sur chaque paiement (taux de votre compte).
- Pas de remboursement par l'API : un remboursement se fait dans le tableau de
  bord Maketou (puis retirer l'accès à la main si besoin).

## 1. Créer les produits sur Maketou

Sur **app.maketou.com**, dans la boutique qui encaissera les paiements, créer
**6 produits à prix fixe**, en **XAF**, puis **publier** chacun :

| Produit | Prix (XAF) | Variable d'environnement |
|---|---|---|
| EduIA Premium — 1 mois | 2 500 | `MAKETOU_PRODUCT_PREMIUM` |
| EduIA Premium+ — 1 mois | 4 000 | `MAKETOU_PRODUCT_PREMIUM_PLUS` |
| Recharge 100 crédits | 500 | `MAKETOU_PRODUCT_RECHARGE_100` |
| Recharge 250 crédits | 1 000 | `MAKETOU_PRODUCT_RECHARGE_250` |
| Recharge 500 crédits | 1 800 | `MAKETOU_PRODUCT_RECHARGE_500` |
| Recharge 1 000 crédits | 3 000 | `MAKETOU_PRODUCT_RECHARGE_1000` |

Les prix doivent être **exactement** ceux-ci (ce sont ceux affichés dans EduIA).
Si vous changez un prix dans `lib/config/credits.ts`, changez-le aussi chez Maketou.

Pour chaque produit : **Partager** → copier l'**Identifiant public du produit**.

Facultatif — **offre de test** (admins uniquement) : un 7ᵉ produit à petit prix
(ex. 100 XAF) → `MAKETOU_PRODUCT_TEST` et `MAKETOU_TEST_PRICE=100`. Il apparaît
seulement pour les comptes admin sur la page Premium et donne 10 crédits.

## 2. Créer la clé API

**Autres** → **Clés API** → **Ajouter une clé API** → copier la clé (affichée une
seule fois).

## 3. Variables d'environnement (Vercel)

Vercel → projet → **Settings** → **Environment Variables** (environnement
*Production*). Une valeur par variable, **sans guillemets, sans espace, sans
commentaire** :

| Variable | Valeur |
|---|---|
| `MAKETOU_API_KEY` | la clé API (étape 2) |
| `MAKETOU_PRODUCT_PREMIUM` … `MAKETOU_PRODUCT_RECHARGE_1000` | les 6 identifiants (étape 1) |
| `APP_URL` | l'adresse publique exacte, `https://eduai.fyi` (https, sans `/` final, le même domaine que celui où les élèves se connectent — aussi dans `BETTER_AUTH_URL` et `NEXT_PUBLIC_SITE_URL`) |
| `CRON_SECRET` | une longue chaîne aléatoire (ex. générée par un gestionnaire de mots de passe, 32+ caractères) — la valeur seule, **sans** le mot `Bearer` |
| `MAKETOU_PRODUCT_TEST`, `MAKETOU_TEST_PRICE` | facultatif (offre de test) |

Puis **redéployer** (Deployments → ⋯ → Redeploy) pour que les variables soient
prises en compte. La migration de base de données `0008_maketou_payments` est déjà
appliquée à la base Neon actuelle ; sur une nouvelle base : `npm run db:migrate`.

Une offre dont le produit n'est pas renseigné reste affichée avec un bouton
désactivé « Paiement bientôt disponible ».

## 4. Vérification automatique des paiements (déjà en place)

Rien à configurer : un paiement resté en attente est vérifié

- **au retour de l'élève dans l'app** (`PendingPaymentSync`, dans la mise en
  page de l'espace élève) : dès l'ouverture d'une page, puis chaque minute
  pendant 5 minutes ; l'élève voit « Paiement Maketou confirmé » ;
- **chaque jour vers 4 h (UTC)** par Vercel Cron (`vercel.json`, offre Hobby :
  une exécution par jour au maximum), qui traite aussi les paiements des élèves
  qui ne reviennent pas et la fin des abonnements arrivés à échéance.

Facultatif — vérification **toutes les 5 minutes** même sans visite de l'élève,
avec **cron-job.org** (gratuit) :

1. Créer un compte sur https://cron-job.org → **Create cronjob**.
2. URL : `https://eduai.fyi/api/billing/maketou/reconcile` — exactement ce domaine :
   `eduia-app.vercel.app` et `www.eduai.fyi` redirigent vers lui, et une
   redirection ferait perdre l'en-tête `Authorization` (réponse 401).
3. Planification : **toutes les 5 minutes**.
4. Onglet **Advanced** → **Headers** → ajouter :
   `Authorization` = `Bearer VOTRE_CRON_SECRET` (le mot `Bearer`, une espace, puis
   la valeur de `CRON_SECRET`).
5. Méthode **GET**, enregistrer, puis **Test run** : la réponse doit être un JSON
   commençant par `{"ran":true` (ou `"lease_busy"` si une exécution est déjà en cours).

## 5. Contrôle de la configuration

Ouvrir dans un terminal (remplacer le secret) :

```bash
curl -H "Authorization: Bearer VOTRE_CRON_SECRET" https://eduai.fyi/api/billing/maketou/check
```

La réponse liste chaque contrôle avec `"ok": true` ou `false` : variables, clé
API et adresse de retour (testées sans créer de panier), page de retour,
dernière exécution de la tâche planifiée. Aucune valeur secrète n'est affichée.
Tout doit être à `true` (la tâche planifiée est à `true` si elle a tourné
dans les 26 dernières heures).

## 6. Premier vrai paiement (obligatoire avant l'ouverture)

Il n'existe pas de bac à sable Maketou : chaque paiement est réel.

1. Avec un compte admin, sur la page Premium, utiliser l'**offre de test** (ou
   la plus petite recharge, 500 XAF).
2. Sur la page Maketou, vérifier que **le montant affiché est exactement le bon**
   et qu'il n'est pas modifiable.
3. Payer, revenir sur EduIA : la page doit afficher « Paiement confirmé — accès
   activé » et les crédits doivent apparaître.
4. Dans le tableau de bord Maketou, vérifier que le montant encaissé correspond.
5. Refaire un paiement et **fermer l'onglet** juste après avoir payé, puis
   rouvrir EduIA : « Paiement Maketou confirmé » s'affiche et les crédits
   apparaissent (vérification au retour dans l'app).
6. Dans l'espace admin → **Paiements**, les commandes apparaissent avec le
   fournisseur `maketou` et l'identifiant du panier en référence.

## En cas de problème

- **« Paiement bientôt disponible » partout** : clé API ou `APP_URL` absente ou
  mal formée → lancer le contrôle (étape 5), il nomme la variable en cause.
- **Paiement fait mais accès non activé** : l'élève doit ouvrir EduIA avec le
  compte qui a payé (vérification au retour) ; sinon la tâche quotidienne
  l'accorde dans les 24 h, et même plusieurs jours plus tard pour un paiement
  tardif. Vercel → projet → **Settings → Cron Jobs** montre ses exécutions.
- **Une ligne « paiement à vérifier »** dans les journaux Vercel (`[maketou]`) :
  cas rare (deux paliers payés en même temps) — vérifier le compte et rembourser
  depuis Maketou si nécessaire. La remarque est aussi enregistrée dans
  `maketou_checkouts.note`.
- Les journaux serveur préfixés `[maketou]` ne contiennent jamais la clé API ni
  les données personnelles des acheteurs.
