# Refonte V2 - Execution autonome phases 1 a 7

Date: 2026-04-15
Perimetre: ERP/TMS React + TypeScript + Supabase (production partielle)
Contrainte: strategie additive, sans suppression legacy, sans renommage brutal

## 1) Diagnostic clair (Phase 1)

### Cartographie tables par domaine

- Identite:
  - profils
  - employee_directory
  - companies
  - tenant_users
  - roles, user_roles, role_permissions
  - persons, person_employment, person_driver_details (deja poses en V2)
- CRM:
  - clients, contacts, adresses
  - prospects, actions_commerciales, devis_transport
- Transport:
  - ordres_transport, etapes_mission, historique_statuts
  - affectations, courses, courses_groupes, transport_missions
- Ressources (flotte):
  - vehicules, remorques
  - flotte_documents, flotte_entretiens
  - vehicule_releves_km, remorque_releves_km
  - affreteur_vehicles, affreteur_equipments
  - assets, asset_vehicle_details, asset_trailer_details (deja poses en V2)
- RH:
  - conducteurs
  - conducteur_evenements_rh, absences_rh
  - employee_vault_* (coffre salarie)
  - entretiens_rh, interview_*
- Documents:
  - documents
  - conducteur_documents, flotte_documents
  - document_links
  - employee_vault_documents, employee_vault_document_versions
  - interview_document_versions
- Finance:
  - factures
  - compta_* (journaux, ecritures, TVA, etc.)

### Problemes detectes

- Identites dupliquees:
  - profils, conducteurs, employee_directory portent des informations humaines recouvrantes.
- Flotte dupliquee:
  - vehicules/remorques en interne et affreteur_vehicles cote sous-traitance.
- GED fragmentee:
  - conducteur_documents, flotte_documents, employee_vault_documents, interview_documents.
- Statuts texte:
  - plusieurs tables fonctionnent encore avec des statuts textuels libres.
- company_id heterogene:
  - bon niveau global, mais certaines entites historiques ont ete migrees progressivement avec fallback company_id=1.

### Tables critiques a refondre en priorite

- profils
- conducteurs
- employee_directory
- vehicules
- remorques
- conducteur_documents
- flotte_documents
- documents
- document_links

## 2) Mapping ancien -> cible (Phase 2)

| Table actuelle | Role metier | Table cible | Action | Risque | Dependances code |
|---|---|---|---|---|---|
| profils | profil applicatif utilisateur | persons + person_profiles | MERGE | eleve | auth, RequireAuth, SessionPicker, chat |
| conducteurs | identite conducteur + habilitations | persons + person_driver_details | MERGE | eleve | Chauffeurs, Planning, Tachygraphe, OT |
| employee_directory | dossier employe RH | persons + person_employment | MERGE | eleve | employeeVault, RH, Paie |
| vehicules | flotte moteur | assets + asset_vehicle_details | MERGE | eleve | Vehicules, Maintenance, KPI, Planning |
| remorques | flotte tractee | assets + asset_trailer_details | MERGE | moyen/eleve | Remorques, Planning |
| conducteur_documents | docs RH conducteur | documents + document_links + document_versions | MERGE | moyen | Chauffeurs, RH |
| flotte_documents | docs flotte | documents + document_links + document_versions | MERGE | moyen | Vehicules, Remorques, Maintenance |
| documents | docs OT legacy | documents + document_links + document_versions | KEEP+SPLIT | moyen | Transports, facturation, preuves |
| historique_statuts | timeline OT | entity_history (partiel) | KEEP+SPLIT | moyen | suivi operations |
| roles/user_roles | habilitations multi-role | ref_roles + person_profiles + roles | KEEP+MERGE | moyen | securite et menu |

## 3) SQL tables pivots (Phase 3)

Livrable execute:
- supabase/migrations/20260415122000_refonte_v2_phase3_to_7_additive_completion.sql

Contenu principal ajoute:
- person_profiles
- document_versions
- entity_history
- ref_roles
- business_key + indexes uniques tenant-level sur pivots
- enrichissement document_links (company_id, business_key, status)

## 4) Scripts migration/backfill (Phase 4)

Inclus dans la meme migration, mode idempotent:
- profils -> persons + person_profiles + profils.person_id
- conducteurs -> persons + person_driver_details + conducteurs.person_id
- employee_directory -> persons + person_employment + employee_directory.person_id
- vehicules/remorques -> assets + detail tables + asset_id legacy
- maj mapping refonte_v2.map_person_legacy et map_asset_legacy

Proprietes de surete:
- insert conditionnel (where not exists)
- update referentiel uniquement sur colonnes de pont (person_id, asset_id)
- aucune suppression

## 5) Strategie transition (Phase 5)

Strategie retenue: lecture hybride + double ecriture cible minimale

- Lecture hybride:
  - vues v_persons_legacy_bridge et v_assets_legacy_bridge
  - services front avec fallback pivots -> legacy
- Double ecriture:
  - trigger conducteurs -> person_driver_details
- Avantages:
  - zero rupture de service
  - migration progressive ecran par ecran
  - rollback applicatif simple (retour lecture legacy)
- Risques:
  - derive temporaire possible entre legacy et pivot
  - necessite surveillance KPI et drift log

## 6) Modifications code (Phase 6)

Nouveaux services:
- src/lib/services/personsService.ts
- src/lib/services/assetsService.ts
- src/lib/services/documentsService.ts

Ecrans adaptes (progressif, sans suppression code legacy):
- src/components/comptabilite/SaisieEcrituresTab.tsx
  - references chauffeurs/flotte passees en lecture hybride via services.
- src/components/dashboard/WidgetKpiExploitant.tsx
  - KPI conducteurs/flotte active via services hybrides.
- src/pages/SessionPicker.tsx
  - fallback secondaire sur person_profiles/persons si profils indisponible.

## 7) Securite RLS (Phase 7)

Ajouts RLS dans la migration:
- activation RLS:
  - person_profiles
  - document_versions
  - entity_history
  - ref_roles
- policies:
  - scope company_id = my_company_id()
  - roles metiers autorises:
    - admin
    - dirigeant
    - exploitant
    - rh
    - conducteur
    - affreteur

Point de vigilance:
- des policies legacy permissives existent encore sur d anciennes tables; le hardening complet se fait par lot pour eviter la casse.

## 8) Plan d action priorise

1. Appliquer la migration 20260415122000 sur environnement de dev puis staging.
2. Regenerer les types Supabase pour inclure person_profiles/document_versions/entity_history/ref_roles.
3. Migrer progressivement les ecrans critiques:
   - Auth/session
   - Chauffeurs
   - Vehicules/Remorques
   - Maintenance/Documents
4. Activer un suivi daily des KPIs de migration et drift.
5. Passer en mode pivot-first lecture sur modules stabilises.
6. Conserver le legacy en read-only puis deprecate par lot apres 2 cycles stables.
