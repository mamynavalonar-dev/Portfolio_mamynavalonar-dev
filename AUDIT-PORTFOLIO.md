# Audit du portfolio — 13–14 septembre 2026

## Périmètre et état réel

Audit du code local Next.js et de la configuration Supabase du projet correspondant à la configuration locale. Les correctifs sont enregistrés dans le dossier de travail. La migration `20260913160413_public_request_limits.sql` a été appliquée à Supabase et vérifiée. Les projets, commentaires et fichiers existants ont été conservés. Aucun déploiement Vercel ni commit effectué.

Après les premiers échecs de connexion, le site déployé a pu être contrôlé avec Edge à 1440, 390 et 320 px : HTTP 200, contenus présents, aucun débordement global détecté. Les captures et résultats figurent dans `artifacts/audit/`. Une erreur React d'hydratation a été observée sur le déploiement existant. Le code local synchronise désormais la lecture des préférences d'affichage entre serveur et navigateur. Les captures du site déployé précèdent les correctifs. Aucun score Lighthouse, mesure Core Web Vitals ou certification WCAG n'est annoncé.

## Priorités identifiées

| Priorité | Constat vérifié | Impact | État |
| --- | --- | --- | --- |
| P1 | Next.js 16.3.1 : deux avis critiques ; sharp 0.35.3 : un avis élevé | Risques du framework et du traitement des images ; l'avis Windows dépend du système d'hébergement | Next.js et eslint-config-next mis à jour en 16.3.5, verrouillage régénéré ; audit production : aucune vulnérabilité connue |
| P2 | Erreurs Supabase transformées en listes vides | Disparition de contenus et compteurs trompeurs | Services corrigés, résultats indépendants et données existantes conservées côté client |
| P2 | Une collection en erreur efface les trois collections côté serveur | Une panne des certificats masque aussi les projets | Résultats partiels et indicateur d'indisponibilité ajoutés |
| P2 | Erreur de lecture projet assimilée à une absence | Faux « projet introuvable » | Erreur distinguée d'une vraie absence, écran Réessayer ajouté |
| P2 | Quota des commentaires vérifié après import d'image | Trafic et stockage consommés avant refus | Réservation avant import corrigée ; fonction SQL appliquée, routes locales prêtes à publier |
| P2 | Rotation du cookie permettant de multiplier les likes | Compteurs manipulables et croissance de la table | Quota IP supplémentaire ajouté ; fonction SQL appliquée, routes locales prêtes à publier ; ne garantit pas une personne = un like |
| P2 | Taille multipart fondée sur Content-Length déclaré | Lecture de corps excessifs possible | Lecture du flux réellement bornée ajoutée |
| P2 | Cookies rafraîchis abandonnés lors de redirections admin | Sessions instables | Propagation requête/réponse et redirections corrigée |
| P2 | 3D montée sur mobile malgré CSS hidden | Téléchargements et calculs inutiles | Condition de montage React ajoutée ; préchargements globaux retirés |
| P2 | Images HTTP Supabase systématiquement non optimisées | Pas de tailles adaptatives ni conversion | Optimisation limitée à l'origine Supabase publique configurée ; à déployer après mise à jour Next/sharp |
| P2 | Modale projet sans confinement du focus, certificats non accessibles au clavier | Parcours clavier incomplet | Hook focus/Escape/restauration ajouté ; certificats rendus interactifs au clavier |
| P2 | Bouton CV imbriqué dans lien, statistiques cliquables non natives | Sémantique et navigation clavier incorrectes | Corrigés dans About |
| P2 | Cartes technologies à largeur fixe | Risque de débordement petit écran | Largeurs adaptées ; contrôle visuel restant |
| P3 | Titres h1 multiples et texte littéral `n dans la vitrine | Hiérarchie et lisibilité | Corrigés dans Hero/vitrine/contact |
| P3 | Détails de cartes visibles uniquement au survol | Contrôle invisible au clavier | État focus ajouté |
| P3 | Compteurs About non actualisés avec la vitrine | Totaux incohérents | Source de données partagée dans HomeClient |
| P3 | Administration héritant des métadonnées indexables | Indexation indésirable | Layout admin noindex ajouté |
| P3 | Sitemap sans revalidation explicite, Twitter générique sur projets, URL homepage erronée | Métadonnées incomplètes | Revalidation, Twitter projet et URL corrigés |
| P3 | En-têtes de sécurité applicatifs absents | Défense navigateur incomplète | En-têtes ajoutés dans next.config.ts ; validation runtime restante |

## Supabase : résultats confirmés

- Les neuf tables publiques observées ont RLS activé.
- Les messages de contact, traces de soumission, likes et métadonnées CV ne sont pas lisibles librement par les rôles anon/authenticated.
- Les fonctions sensibles de soumission et de likes sont réservées au serveur. Les écritures de portfolio exigent le rôle administrateur.
- Les clés serveur sont séparées du client ; aucun secret trouvé dans les fichiers `.env*` versionnés examinés.
- Le bucket CV est privé et limité à 3 Mo PDF ; commentaires limités à 2 Mo images.
- Les buckets projets/certificats/technologies n'avaient pas de limites MIME/taille. La migration appliquée borne les futurs imports, en conservant les types utilisés, notamment SVG pour les logos.
- Protection contre les mots de passe compromis désactivée ; aucun facteur MFA vérifié observé pour l'administration. Configuration du compte à traiter, non modifiée.
- L'avertissement EXECUTE public de `rls_auto_enable` concerne un event trigger : ce n'est pas une preuve d'exploitation RPC. L'autorisation publique a été révoquée.
- La nouvelle table de quotas a RLS activé ; anon/authenticated ne peuvent pas exécuter sa fonction, service_role le peut. Vérification transactionnelle : trois tentatives acceptées, quatrième rejetée ; données de test annulées par ROLLBACK.
- L'historique distant trace les migrations CV et quotas. Le schéma initial existe sans ses anciennes versions dans l'historique : le réconcilier avant tout `supabase db push` global. Ne pas rejouer aveuglément les anciennes migrations.

## Tests et limites

Avant les modifications : lint et TypeScript réussis ; 10 tests unitaires réussis. L'exécution Vitest a nécessité une sortie du bac à sable à cause de `spawn EPERM`.

Validation du 14 septembre : ESLint et TypeScript réussis. Les 30 tests des 7 fichiers passent sans erreur, notamment les régressions sur les erreurs de chargement, limites des corps HTTP, quotas avant upload et cookies du proxy. Le build Next.js 16.3.5 a réussi (code de sortie 0, 19 pages statiques générées). Les résultats persistants se trouvent dans `artifacts/verification/results.json` et les journaux voisins. La compilation de production utilise `PORTFOLIO_OFFLINE_BUILD=true` pour vérifier le code sans dépendre de requêtes Supabase pendant la génération ; cette variable est limitée au build de validation/CI, pas activée dans Vercel par cette intervention.

## Travail restant, dans l'ordre

1. Publier les changements du projet sur Vercel. La compilation est validée et la migration nécessaire est déjà appliquée : ne pas la rejouer.
2. Après publication, contrôler le CV, la connexion avec le véritable compte administrateur, les envois de formulaire et les quotas depuis le site déployé. Aucun message réel n'a été envoyé pendant l'audit.
3. Activer/configurer la protection contre les mots de passe compromis et le MFA avec le propriétaire du compte ; réconcilier l'historique des anciennes migrations.
4. Effectuer une mesure Lighthouse/Core Web Vitals et un contrôle complet des contrastes sur le déploiement final.

Les correctifs complémentaires sont maintenant enregistrés : lightbox clavier de la page projet, fallback lorsque `image_urls` est vide, choix d'image des commentaires au clavier, TextType statique en mouvement réduit, contraste de la couleur de texte atténuée, gestion des pannes du login, fonctionnement sans localStorage, et fond CSS lorsque les effets WebGL sont désactivés ou indisponibles.

## Contenu et présentation

Le portfolio présente clairement les projets, compétences, certificats, contact et CV. Les paragraphes Hero/À propos sont longs et généraux : ils gagneraient à présenter deux ou trois réalisations précises, le rôle tenu et les résultats constatés. Ne pas inventer de chiffres ou de références. La section contact devrait préciser l'usage des informations collectées ; durée de conservation et obligations applicables restent à déterminer avec le propriétaire. Ces recommandations éditoriales n'ont pas été appliquées automatiquement.

## Sources des alertes de dépendances

- [Next.js — exécution de code sur serveurs Windows](https://github.com/advisories/GHSA-p293-qw3h-jr36), corrigée à partir de 16.3.3. Ce cas ne permet pas de conclure à une exposition du déploiement Vercel.
- [Next.js — traitement AVIF dans Image Optimization](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4).
- [sharp — vulnérabilités libheif](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).

Les alertes confirment des dépendances affectées, pas une compromission constatée du site.
