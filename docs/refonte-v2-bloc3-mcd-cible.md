# Refonte V2 - Bloc 3 MCD Cible

Date: 2026-04-15
Statut: proposition cible validee pour implementation progressive.

## 1. Lecture conceptuelle cible (6 super-domaines)

### 1) Identite

Entites pivots:
- persons
- person_profiles
- person_employment
- person_driver_details
- person_contacts

Regle:
- Une personne est une identite humaine unique par company.
- Les comptes applicatifs restent dans profils/tenant_users, relies a persons.

### 2) CRM

Entites pivots:
- crm_accounts (ex clients)
- crm_contacts
- crm_sites
- crm_leads
- crm_quotes
- crm_followups

Regle:
- Un compte CRM peut avoir plusieurs contacts et plusieurs sites.
- Les devis portent des references metier uniques par company.

### 3) Operation

Entites pivots:
- transport_orders (ex ordres_transport)
- transport_missions
- transport_stops (ex etapes_mission)
- transport_assignments
- transport_status_history

Regle:
- Une mission peut regrouper plusieurs orders.
- Un order peut avoir plusieurs stops ordonnes.

### 4) Ressources

Entites pivots:
- assets
- asset_vehicle_details
- asset_trailer_details
- asset_assignments
- asset_km_readings
- asset_maintenance_events

Regle:
- assets est la super-entite.
- Les details vehicule/remorque sont en tables filles exclusives.

### 5) Support

Entites pivots:
- documents
- document_versions
- document_links
- document_visibility_policies
- document_access_logs
- document_consents
- entity_history
- erp_audit_logs

Regle:
- GED unique transverse, coffre salarie comme policy/scope et non comme silo.

### 6) Finance

Entites pivots:
- finance_invoices (ex factures)
- finance_entries (ex compta_ecritures)
- finance_entry_lines
- finance_documents
- business_sequences

Regle:
- Les cles metier visibles sont uniques par company.

## 2. Cardinalites critiques (cible V2)

1. persons 1 - n person_contacts
2. persons 1 - n person_employment
3. persons 1 - n person_driver_details (cas historique autorise, un actif a la fois)
4. persons 1 - n person_profiles
5. assets 1 - 0..1 asset_vehicle_details
6. assets 1 - 0..1 asset_trailer_details
7. assets 1 - n asset_km_readings
8. assets 1 - n asset_maintenance_events
9. persons n - n assets via asset_assignments
10. transport_missions 1 - n transport_orders
11. transport_orders 1 - n transport_stops
12. documents 1 - n document_versions
13. documents n - n entites metier via document_links
14. Toutes entites metier 1 - n entity_history

## 3. Invariants d integrite (obligatoires)

### Identite

1. UNIQUE(company_id, matricule) sur persons quand matricule non null.
2. person_type doit etre coherent avec les specialisations:
   - person_driver_details autorise seulement pour person_type in ('driver','employee').
3. Une seule relation active person_profiles par couple (person_id, profil_id).

### Assets

1. XOR details:
   - type='vehicle' => details dans asset_vehicle_details uniquement.
   - type='trailer' => details dans asset_trailer_details uniquement.
2. UNIQUE(company_id, registration) filtre sur registration is not null.
3. Un seul assignment actif exclusif si assignment_type='exclusive'.

### Operation

1. transport_stops: UNIQUE(order_id, sequence_no).
2. transport_orders: coherence statuts (workflow valide uniquement).
3. Impossible de cloturer un order sans statut terminal de mission.

### GED

1. current_version_no doit exister dans document_versions.
2. Un document archive ne peut pas recevoir de nouvelle version.
3. Policy de visibilite obligatoire pour tout document publie.

### Historique

1. Tout changement fonctionnel critique doit ecrire entity_history.
2. erp_audit_logs conserve l audit technique sans remplacer entity_history metier.

## 4. Normalisation enums vs referentiels

### Rester en enum/check SQL (stable et technique)

- audit action: insert/update/delete
- niveaux techniques systeme stricts

### Passer en referentiels ref_* (evolutif metier)

- ref_roles
- ref_transport_status
- ref_transport_types
- ref_absence_types
- ref_asset_types
- ref_document_types
- ref_priority_levels
- ref_employment_status

Regle de gouvernance:
- Si valeur modifiable par UI, traduisible, ou variable par tenant => ref table.

## 5. RLS et company_id (cible pragmatique)

Conserver company_id obligatoire sur:
1. entites racines metier
2. tables journaux/historiques
3. tables a fort volume filtrees en lecture
4. tables ou policy directe company_id = my_company_id est necessaire

Optionnel/supprimable a terme sur:
1. tables filles strictes avec parent non ambigu
2. tables de liaison pure si RLS passe par parent et perfs acceptables

Decision V2:
- Par defaut on conserve company_id tant que le cout RLS/performance est inconnu.

## 6. Conventions de nommage V2

1. Tables en snake_case anglais.
2. PK: id uuid.
3. FK: <entity>_id.
4. Colonnes metier visibles:
   - reference, numero, code, matricule, registration.
5. Timestamps standard:
   - created_at, updated_at, archived_at (si soft delete).
6. Statuts:
   - status_code (FK ref table) prefere a status texte libre.

## 7. Definition of Done - Bloc 3

1. Cardinalites et invariants valides metier + technique.
2. Liste finale des pivots approuvee:
   - persons, assets, documents, entity_history.
3. Liste des referentiels ref_* approuvee.
4. Convention de nommage figee pour les migrations Bloc 5.
