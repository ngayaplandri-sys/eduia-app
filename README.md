# EduIA

Assistant d'apprentissage basé sur l'IA. Ce dépôt contient la **V1** : le
**tableau de bord** reproduit fidèlement à partir de la maquette, responsive et
accessible, avec la coquille de navigation complète. Les autres routes existent
en placeholder (« bientôt disponible »).

## Stack

- **Next.js 16** (App Router, React 19, Turbopack)
- **TypeScript** strict
- **Tailwind CSS v4** — design system centralisé dans [`app/globals.css`](app/globals.css) (`@theme`)
- **Radix UI** (menus, dialogue, tiroir mobile) · **lucide-react** (icônes)
- **class-variance-authority** + **tailwind-merge** pour les variantes de composants
- Données : mock typé dans [`lib/data/`](lib/data) (bascule 1-pour-1 vers une vraie API plus tard)

## Démarrer

```bash
npm install
npm run dev          # http://localhost:3000  → redirige vers /dashboard
```

Autres scripts :

```bash
npm run build        # build de production
npm run start        # serveur de production
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

Node.js ≥ 20.9 requis.

## Structure

```
app/
  layout.tsx                 Root layout (police Plus Jakarta Sans, métadonnées)
  page.tsx                   redirige vers /dashboard
  globals.css                Design system (tokens @theme)
  (app)/
    layout.tsx               Coquille : sidebar + header + main
    dashboard/               Tableau de bord (page complète + loading + error)
    resumer|generer|corriger|documents|historique|parametres|aide|premium/
                             Pages secondaires (placeholder ComingSoon)
  not-found.tsx
components/
  ui/          Primitives (button, badge, card, avatar, dialog, sheet, dropdown-menu, skeleton)
  layout/      Sidebar, header, navigation, tiroir mobile, carte Premium
  dashboard/   Hero, cartes d'action, tableau/liste d'activité
  search/ notifications/ user/ feedback/ common/
lib/
  navigation.ts   Source de vérité de la navigation + titres de page
  config/site.ts  Constantes du site
  utils/          cn(), formatage des dates
  data/           Accès aux données (mock en V1)
types/            Modèles de domaine (User, ActivityItem…)
public/           Illustration hero (SVG inline dans le composant), avatar
```

## Design system

Toutes les valeurs visuelles (couleurs, typographie, rayons, ombres, dimensions
de la coquille) sont définies **une seule fois** dans `app/globals.css` sous
`@theme` et consommées via les utilitaires Tailwind (`bg-primary-600`,
`text-ink-500`, `rounded-2xl`, `shadow-card`, `w-sidebar`…). Aucune couleur en dur
dans les composants.

Voir le plan d'implémentation complet pour les phases suivantes (Supabase,
fonctionnalités IA, Premium, tests).
