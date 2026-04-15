# Refonte V2 - Bloc 5 SQL DDL recommande

Date: 2026-04-15
Objectif: traduire la cible V2 en scripts executables par lots.

## Scripts fournis dans ce lot

1. [erp2/supabase/snippets/refonte_v2/01_persons_foundation.sql](erp2/supabase/snippets/refonte_v2/01_persons_foundation.sql)
2. [erp2/supabase/snippets/refonte_v2/02_assets_foundation.sql](erp2/supabase/snippets/refonte_v2/02_assets_foundation.sql)
3. [erp2/supabase/snippets/refonte_v2/03_refs_uniqueness.sql](erp2/supabase/snippets/refonte_v2/03_refs_uniqueness.sql)

## Migrations officielles creees

1. [erp2/supabase/migrations/20260415113000_refonte_v2_block3_persons_foundation.sql](erp2/supabase/migrations/20260415113000_refonte_v2_block3_persons_foundation.sql)
2. [erp2/supabase/migrations/20260415114000_refonte_v2_block3_assets_foundation.sql](erp2/supabase/migrations/20260415114000_refonte_v2_block3_assets_foundation.sql)
3. [erp2/supabase/migrations/20260415115000_refonte_v2_block5_refs_uniqueness.sql](erp2/supabase/migrations/20260415115000_refonte_v2_block5_refs_uniqueness.sql)

## Contenu attendu par script

### 01_persons_foundation.sql

- CREATE TABLE persons
- CREATE TABLE person_employment
- CREATE TABLE person_driver_details
- ALTER TABLE legacy pour ajouter person_id
- Index pour lecture RLS et recherche metier

### 02_assets_foundation.sql

- CREATE TABLE assets
- CREATE TABLE asset_vehicle_details
- CREATE TABLE asset_trailer_details
- CREATE TABLE asset_assignments
- CREATE TABLE asset_km_readings
- ALTER TABLE legacy pour ajouter asset_id

### 03_refs_uniqueness.sql

- CREATE TABLE ref_transport_status
- CREATE TABLE ref_transport_types
- CREATE TABLE ref_absence_types
- CREATE TABLE ref_asset_types
- CREATE TABLE ref_document_types
- CREATE TABLE ref_priority_levels
- CREATE TABLE ref_employment_status
- Unique indexes company-level sur references metier

## Conventions SQL imposees

1. Toujours IF NOT EXISTS quand possible.
2. FK explicites et nommage coherent.
3. CHECK constraints explicites sur domaines critiques.
4. Index composites avec company_id en premiere position.
5. Contraintes lourdes en NOT VALID puis VALIDATE.

## Patterns d index recommande

1. Lookup metier:
- (company_id, reference)
- (company_id, numero)
- (company_id, matricule)

2. RLS/lecture:
- (company_id, status, updated_at desc)
- (company_id, created_at desc)

3. Historique:
- (company_id, entity_type, entity_id, changed_at desc)

## Differenciation cle technique vs cle metier

1. Cle technique interne:
- id uuid, stable, non signifiante fonctionnellement.

2. Cle metier visible utilisateur:
- reference, numero, matricule, registration.
- Unicite imposee par company quand pertinent.

## Precautions execution Supabase/PostgreSQL

1. Eviter lock long:
- index concurrently sur tables volumineuses.
2. Eviter cut brutal:
- conserver colonnes legacy et alimenter pivot.
3. Valider RLS apres chaque lot de schema.

## Definition of Done - Bloc 5

1. Les 3 scripts passent en environnement de test.
2. Les indexes critiques existent.
3. Les unicites metier company-level sont en place.
4. Aucun objet legacy casse par ces fondations.
