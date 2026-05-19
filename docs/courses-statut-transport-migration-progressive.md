# Plan de migration progressive vers statut_transport

## Contexte
Le module Courses utilise desormais `statut_transport` comme lifecycle operationnel cible, tout en conservant `statut` pour la compatibilite des ecrans existants.

## Objectif
Migrer les ecrans restants sans rupture, par vagues courtes, avec rollback simple.

## Regles de migration
- Ne jamais supprimer `statut` avant fin de migration complete.
- Lire en priorite `statut_transport` sur les ecrans migrés.
- Conserver un mapping clair pour les ecrans non migrés.
- Ajouter des tests de non regression a chaque vague.

## Mapping recommande
- brouillon -> en_attente_validation
- confirme -> valide
- planifie -> planifie
- en_cours -> en_transit
- livre/facture -> termine
- annule -> annule
- fallback -> en_attente_planification

## Vague 1 (deja couverte)
- Transports
- Planning (filtre affretement principal)
- BourseAffretementPanel
- Hooks/services transportCourses

## Vague 2 (prochaine)
Cibles prioritaires:
1. Ecrans de suivi operationnel lisant encore `statut` en direct.
2. Widgets KPI dashboard relies aux statuts courses.
3. Vues de suivi affretement complementaires.

Actions techniques:
- Remplacer les lectures directes de `statut` par:
  - `statut_transport` si present
  - sinon mapping legacy -> transport
- Uniformiser badges/couleurs sur la nomenclature transport.
- Ajouter tests unitaires sur fonctions de mapping.

## Vague 3
- APIs/functions internes et exports qui consomment encore `statut`.
- Alignement des filtres analytics/rapports sur `statut_transport`.

## Vague 4 (finalisation)
- Verifier absence de dependance active a `statut` hors compat.
- Geler le mapping legacy dans une couche unique.
- Preparer eventuelle deprecation de `statut` (sans suppression immediate).

## Checklist par vague
1. Audit usages `statut` via recherche globale.
2. Migration code + tests.
3. Build + tests + lint cible.
4. Recette fonctionnelle serv dev.
5. Validation metier exploitation.

## Critere de fin
- Tous les ecrans operationnels lisent `statut_transport`.
- Le champ `statut` n est plus utilise que pour compatibilite historique.
- Aucun ecart d affichage entre statuts et historique.
