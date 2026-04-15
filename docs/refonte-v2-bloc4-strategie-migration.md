# Refonte V2 - Bloc 4 Strategie de migration

Date: 2026-04-15
Objectif: migration progressive sans interruption, avec rollback et gates qualite.

## Principes non negociables

1. Additif d abord, destructif en dernier.
2. Aucun drop table/colonne avant stabilisation double ecriture.
3. Chaque lot inclut:
   - script SQL
   - script backfill
   - tests de non regression
   - rollback
4. Migration canary par tenant avant generalisation.

## Etape 1 - Foundation schema (sans impact front)

Contenu:
1. Creer pivots: persons, assets, documents v2, entity_history, ref_*.
2. Ajouter colonnes de transition nullable dans legacy:
   - person_id
   - asset_id
   - document_id_v2

Execution:
- Fenetre standard, pas de downtime.
- Constraints sensibles en NOT VALID.

Rollback:
- Drop objets strictement nouveaux uniquement.
- Aucun effet sur legacy.

Gate A:
- Migrations passent en preprod et prod sans regression.

## Etape 2 - Backfill deterministic

Contenu:
1. Construire tables de mapping legacy -> pivot:
   - map_person_legacy
   - map_asset_legacy
   - map_document_legacy
2. Backfill idempotent par batch.

Execution:
- Batchs tailles fixes (ex 5k).
- Journalisation des erreurs de mapping.

Rollback:
- Suppression des mappings + reset colonnes de transition.

Gate B:
- 100% des lignes cibles remplies pour les entites P1.
- 0 collision bloquante non resolue.

## Etape 3 - Double ecriture

Contenu:
1. Triggers legacy -> pivot obligatoires.
2. Triggers pivot -> legacy uniquement si modules non migrés.
3. Monitoring derive (delta count + checksum logique).

Execution:
- Activation progressive par domaine.

Rollback:
- Desactiver triggers double write.
- Revenir en legacy-only write.

Gate C:
- 14 jours sans derive critique.

## Etape 4 - Adaptation applicative

Contenu:
1. Passage read path module par module:
   - Identite
   - Operation
   - Ressources
   - GED
2. Feature flags de bascule.

Execution:
- Canary tenant (1 tenant), puis 10%, puis 100%.

Rollback:
- Repasser read flags sur legacy.

Gate D:
- SLA fonctionnel respecte.
- Aucun incident P1 sur modules migres.

## Etape 5 - Depreciation legacy

Contenu:
1. Marquer colonnes/tables legacy en read-only.
2. Couper ecriture legacy une fois stabilite validee.
3. Maintenir vues de compatibilite si necessaire.

Rollback:
- Reactiver ecriture legacy temporairement.

Gate E:
- 30 jours de stabilite post-cutover.

## Etape 6 - Nettoyage final

Contenu:
1. Suppression triggers sync.
2. Drop colonnes/tables obsolete validees.
3. Regeneration des types TS depuis schema final.

Rollback:
- Plus de rollback structurel global.
- Prevoir restauration DB backup si necessaire.

Gate F:
- Debt legacy close.
- Observabilite et runbooks a jour.

## Ce qui se migre sans interruption

1. Creation pivots et refs.
2. Ajout colonnes nullable.
3. Index nouveaux (preferer concurrently sur tables chaudes).

## Ce qui exige double ecriture

1. profils/conducteurs/employee_directory -> persons.
2. vehicules/remorques/affreteur_vehicles -> assets.
3. conducteur_documents/flotte_documents/employee_vault_documents -> documents v2.

## Ce qui exige scripts de synchronisation

1. Backfill mapping ids.
2. Reconciliation statuts legacy vers codes referentiels.
3. Reconciliation cles metier company-level.

## Ce qui exige arbitrage metier manuel

1. Dedoublonnage personne (homonymes, emails multiples).
2. Resolution collisions matricule/registration/numero.
3. Cas de visibilite documentaire post-depart ambigu.

## Plan de tests obligatoires

1. Tests RLS multi-tenant par table P1/P2.
2. Tests non regression front par module.
3. Tests de flux critiques:
   - creation OT
   - affectation ressource
   - emission facture
   - acces coffre salarie
4. Tests d audit/historique:
   - event present et coherent.

## Definition of Done - Bloc 4

1. Roadmap migration versionnee (etapes + gates).
2. Runbooks rollback disponibles.
3. Plan canary valide.
4. Matrice des risques migration mise a jour par lot.
