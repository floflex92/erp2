# Refonte V2 - Bloc 1 Diagnostic de l existant

Date: 2026-04-15
Objectif: figer un diagnostic actionnable avant migration, sans rupture de production.

## Perimetre audite

1. Identite: profils, conducteurs, employee_directory, internal_user_accounts.
2. Ressources: vehicules, remorques, affectations, flotte_documents, releves km.
3. Operation: ordres_transport, etapes_mission, transport_missions, historique statuts.
4. GED/Historique: documents, employee_vault_documents, erp_audit_logs.
5. Finance: factures, devis_transport, compta_ecritures.

## Defauts structures constates

1. Duplication identite humaine sur plusieurs tables.
2. Modele flotte en duplication vehicule/remorque avec pattern XOR fragile.
3. Cles metier pas toujours uniques par company.
4. Enum metiers majoritairement en texte/check difficilement gouvernable.
5. Historisation heterogene selon les modules.

## Decision de base

1. Strategie additive uniquement en phase 1.
2. Preservation stricte des tables legacy pendant la transition.
3. Introduction de pivots: persons, assets, refs, puis mapping et double ecriture.
4. Validation par gates qualite avant toute bascule applicative.

## Livrables relies

1. [docs/refonte-v2-bloc2-matrice-decision.md](docs/refonte-v2-bloc2-matrice-decision.md)
2. [docs/refonte-v2-bloc3-mcd-cible.md](docs/refonte-v2-bloc3-mcd-cible.md)
3. [docs/refonte-v2-bloc4-strategie-migration.md](docs/refonte-v2-bloc4-strategie-migration.md)
4. [docs/refonte-v2-bloc5-sql-ddl.md](docs/refonte-v2-bloc5-sql-ddl.md)
5. [docs/refonte-v2-bloc6-plan-action-priorise.md](docs/refonte-v2-bloc6-plan-action-priorise.md)

## Definition of Done - Bloc 1

1. Diagnostic fige et versionne.
2. Defauts critiques classes par impact migration.
3. Strategie de migration additive validee.
