# Refonte V2 - Bloc 6 Plan d action priorise

Date: 2026-04-15
Objectif: plan executable avec quick wins, chantiers structurants, dette et dependances.

## Vague 1 - Quick wins (2 a 4 semaines)

### Lot QW-1: unicites metier tenant

- Scope:
  - ordres_transport reference
  - factures numero
  - devis_transport numero
  - profils/persons matricule
- Valeur:
  - elimine collisions visibles utilisateur
- Risque:
  - moyen (collisions existantes)
- Dependance:
  - aucune

### Lot QW-2: referentiels metier minimum

- Scope:
  - statuts transport
  - types absence
  - priorites
  - types document
- Valeur:
  - coherence UI/API, traduction future
- Risque:
  - faible a moyen
- Dependance:
  - aucune

### Lot QW-3: fondations schema pivots

- Scope:
  - persons, assets, refs
- Valeur:
  - prepare migration structurante
- Risque:
  - faible (additif)
- Dependance:
  - QW-1 recommande

## Vague 2 - Chantiers structurants (6 a 12 semaines)

### Chantier S-1: fusion identite

- Scope:
  - profils/conducteurs/employee_directory -> persons
- Valeur:
  - reduction duplication, robustesse RH/transport
- Risque:
  - eleve
- Dependance:
  - QW-3
- Gate qualite:
  - backfill 100%, derive double-write nulle

### Chantier S-2: factorisation assets

- Scope:
  - vehicules/remorques/affreteur_vehicles -> assets
- Valeur:
  - fin XOR fragile, evolutivite flotte
- Risque:
  - eleve
- Dependance:
  - QW-3
- Gate qualite:
  - affectations fonctionnelles en pivot

### Chantier S-3: GED unifiee transverse

- Scope:
  - documents legacy + coffre salarie vers moteur unique
- Valeur:
  - conformite, tracabilite, maintenance simplifiee
- Risque:
  - eleve
- Dependance:
  - S-1 (identite) recommande
- Gate qualite:
  - acces post-depart verifies

### Chantier S-4: historisation uniforme

- Scope:
  - entity_history + ponts historiques specialises
- Valeur:
  - lecture change log unifiee
- Risque:
  - moyen
- Dependance:
  - S-1 et S-2

## Vague 3 - Stabilisation et dette (4 a 8 semaines)

### Lot DT-1: deprecation legacy

- Scope:
  - stop writes legacy, vues compatibilite, suppression progressive
- Valeur:
  - reduction cout maintenance
- Risque:
  - moyen
- Dependance:
  - S-1/S-2/S-3 stabilises

### Lot DT-2: simplification RLS

- Scope:
  - policies harmonisees autour pivots
- Valeur:
  - lisibilite securite + perf
- Risque:
  - moyen
- Dependance:
  - pivots en production

### Lot DT-3: hardening observabilite data

- Scope:
  - dashboards derive sync, erreurs mapping, SLA migration
- Valeur:
  - exploitation fiabilisee
- Risque:
  - faible
- Dependance:
  - toutes vagues

## Owners recommandes

1. Data architecture lead: gouvernance schema global.
2. Backend SQL lead: migrations, indexes, contraintes.
3. App lead: adaptation read/write paths et flags.
4. QA lead: non-regression + RLS tests.
5. Metier transport/RH/compta: arbitrages manuels de mapping.

## KPIs de pilotage

1. Taux de lignes legacy reliees aux pivots (%).
2. Taux de derive double-write (% des ecarts).
3. Nombre d incidents RLS post lot.
4. Temps moyen de correction des collisions metier.
5. Taux de modules en read sur pivots.

## Jalons de validation

1. J1: fondations SQL en test.
2. J2: canary tenant sur identite + assets.
3. J3: canary GED + historique.
4. J4: generalisation progressive.
5. J5: freeze legacy writes.
6. J6: cleanup final.

## Definition of Done - Bloc 6

1. Roadmap validee avec owners, durees, dependances.
2. Gating qualite explicite par chantier.
3. KPIs de suivi actifs.
4. Conditions de passage en execution approuvees.
