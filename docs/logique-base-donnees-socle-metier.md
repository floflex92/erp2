# Logique base de donnees - socle metier

## Objectif

Ce socle clarifie les informations qui se melangent en production:

- societe mere
- employes
- vehicules et remorques
- documents
- clients
- affreteurs
- API
- courses
- historique

Le principe reste 100% additif: aucune table historique n est supprimee.

## Perimetre couvre

### 1) Societe mere

Source canonique: `config_entreprise`.

Vue de lecture centralisee:

- `vue_societe_mere`

Cette vue pivote les cles majeures (`societe_nom`, `societe_siret`, `societe_adresse`, contacts) et expose aussi `configuration_complete` en `jsonb`.

### 2) Affreteurs (nouveau bloc relationnel)

Tables ajoutees:

- `affreteur_onboardings`
- `affreteur_onboarding_history`
- `affreteur_employees`
- `affreteur_drivers`
- `affreteur_vehicles`
- `affreteur_equipments`
- `affretement_contracts`
- `affretement_contract_equipments`
- `affretement_contract_updates`
- `affretement_contract_history`

Objectif: sortir l affretement du stockage local isole et poser une base relationnelle coherente (onboarding -> moyens -> contrats -> statut operationnel -> historique).

### 3) Courses (ordre transport) en vue unique

Vue ajoutee:

- `vue_courses_centre`

Cette vue regroupe en une seule lecture:

- OT + client
- conducteur, vehicule, remorque
- derniere transition de statut + nombre total de transitions
- derniere ETA v1.1
- derniere position vehicule v1.1
- contexte affretement (contrat, affreteur, dernier statut operationnel)

### 4) Documents

Vue ajoutee:

- `vue_documents_metier`

Elle unifie:

- `conducteur_documents` (domaine RH)
- `flotte_documents` (domaine flotte)

Objectif: un point d entree unique pour les ecrans documentaires et les audits de validite.

### 5) Historique transverse

Vue ajoutee:

- `vue_historique_metier`

Elle consolide:

- `historique_statuts`
- `conducteur_evenements_rh`
- `flotte_entretiens`
- `erp_v11_api_logs`
- `affreteur_onboarding_history`
- `affretement_contract_history`
- `affretement_contract_updates`

## 6) Module Tâches (v1.1)

Table ajoutée:

- `tasks`

Colonnes principales:

- `user_id` (FK vers `profils`)
- `title`, `notes`
- `completed` (bool)
- `due_date` (date)
- `priority` (low/medium/high)
- `created_at`, `updated_at`

Règles métier:

- chaque utilisateur gère son propre lot de tâches (RLS `tasks_rw`)
- accès global : `admin`, `dirigeant`
- tri / filtre : échéance, priorité, état

Cette table permet l'intégration de la nouvelle page React `Tasks` avec support de la synchronisation locale pour les sessions non-connectées (fallback localStorage).
Objectif: lire l historique metier sans recoller manuellement plusieurs sources.

## Regles de coherence ajoutees

Sur `ordres_transport`:

- `date_livraison_prevue >= date_chargement_prevue` (check `not valid`)
- `date_livraison_reelle >= date_chargement_prevue` (check `not valid`)

Ces contraintes protegent les nouvelles ecritures sans bloquer les historiques anciens.

## Securite

- RLS activee sur les nouvelles tables affretement.
- Policies role-based alignees sur les roles metier existants (`admin`, `dirigeant`, `exploitant`, `commercial`, `comptable`, `affreteur`, `conducteur_affreteur`).

## Resultat attendu

Avec ce socle, la lecture de la donnee est structuree par domaines et non plus par accumulation de tables independantes.

Prochaine etape naturelle: brancher progressivement l UI affretement vers ces tables SQL pour remplacer le stockage local.
