# Cadrage V1 - compte_client_db

Date: 2026-03-31
Statut: proposition prete a valider

## 1. Nommage fige

- Base dev: `compte_client_db_dev`
- Base prod: `compte_client_db_prod`

## 2. Vocabulaire metier fige

- `compte_erp`: organisation qui exploite l'ERP (ex: Channel Fret)
- `partenaire`: entreprise externe liee au compte
- `destinataire_final`: optionnel, distinct si necessaire

Regle court terme:
- si pas de distinction operationnelle, `destinataire_final_id = partenaire_id`

## 3. Objectif produit V1

- Donner un acces large et rapide au perimetre client lie au compte.
- Conserver les garde-fous anti-erreur via archivage (pas de suppression physique).
- Prioriser le temps reel sur:
  1. statut transport
  2. position vehicule
  3. messages
  4. notifications documents

## 4. Regles de nommage techniques

- Tables: `snake_case` pluriel.
- Colonnes: `snake_case`.
- PK: `id uuid`.
- FK: suffixe `_id`.
- Dates: suffixe `_at`.
- Interdiction d'introduire une colonne nommee simplement `client`.

## 5. Regles d'acces V1

- Acces par `compte_erp_id` obligatoire partout.
- Ecriture directe autorisee dans le perimetre compte.
- Suppression logique uniquement (`archived_at`), restauration possible via workflow dedie.
- Audit obligatoire de toute ecriture.

## 6. Retention et sauvegardes

- Retention cible: 10 ans.
- Sauvegarde technique annuelle (base complete).
- Sauvegarde fonctionnelle annuelle (export par `compte_erp_id`).

## 7. Perimetre initial (MVP rapide)

- Comptes/roles/utilisateurs
- Ordres de transport
- Documents et versions
- Messages
- Evenements temps reel
- Notifications
- Audit

## 8. Hors perimetre V1

- Refonte complete des roles fins.
- Distinction avancee multi-entites au-dela de `partenaire`.
- Purge legacy hors perimetre compte.

## 9. Artefacts generes

- Migration foundation versionnee:
  - `supabase/migrations/20260331101000_compte_client_db_v1_foundation.sql`
- Script bootstrap Channel Fret:
  - `supabase/snippets/compte_client_db_v1_bootstrap_channel_fret.sql`
- Script RLS strict:
  - `supabase/snippets/compte_client_db_v1_rls_strict.sql`
- Sequence d'execution serv dev:
  - `docs/execution-serv-dev-compte-client-db-v1.md`
- Checklist post-run:
  - `docs/checklist-verification-compte-client-db-v1.md`
- Script de tests RLS:
  - `supabase/snippets/compte_client_db_v1_rls_tests.sql`
- Guide de validation fonctionnelle:
  - `docs/validation-fonctionnelle-compte-client-db-v1.md`
