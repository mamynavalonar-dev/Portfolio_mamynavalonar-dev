# Portfolio — Mamy Navalona Antonio

Portfolio personnel de **RAKOTONIAINA Mamy Navalona Antonio**, développeur Full Stack junior. L’application présente les projets, certificats et technologies, avec un espace d’administration protégé, un formulaire de contact et des commentaires publics pouvant être modérés après publication.

[Voir le portfolio en ligne](https://portfolio-mamynavalonar-dev.vercel.app)

## Fonctionnalités

- rendu initial côté serveur des contenus publics avec revalidation ;
- vitrine de projets, certificats et technologies ;
- services avec fenêtres de détails et gestion des brouillons ;
- parcours à onglets : formations, expériences et projets ;
- bandeau infini de logos administrable, avec pause au survol et au focus clavier, et mode sans mouvement ;
- réseaux sociaux administrables : présentation, liens, icônes, ordre et publication ;
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
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Ouvrez ensuite [http://localhost:3000](http://localhost:3000).

## Configuration Supabase

1. Créez un projet Supabase et renseignez `.env.local` à partir de `.env.example`.
2. Pour une **installation neuve uniquement**, appliquez les migrations de `supabase/migrations/` dans l'ordre après vérification du projet ciblé.
   Pour un projet existant, comparez d'abord `supabase migration list` avec les fichiers du dépôt et le schéma réellement présent. Ne rejouez pas globalement les migrations et n'exécutez pas `db reset` sur ce projet.
   Les extensions Services / Parcours, Réseaux sociaux et TikTok se trouvent respectivement dans :
   - `supabase/migrations/20261013120000_portfolio_services_and_journey.sql` ;
   - `supabase/migrations/20261013163000_portfolio_social_links.sql` ;
   - `supabase/migrations/20261015120000_extend_social_platforms.sql`.
   Appliquez uniquement les migrations qui n'ont pas déjà été exécutées sur le projet concerné.
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
pnpm start      # serveur de production après le build
pnpm audit --prod
```

## Structure utile

```text
src/app/api/                 API contact, commentaires et administration
src/app/admin/               interface d’administration
src/components/sections/     sections publiques du portfolio
src/lib/                     accès aux données, validation et sécurité serveur
supabase/migrations/         schéma versionné, RLS et fonctions atomiques
scripts/                     outils de vérification et de diagnostic
tests/                       tests unitaires
.github/workflows/ci.yml     pipeline de qualité
```

## Sécurité

Les pages administrateur vérifient l’utilisateur auprès de Supabase Auth puis son appartenance à `admin_users`. Les opérations sensibles sont protégées par RLS ou exécutées par des routes serveur. Les soumissions publiques sont validées, limitées par débit et les compteurs concurrents sont mis à jour dans des fonctions PostgreSQL atomiques.

## Performance et vérifications

Les lectures publiques serveur sont mises en cache cinq minutes. Une lecture en échec ne doit pas remplacer une page saine. Les écritures confirmées demandent une actualisation publique sans prolonger inutilement l'attente du formulaire. Une panne de cette actualisation ne relance pas l'écriture métier.

L'introduction démarre ses animations après l'hydratation. La scène 3D conserve la chute, les joints physiques et les interactions du badge. Les polices sont hébergées dans `public/fonts/`, avec leurs licences. Les assets versionnés de `public/assets/` sont nécessaires au préchargement et doivent rester dans le dépôt.

Dans l'administration, les dernières listes chargées sont conservées temporairement en mémoire pendant la session et actualisées en arrière-plan. Ce cache est effacé à la déconnexion ou au changement de compte. Les brouillons des formulaires ne deviennent pas des sauvegardes confirmées.

Les commentaires publics restent lus sans cache partagé pour que la modération soit visible immédiatement. Le cookie de vote est créé au premier vote. Le téléchargement du CV reste `no-store` : son URL signée expire après 60 secondes.

La CSP est en mode `Report-Only`. Elle doit être contrôlée dans un navigateur sans extension avant une éventuelle activation.

### Vérification du navigateur

Le script `scripts/audit-browser.mjs` couvre les modes normal et mouvement réduit, plusieurs largeurs, le premier affichage, les interactions du badge et la navigation. Il requiert Playwright et un navigateur installé. Il n'est pas inclus dans `pnpm check` ; une erreur WebGL reste un échec de validation 3D.

```bash
AUDIT_BASE_URL=http://localhost:3000/ node scripts/audit-browser.mjs
```

Les captures et résultats sont écrits dans `artifacts/`, dossier de résultats locaux ignoré par Git. Le script ne publie ni commentaire ni message valide et ne modifie aucune donnée de production.

### Outils de maintenance

- `scripts/verify-final.mjs` exécute les vérifications et conserve leurs journaux dans `artifacts/verification/`.
- `scripts/diagnostic-supabase.mjs` vérifie les lectures publiques sans afficher les clés ni écrire en base.
- Les anciens installateurs de correctifs, exports de sources et rapports de travail sont conservés dans des archives locales hors du dépôt.

## Exploitation et données

Les formulaires distinguent le message privé du commentaire public. La durée de conservation doit être choisie par le propriétaire avant de compléter l’information de confidentialité ; aucune durée fictive n’est publiée.
La publication des commentaires reste immédiate avec modération après publication. Passer à une approbation préalable nécessite une décision et une migration dédiée.

La suppression d’une fiche conserve ses anciens objets Storage et les anciennes versions de CV. Avant toute suppression de fichier, comparer les références en base avec les objets des buckets, inclure les galeries `image_urls` et les images de commentaires, choisir une durée de conservation et disposer d’une sauvegarde. Le correctif ne supprime pas les fichiers existants. Les imports en échec explicite ne nettoient que les objets nouvellement créés par la tentative.

L’état privé de Vercel et Supabase (déploiement, migrations appliquées, MFA, sauvegardes et quotas) doit être vérifié dans leurs tableaux de bord. Les tests locaux ne certifient pas ces réglages.

## Licence

Le code et les contenus de ce portfolio restent la propriété de RAKOTONIAINA Mamy Navalona Antonio.
