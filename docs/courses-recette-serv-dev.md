# Recette module Courses - environnement serv dev

## Objectif
Verifier que le module Courses (Transports) est exploitable en conditions reelles apres la stabilisation v1.1.

## Pre-requis
- Environnement local: serv dev.
- Migrations SQL appliquees jusqu a `20260330001200_courses_transport_stabilisation.sql`.
- Utilisateur test avec role exploitant (et un compte admin pour les controles RLS).

## Jeu de donnees minimal
- 1 client donneur d ordre actif.
- 1 course non affretee.
- 1 course affretee avec affreteur_id renseigne.
- 2 sites_logistiques (chargement + livraison).

## Parcours 1 - Creation course
1. Ouvrir page Transports.
2. Creer une course avec:
   - donneur d ordre
   - source_course
   - site chargement
   - site livraison
3. Verifier apres creation:
   - reference_transport auto generee au format `[CODE]-[AAAAMM]-[SEQ]`
   - statut_transport initialise
   - course visible dans planning principal si non affretee

## Parcours 2 - Statut transport + historique
1. Ouvrir le detail de la course.
2. Changer successivement le statut_transport (ex: valide -> planifie -> en_transit).
3. Verifier:
   - statut courant bien mis a jour dans la liste
   - historique avec transitions visibles et ordonnees par date
   - aucune regression du champ legacy statut

## Parcours 3 - Affretement prioritaire
1. Sur une course, affecter un affreteur.
2. Verifier:
   - `est_affretee=true` et `affreteur_id` renseigne
   - la course sort du planning principal
   - la course apparait dans le suivi affretement
3. Retirer l affretement.
4. Verifier retour dans planning principal.

## Parcours 4 - Sites logistiques
1. Creer un nouveau site_logistique depuis le formulaire.
2. Reutiliser ce site sur une seconde course.
3. Verifier unicite fonctionnelle et reutilisation effective dans les listes.

## Parcours 5 - Donneur d ordre
1. Creer une course avec client_id et donneur_ordre_id differents.
2. Verifier affichage du bon donneur d ordre dans la liste et le detail.

## Parcours 6 - Planning
1. Ouvrir Planning.
2. Verifier que les courses affretees n apparaissent pas dans le flux principal.
3. Verifier que les courses non affretees restent planifiables normalement.

## Controle RLS (smoke test)
1. Compte non autorise (role hors perimetre): verifier refus ecriture sur sites_logistiques.
2. Compte autorise: verifier lecture/ecriture OK sur sites_logistiques et historique statut.

## Validation technique locale
- Lint cible:
  - `npx eslint src/pages/Transports.tsx src/pages/Planning.tsx src/components/transports/BourseAffretementPanel.tsx src/pages/EspaceAffreteur.tsx src/pages/MapLive.tsx src/lib/transportCourses.ts src/hooks/useLogisticSites.ts src/hooks/useTransportStatusHistory.ts src/pages/Tasks.test.tsx`
- Build:
  - `npm run build`
- Tests:
  - `npm run test`

## Criteres de sortie
- Aucun blocage fonctionnel sur les 6 parcours.
- Build vert.
- Tests verts.
- Pas de warning lint sur les fichiers modifies du perimetre Courses.
