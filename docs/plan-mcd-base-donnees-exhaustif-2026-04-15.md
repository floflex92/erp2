# Plan complet et exhaustif - MCD Base de donnees ERP Transport

Date: 15 avril 2026
Perimetre: ERP Nexora Truck (multi-tenant)
Statut: cible consolidee pour execution progressive

## 1. Objectif

- Unifier le modele metier transport, RH, flotte, CRM, documents et finance.
- Garantir integrite metier, tracabilite et conformite legale.
- Permettre une migration progressive additive sans rupture operationnelle.
- Preparer un MCD stable avant MLD/DDL par lots.

## 2. Perimetre exhaustif couvert

- Socle multi-tenant, identite et securite.
- CRM clients, prospects, devis, relances.
- Exploitation transport (ordres, missions, etapes, statuts).
- Ressources (vehicules, remorques, affectations, maintenance).
- Affretement (onboarding, moyens, contrats, historique).
- GED transverse (documents, versions, visibilite, acces).
- Comptabilite generale, TVA, banque, FEC, analytique transport.
- RH et paie operationnelle.
- Audit technique et historique metier transverse.

## 3. Principes de modelisation

- Une entite pivot par concept metier.
- Nommage unifie snake_case anglais.
- PK UUID sur nouvelles tables.
- Cles metier visibles uniques par company.
- Statuts portes par referentiels ref_* et non texte libre.
- Historisation obligatoire des evenements critiques.
- Ecritures valdees inalterables (correction par contre-ecriture).
- Strategie additive d abord, deprecation ensuite.

## 4. Macro-domaines MCD cible

### 4.1 Identite

Entites pivots:
- persons
- person_profiles
- person_employment
- person_driver_details
- person_contacts

Regles:
- Une personne est une identite humaine unique par company.
- Les comptes applicatifs (profils/tenant_users) se lient a persons.

### 4.2 CRM

Entites pivots:
- crm_accounts
- crm_contacts
- crm_sites
- crm_leads
- crm_quotes
- crm_followups

Regles:
- Un compte CRM peut avoir plusieurs contacts et sites.
- Les devis ont des references metier uniques par company.

### 4.3 Operations transport

Entites pivots:
- transport_orders
- transport_missions
- transport_stops
- transport_assignments
- transport_status_history

Regles:
- Une mission peut regrouper plusieurs orders.
- Un order peut avoir plusieurs stops ordonnes.

### 4.4 Ressources

Entites pivots:
- assets
- asset_vehicle_details
- asset_trailer_details
- asset_assignments
- asset_km_readings
- asset_maintenance_events

Regles:
- assets est la super-entite.
- Les details vehicule/remorque sont des tables filles exclusives.

### 4.5 Support / GED

Entites pivots:
- documents
- document_versions
- document_links
- document_visibility_policies
- document_access_logs
- document_consents
- entity_history
- erp_audit_logs

Regles:
- GED unique transverse.
- Le coffre salarie est une policy/scope et non un silo.

### 4.6 Finance

Entites pivots:
- finance_invoices
- finance_entries
- finance_entry_lines
- finance_documents
- business_sequences

Regles:
- Les cles metier visibles sont uniques par company.

## 5. Cardinalites critiques

- persons 1-n person_contacts
- persons 1-n person_employment
- persons 1-n person_profiles
- persons 1-n person_driver_details (un seul actif)
- assets 1-0..1 asset_vehicle_details
- assets 1-0..1 asset_trailer_details
- assets 1-n asset_km_readings
- assets 1-n asset_maintenance_events
- persons n-n assets via asset_assignments
- transport_missions 1-n transport_orders
- transport_orders 1-n transport_stops
- documents 1-n document_versions
- documents n-n entites metier via document_links
- entites critiques 1-n entity_history

## 6. Invariants d integrite obligatoires

### 6.1 Identite

- UNIQUE(company_id, matricule) quand matricule non null.
- person_driver_details autorise uniquement pour person_type driver/employee.
- Une seule relation active par couple (person_id, profil_id).

### 6.2 Assets

- XOR details:
  - type=vehicle => asset_vehicle_details
  - type=trailer => asset_trailer_details
- UNIQUE(company_id, registration) quand registration non null.
- Un seul assignment actif exclusif.

### 6.3 Operations

- UNIQUE(order_id, sequence_no) pour transport_stops.
- Cohérence workflow des statuts transport.
- Interdiction de cloture sans statut terminal valide.

### 6.4 GED

- current_version_no doit exister dans document_versions.
- Un document archive ne recoit pas de nouvelle version.
- Policy de visibilite obligatoire pour document publie.

### 6.5 Historique et audit

- Tout changement fonctionnel critique ecrit entity_history.
- erp_audit_logs conserve l audit technique.

### 6.6 Comptabilite

- Somme debit = somme credit par ecriture.
- Ecritures validees non modifiables/supprimables.
- Corrections par contre-ecriture uniquement.
- Export FEC reproductible et verifiable.

## 7. Referentiels ref_* a consolider

- ref_roles
- ref_transport_status
- ref_transport_types
- ref_asset_types
- ref_document_types
- ref_priority_levels
- ref_employment_status
- ref_absence_types
- ref_tva_regimes
- ref_journal_codes

Regle: toute valeur modifiable par UI, traduisible ou variable par tenant doit etre en referentiel.

## 8. RLS et company_id

Conserver company_id obligatoire sur:
- entites racines metier
- historiques et journaux
- tables volumineuses filtrees
- tables necessitant policy directe company_id = my_company_id

RLS:
- activer RLS sur toutes les tables sensibles
- policies par role metier (admin, dirigeant, exploitant, commercial, comptable, RH, affreteur, conducteur)
- controle d acces documentaire par policy explicite

## 9. Plan de migration en 7 lots

### Lot 0 - Cadrage structurel

- Inventaire tables existantes et doublons.
- Mapping ancien -> cible par domaine.
- Dictionnaire de donnees unifie.

Critere de sortie:
- mapping valide metier + technique.

### Lot 1 - Identite et referentiels

- Deployer persons + ref_* prioritaires.
- Relier profils existants vers persons.
- Activer unicites de base.

Critere de sortie:
- auth/profils stables sans regression.

### Lot 2 - Operations transport

- Introduire transport_orders/missions/stops/status_history.
- Mettre passerelles avec ordres_transport historiques.
- Activer invariants sequence/workflow.

Critere de sortie:
- exploitation transport fonctionnelle en cible.

### Lot 3 - Ressources flotte

- Migrer vers assets + tables filles.
- Reprendre affectations, kilometrage, maintenance.

Critere de sortie:
- affectation conducteur/materiel fiable.

### Lot 4 - GED et historique transverse

- Centraliser documents/versions/liens/visibilite.
- Brancher entity_history et audit technique.

Critere de sortie:
- tracabilite transverse complete.

### Lot 5 - Finance conformite legale

- Compta partie double (journaux/ecritures/lignes).
- TVA declarative, rapprochement bancaire, FEC.
- Inalterabilite et chainage d audit.
- Axes analytiques transport.

Critere de sortie:
- conformite legale minimale atteinte.

### Lot 6 - Affretement et optimisation

- Stabiliser onboarding, contrats et statuts affretement.
- Consolider vues transverses operations + historique.

Critere de sortie:
- pilotage affretement bout en bout.

## 10. Livrables attendus

- Diagramme MCD versionne par lot.
- Dictionnaire de donnees (champs/types/contraintes).
- Matrice cardinalites + regles de gestion.
- Specification RLS par table.
- Plan de migration SQL + rollback.
- Jeux de tests metier/securite/performance.
- Rapport de validation par lot.

## 11. Strategie de validation

- Validation structurelle: PK/FK/UNIQUE/CHECK.
- Validation metier: scenarios CRM/transport/RH/finance.
- Validation securite: tests RLS multi-roles.
- Validation volumetrie: index et perfs requetes critiques.
- Validation non regression: vues de compatibilite temporaires.

## 12. Gouvernance

- Comite modele hebdomadaire metier + technique.
- Changement sans owner metier interdit.
- Revue d impact transverse obligatoire.
- Versionnement MCD avec changelog par domaine.
- Gate qualite avant chaque lot (integrite, securite, performance).

## 13. Risques et parades

- Duplication d entites -> imposer entite pivot unique.
- Derive des statuts -> referentiels obligatoires.
- Dette historique -> migration additive + vues de transition.
- Risque conformite comptable -> prioriser lot 5.
- Risque performance RLS -> indexation ciblee + tests de charge.

## 14. Planning operationnel recommande (12 semaines)

- S1-S2: Lot 0
- S3-S4: Lot 1
- S5-S6: Lot 2
- S7-S8: Lot 3
- S9: Lot 4
- S10-S11: Lot 5
- S12: Lot 6 + stabilisation + recette finale

## 15. Definition of Done globale

- Cardinalites et invariants valides metier + technique.
- Entites pivots approuvees (persons, assets, documents, entity_history, finance_*).
- Referentiels ref_* approuves.
- Conventions de nommage figees.
- Couverture RLS et audit validee.
- Roadmap d execution signee avec criteres de sortie par lot.
