# 📋 Plan de Refactorisation & Traduction du Portfolio

> **Consignes pour Claude Code :**
>
> - Exécute ce plan **étape par étape**, de manière séquentielle.
> - **Règle absolue :** Complète la **Phase 1 (Traduction)** à 100% et demande validation avant d'entamer la Phase 2.
> - À chaque tâche terminée, mets à jour ce fichier en cochant la case correspondante `[x]`.
> - Après chaque modification majeure, lance une vérification de build (`npm run build` ou `npx tsc --noEmit`) pour t'assurer de l'absence de régression.

---

## 📌 Phase 1 : Traduction complète de l'interface en Français (PRIORITÉ ABSOLUE)

### Instructions de traduction

- [x] **Traduction du contenu :** Traduire toutes les phrases, textes, étiquettes de boutons, titres, descriptions et caractères affichés sur l'ensemble des pages (Accueil/Onboarding, Navbar, Projets, Fiches détaillées, Formulaire de contact, Commentaires, Footer, etc.).
- [x] **Préservation des mots-clés techniques :** Conserver impérativement en anglais les noms de technologies, frameworks et termes techniques (ex. _React, Next.js, Tailwind CSS, TypeScript, Supabase, Framer Motion, Dark Mode, UI/UX, etc._).
- [x] **Encodage & Caractères :** Veiller à ce que les caractères accentués français (`é`, `è`, `ê`, `à`, `ç`, `ô`, etc.) s'affichent parfaitement sans aucun problème d'encodage UTF-8.
- [x] **Polices & Design :** Vérifier que la typographie/police gère correctement les accents sans altérer le rendu visuel ni faire sauter le layout.

---

## 🛡️ Phase 2 : Renforcement de la Sécurité des Types (TypeScript)

- [ ] **Élimination des types `any` :** Identifier et remplacer tous les types `any` les retours de hooks et les props de composants par de vraies interfaces TypeScript.
  ```typescript
  // Interface de référence à créer/adapter (ex: types/portfolio.ts)
  export interface Projet {
    id: string;
    titre: string;
    description: string;
    techStack: string[];
    // ... autres propriétés
  }
  ```

* [ ] **Typage strict des formulaires et des états (`useState`, `useReducer`).**

---

## 🎨 Phase 3 : Optimisation des Animations & Performance de Rendu

- [ ] **Centralisation des configurations d'animations :**
      Créer un fichier utilitaire `lib/animations.ts` pour éviter les déclarations répétées :

```typescript
export const smoothEase = [0.22, 1, 0.36, 1];
export const fadeUp = {
  hidden: { opacity: 0, y: 35, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1, ease: smoothEase }
  }
};

* [ ] **Gestion des préférences de mouvement réduit (`prefers-reduced-motion`) :**
Implémenter la détection du mode mouvement réduit pour respecter l'accessibilité utilisateur.
* [ ] **Hooks d'animation partagés :**
Créer `hooks/useMotionVariants.ts` pour réutiliser les variants complexes.

---

## ♿ Phase 4 : Améliorations de l'Accessibilité (a11y)

* [ ] **Attributs ARIA :** Ajouter des `aria-label` explicites à tous les boutons ne contenant que des icônes.
* [ ] **Gestion du focus :** Mettre en place un piège à focus (focus trap) et le retour du focus dans les modales, tiroirs (drawers) et menus mobiles.
* [ ] **Navigation au clavier :** Ajouter un lien d'évitement (*skip to content*) au tout début du document.
* [ ] **Ratios de contraste :** Vérifier et ajuster les couleurs pour respecter les normes WCAG (AA/AAA).

---

## ⚡ Phase 5 : Optimisation des Performances & du Bundle

* [ ] **Optimisation d'images :** Remplacer les balises `<img>` natives par le composant `<Image>` de Next.js (`next/image`).
* [ ] **Chargement différé (Lazy Loading) :** Activer le lazy loading pour les images de galerie sous la ligne de flottaison.
* [ ] **Découpage de code (Code Splitting) :** Utiliser l'import dynamique (`next/dynamic` ou `React.lazy`) pour les bibliothèques lourdes ou sections secondaires.
* [ ] **Squelettes de chargement (Loading Skeletons) :** Ajouter des composants Skeleton pendant le chargement des données asynchrones (ex. projets, commentaires).

---

## 🔒 Phase 6 : Amélioration des Formulaires & Sécurité

* [ ] **Validation côté client :** Intégrer React Hook Form avec Zod pour valider de façon stricte la saisie des formulaires (email, longueur minimale du message, etc.).
* [ ] **Protection Anti-Spam :**
* [ ] Ajouter un champ piège (*honeypot*).
* [ ] Mettre en place un système de limitation de débit (*rate limiting*) ou CAPTCHA si nécessaire.


* [ ] **Sanitization XSS :** Nettoyer/sanitiser tout contenu utilisateur injecté (notablement dans la section commentaires).


---

## 🧩 Phase 7 : Recommandations Spécifiques par Composant

### 1. `Navbar.tsx`

* [ ] Extraire la logique de défilement dans un hook réutilisable `useSmoothScroll`.
* [ ] Remplacer l'écouteur `scroll` classique par `IntersectionObserver` pour la détection de la section active.

### 2. `PortfolioDetailPage.tsx`

* [ ] Découper la page en sous-composants : `ImageGallery`, `TechStackSection`, `FeaturesSection`.
* [ ] Implémenter un défilement virtuel si la galerie contient de nombreuses images.
* [ ] Optimiser l'affichage responsive portrait/paysage sur mobile.

### 3. Système de Commentaires

* [ ] Ajouter un module de modération (signalement, gestion des contenus inappropriés).
* [ ] Mettre en place la pagination ou le scroll infini des commentaires.
* [ ] Permettre un formatage de texte enrichi de base (Markdown simple).

### 4. Formulaire de Contact

* [ ] Ajouter la validation du format d'email et une longueur minimale pour le message.
* [ ] Implémenter des retours visuels clairs (états de succès, d'erreur, de chargement).
* [ ] Ajouter un champ piège *honeypot*.

---

## 🏗️ Phase 8 : Architecture Globale & Stratégie de Tests

* [ ] **Gestion d'état global :**
* [ ] Évaluer l'intégration de Zustand ou Jotai si le state global grandit.
* [ ] Créer un contexte dédié pour la gestion du thème (Dark/Light Mode).
* [ ] Integrate TanStack Query (React Query) ou SWR pour le caching et le fetch des API.


* [ ] **Couverture de Tests :**
* [ ] Tests unitaires pour les utilitaires (`lib/animations.ts`, helpers) et la validation Zod.
* [ ] Tests d'intégration des formulaires et soumissions (Jest / React Testing Library).
* [ ] Tests End-to-End des parcours utilisateurs critiques (soumission de contact, publication de commentaire).
```