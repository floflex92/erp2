# Refonte V2 - Etat de mise en place blocs 1 a 6

Date: 2026-04-15

## Bloc 1 - Diagnostic

- Doc diagnostic: [docs/refonte-v2-bloc1-diagnostic.md](docs/refonte-v2-bloc1-diagnostic.md)
- Migration baseline: [supabase/migrations/20260415111000_refonte_v2_block1_diagnostic_baseline.sql](supabase/migrations/20260415111000_refonte_v2_block1_diagnostic_baseline.sql)
- Effet: capture de metriques de reference + vue de detection de collisions de cles metier.

## Bloc 2 - Analyse domaine/table et decisions

- Matrice de decision: [docs/refonte-v2-bloc2-matrice-decision.md](docs/refonte-v2-bloc2-matrice-decision.md)
- Migration de mapping: [supabase/migrations/20260415112000_refonte_v2_block2_mapping_tables.sql](supabase/migrations/20260415112000_refonte_v2_block2_mapping_tables.sql)
- Migration d initialisation mapping + KPI: [supabase/migrations/20260415117000_refonte_v2_block2_seed_mappings_and_kpis.sql](supabase/migrations/20260415117000_refonte_v2_block2_seed_mappings_and_kpis.sql)
- Effet: tables de mapping legacy vers pivots pour piloter keep/merge/split sans casser l existant.

## Bloc 3 - MCD cible V2

- MCD cible: [docs/refonte-v2-bloc3-mcd-cible.md](docs/refonte-v2-bloc3-mcd-cible.md)
- Migration persons: [supabase/migrations/20260415113000_refonte_v2_block3_persons_foundation.sql](supabase/migrations/20260415113000_refonte_v2_block3_persons_foundation.sql)
- Migration assets: [supabase/migrations/20260415114000_refonte_v2_block3_assets_foundation.sql](supabase/migrations/20260415114000_refonte_v2_block3_assets_foundation.sql)
- Effet: creation des pivots identite et ressources + colonnes de transition legacy.

## Bloc 4 - Strategie de migration

- Strategie: [docs/refonte-v2-bloc4-strategie-migration.md](docs/refonte-v2-bloc4-strategie-migration.md)
- Runtime migration: [supabase/migrations/20260415116000_refonte_v2_block4_and_6_runtime.sql](supabase/migrations/20260415116000_refonte_v2_block4_and_6_runtime.sql)
- Effet: journal de derive de sync et fondations d execution progressive.

## Bloc 5 - SQL DDL

- Doc DDL: [docs/refonte-v2-bloc5-sql-ddl.md](docs/refonte-v2-bloc5-sql-ddl.md)
- Migration refs + unicites: [supabase/migrations/20260415115000_refonte_v2_block5_refs_uniqueness.sql](supabase/migrations/20260415115000_refonte_v2_block5_refs_uniqueness.sql)
- Effet: referentiels metier ref_ plus unicites tenant-level sur cles visibles.

## Bloc 6 - Plan action priorise

- Plan priorise: [docs/refonte-v2-bloc6-plan-action-priorise.md](docs/refonte-v2-bloc6-plan-action-priorise.md)
- Runtime KPI: [supabase/migrations/20260415116000_refonte_v2_block4_and_6_runtime.sql](supabase/migrations/20260415116000_refonte_v2_block4_and_6_runtime.sql)
- Effet: table KPI journaliere de pilotage migration et fonction push_kpi.

## Ordre d application migrations refonte V2

1. [supabase/migrations/20260415111000_refonte_v2_block1_diagnostic_baseline.sql](supabase/migrations/20260415111000_refonte_v2_block1_diagnostic_baseline.sql)
2. [supabase/migrations/20260415112000_refonte_v2_block2_mapping_tables.sql](supabase/migrations/20260415112000_refonte_v2_block2_mapping_tables.sql)
3. [supabase/migrations/20260415113000_refonte_v2_block3_persons_foundation.sql](supabase/migrations/20260415113000_refonte_v2_block3_persons_foundation.sql)
4. [supabase/migrations/20260415114000_refonte_v2_block3_assets_foundation.sql](supabase/migrations/20260415114000_refonte_v2_block3_assets_foundation.sql)
5. [supabase/migrations/20260415115000_refonte_v2_block5_refs_uniqueness.sql](supabase/migrations/20260415115000_refonte_v2_block5_refs_uniqueness.sql)
6. [supabase/migrations/20260415116000_refonte_v2_block4_and_6_runtime.sql](supabase/migrations/20260415116000_refonte_v2_block4_and_6_runtime.sql)
7. [supabase/migrations/20260415117000_refonte_v2_block2_seed_mappings_and_kpis.sql](supabase/migrations/20260415117000_refonte_v2_block2_seed_mappings_and_kpis.sql)
8. [supabase/migrations/20260415118000_refonte_v2_auto_reconciliation_and_conflict_snapshot.sql](supabase/migrations/20260415118000_refonte_v2_auto_reconciliation_and_conflict_snapshot.sql)

## Suite execution (reconciliation)

1. Migration appliquee: [supabase/migrations/20260415118000_refonte_v2_auto_reconciliation_and_conflict_snapshot.sql](supabase/migrations/20260415118000_refonte_v2_auto_reconciliation_and_conflict_snapshot.sql)
2. Rapport de conflits par tenant: [docs/refonte-v2-reconciliation-report-2026-04-15.md](docs/refonte-v2-reconciliation-report-2026-04-15.md)
3. Migration appliquee (v2 matching normalise): [supabase/migrations/20260415119000_refonte_v2_reconciliation_v2_normalized_match.sql](supabase/migrations/20260415119000_refonte_v2_reconciliation_v2_normalized_match.sql)
4. Delta v2 observe: aucun changement sur les compteurs mapped/conflict au 2026-04-15.
5. Migration appliquee (v3 autocreate bridge): [supabase/migrations/20260415120000_refonte_v2_reconciliation_v3_autocreate_bridge.sql](supabase/migrations/20260415120000_refonte_v2_reconciliation_v3_autocreate_bridge.sql)
6. Resultat v3 observe: conflits person et asset reduits a 0 sur le tenant actif.
7. Migration appliquee (documents bridge): [supabase/migrations/20260415121000_refonte_v2_documents_bridge_employee_vault.sql](supabase/migrations/20260415121000_refonte_v2_documents_bridge_employee_vault.sql)
8. Resultat documents observe: `employee_vault_documents` mappe a 2/2, conflits document a 0.

## Completion phases 3 a 7 (execution continue)

- Synthese execution: [docs/refonte-v2-phase1-7-execution-2026-04-15.md](docs/refonte-v2-phase1-7-execution-2026-04-15.md)
- Migration additive de completion: [supabase/migrations/20260415122000_refonte_v2_phase3_to_7_additive_completion.sql](supabase/migrations/20260415122000_refonte_v2_phase3_to_7_additive_completion.sql)
- Effet: ajout des pivots manquants (`person_profiles`, `document_versions`, `entity_history`, `ref_roles`), backfill trace legacy->pivot, vues de bridge et policies RLS dediees.
