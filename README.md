# Portfolio — Mamy Navalona Antonio

Portfolio personnel de **RAKOTONIAINA Mamy Navalona Antonio**, développeur Full Stack junior. L’application présente les projets, certificats et technologies, avec un espace d’administration protégé, un formulaire de contact et des commentaires publics modérés.

[Voir le portfolio en ligne](https://portfolio-mamynavalonar-dev.vercel.app)

## Fonctionnalités

- rendu initial côté serveur des contenus publics avec revalidation ;
- vitrine de projets, certificats et technologies ;
- formulaire de contact anti-spam avec boîte de réception administrateur ;
- commentaires avec images contrôlées et compteur de « j’aime » atomique ;
- rôle administrateur réel, politiques RLS et stockage Supabase protégé ;
- animations adaptées à `prefers-reduced-motion` et 3D chargée uniquement sur ordinateur ;
- SEO complet : métadonnées, JSON-LD, Open Graph, sitemap et robots ;
- tests unitaires et intégration continue GitHub Actions.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 3, Supabase/PostgreSQL, Framer Motion, Three.js et Vitest.

## Installation locale

Prérequis : Node.js 20.9+ et pnpm 11.22.

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Ouvrez ensuite [http://localhost:3000](http://localhost:3000).

## Configuration Supabase

1. Créez un projet Supabase et renseignez `.env.local` à partir de `.env.example`.
2. Appliquez dans l’ordre les fichiers de `supabase/migrations/` avec Supabase CLI (`supabase db push`) ou le SQL Editor.
3. Créez votre compte dans Supabase Auth.
4. Accordez-lui explicitement le rôle administrateur :

```sql
insert into public.admin_users (user_id)
select id from auth.users
where email = 'votre-email@example.com'
on conflict (user_id) do nothing;
```

La clé `SUPABASE_SECRET_KEY` reste exclusivement côté serveur. Elle ne doit jamais être placée dans une variable `NEXT_PUBLIC_*` ni être commitée.

## Commandes

```bash
pnpm dev        # serveur de développement
pnpm lint       # ESLint
pnpm typecheck  # vérification TypeScript
pnpm test       # tests Vitest
pnpm check      # lint + types + tests
pnpm build      # build de production
pnpm audit --prod
```

## Structure utile

```text
src/app/api/                 API contact, commentaires et administration
src/app/admin/               interface d’administration
src/components/sections/     sections publiques du portfolio
src/lib/                     accès aux données, validation et sécurité serveur
supabase/migrations/         schéma versionné, RLS et fonctions atomiques
tests/                       tests unitaires
.github/workflows/ci.yml     pipeline de qualité
```

## Sécurité

Les pages administrateur vérifient l’utilisateur auprès de Supabase Auth puis son appartenance à `admin_users`. Les opérations sensibles sont protégées par RLS ou exécutées par des routes serveur. Les soumissions publiques sont validées, limitées par débit et les compteurs concurrents sont mis à jour dans des fonctions PostgreSQL atomiques.

## Licence

Le code et les contenus de ce portfolio restent la propriété de RAKOTONIAINA Mamy Navalona Antonio.
