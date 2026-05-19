# MCD — Schéma de Base de Données ERP Nexora Truck

> **Version** : 1.12.11  
> **Date** : 14 avril 2026  
> **Schémas** : `public`, `core`, `docs`, `rt`, `audit`, `backup`  
> **Total** : ~120 tables

---

## Table des matières

1. [Socle — Profils & Multi-tenant](#1-socle--profils--multi-tenant)
2. [Clients & CRM](#2-clients--crm)
3. [RH — Conducteurs](#3-rh--conducteurs)
4. [Flotte — Véhicules & Remorques](#4-flotte--véhicules--remorques)
5. [GMAO (Gestion Maintenance)](#5-gmao-gestion-maintenance)
6. [Transport — Ordres & Missions](#6-transport--ordres--missions)
7. [Affrètement](#7-affrètement)
8. [Comptabilité Générale](#8-comptabilité-générale)
9. [Comptabilité Transport (Lot B)](#9-comptabilité-transport-lot-b)
10. [Paie Transport](#10-paie-transport)
11. [CE 561 / Réglementation](#11-ce-561--réglementation)
12. [Tchat / Communication](#12-tchat--communication)
13. [Services & Exploitation](#13-services--exploitation)
14. [Objectifs, Bonus & KPI](#14-objectifs-bonus--kpi)
15. [Entretiens RH Avancés](#15-entretiens-rh-avancés)
16. [Coffre-Fort Salarié](#16-coffre-fort-salarié)
17. [ETA / Scoring / Cockpit Décision](#17-eta--scoring--cockpit-décision)
18. [Divers & Intégration API](#18-divers--intégration-api)
19. [Schéma `core` (compte client dédié)](#19-schéma-core-compte-client-dédié)
20. [Schémas auxiliaires](#20-schémas-auxiliaires)

---

## 1. Socle — Profils & Multi-tenant

### `companies`
Entreprises clientes (isolation multi-tenant).

| Colonne | Type | Contraintes |
|---|---|---|
| id | serial | PK |
| name | text | NOT NULL |
| slug | text | UNIQUE NOT NULL |
| status | text | `active`, `suspended`, `trial`, `cancelled` |
| subscription_plan | text | `starter`, `pro`, `enterprise` |
| max_users | integer | défaut 10 |
| max_screens | integer | défaut 3 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `profils`
Utilisateurs de l'ERP, liés à `auth.users`.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → `auth.users` |
| company_id | integer | FK → `companies` |
| role | text | `admin`, `dirigeant`, `exploitant`, `rh`, `comptable`, `commercial`, `conducteur`, `mecanicien`, `logisticien`… |
| nom | text | |
| prenom | text | |
| matricule | text | |
| tenant_key | text | FK → `erp_v11_tenants` |
| is_active | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `config_entreprise`
Paramétrage clé/valeur global par tenant.

| Colonne | Type | Contraintes |
|---|---|---|
| cle | text | PK |
| valeur | jsonb | |
| description | text | |
| updated_at | timestamptz | |
| updated_by | uuid | |

### `erp_v11_tenants`
Tenants logiques (compatibilité ascendante).

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| tenant_key | text | UNIQUE |
| display_name | text | |
| company_id | integer | FK → `companies` |
| is_active | boolean | |
| default_max_concurrent_screens | integer | |
| allowed_pages | jsonb | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

## 2. Clients & CRM

### `clients`
Clients de l'entreprise de transport.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| company_id | integer | FK → `companies` |
| nom | text | NOT NULL |
| type_client | text | défaut `chargeur` |
| telephone | text | |
| email | text | |
| adresse / code_postal / ville / pays | text | |
| siret / tva_intra | text | |
| conditions_paiement | integer | jours |
| encours_max | numeric(12,2) | |
| taux_tva_defaut | numeric(5,2) | |
| code_client | text | |
| adresse_facturation / code_postal_facturation / ville_facturation / pays_facturation | text | |
| contact_facturation_nom / email / telephone | text | |
| mode_paiement_defaut | text | |
| type_echeance | text | `date_facture_plus_delai`, `fin_de_mois`, `fin_de_mois_le_10`, `jour_fixe`, `comptant` |
| jour_echeance | integer | 1-31 |
| iban / bic / banque / titulaire_compte | text | |
| actif | boolean | |
| notes | text | |
| created_at / updated_at | timestamptz | |

### `contacts`
Contacts rattachés à un client.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| client_id | uuid | FK → `clients` |
| company_id | integer | FK → `companies` |
| nom / prenom | text | |
| poste | text | |
| telephone / email | text | |
| principal | boolean | |
| created_at | timestamptz | |

### `adresses`
Sites de chargement/livraison.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| client_id | uuid | FK → `clients` (nullable) |
| company_id | integer | FK → `companies` |
| nom_lieu | text | NOT NULL |
| type_lieu | text | |
| adresse / code_postal / ville / pays | text | |
| contact_nom / contact_tel | text | |
| horaires / instructions | text | |
| latitude / longitude | numeric(10,7) | |
| actif | boolean | |
| created_at / updated_at | timestamptz | |

### `prospects`
Leads commerciaux.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| company_id | integer | FK → `companies` |
| nom_entreprise | text | |
| statut | text | `lead`, `qualification`, `devis_envoye`, `negociation`, `closing`, `gagne`, `perdu` |
| montant_mensuel_estime | numeric(12,2) | |
| commercial_nom | text | |
| secteur / type_transport | text | |
| ville / code_postal | text | |
| latitude / longitude | numeric | |
| contact_nom / contact_email / contact_telephone | text | |
| siret | text | |
| ca_annuel_estime | numeric(14,2) | |
| nb_sites | integer | |
| concurrent_actuel | text | |
| source_lead | text | `telephone_entrant`, `salon`, `bouche_a_oreille`, `linkedin`, `bourse_fret`, `site_web`, `recommandation`, `autre` |
| probabilite_closing | integer | 0-100 |
| date_derniere_action | timestamptz | |
| date_prochain_contact | date | |
| zones_transport | text | |
| notes | text | |
| created_at / updated_at | timestamptz | |

### `contacts_prospects`
Interlocuteurs par prospect.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| prospect_id | uuid | FK → `prospects` |
| nom / prenom / poste | text | |
| telephone / email | text | |
| canal_preference | text | `telephone`, `email`, `whatsapp`, `visio` |
| est_principal | boolean | |
| notes | text | |
| created_at | timestamptz | |

### `devis_transport`
Devis commerciaux.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| numero | text | NOT NULL |
| prospect_id | uuid | FK → `prospects` |
| client_id | uuid | FK → `clients` |
| origine / destination | text | |
| distance_km | integer | |
| type_transport | text | `complet`, `partiel`, `groupage`, `express` |
| poids_kg / volume_m3 | numeric | |
| prix_propose_ht / cout_estime_ht / marge_estime_ht | numeric(12,2) | |
| marge_pct | numeric(5,2) | |
| statut | text | `brouillon`, `envoye`, `accepte`, `refuse`, `expire` |
| date_envoi / date_validite / date_reponse | date | |
| taux_tva | numeric(5,2) | |
| commercial_nom / ot_reference | text | |
| notes | text | |
| created_at / updated_at | timestamptz | |

### `actions_commerciales`
Journal d'activités commerciales.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| prospect_id | uuid | FK → `prospects` |
| devis_id | uuid | FK → `devis_transport` |
| type_action | text | `appel`, `email`, `rdv`, `note`, `visite`, `relance` |
| date_action | timestamptz | |
| duree_minutes | integer | |
| resultat | text | `positif`, `neutre`, `negatif`, `sans_reponse` |
| notes | text | |
| commercial_nom | text | |
| created_at | timestamptz | |

### `relances_commerciales`
Relances planifiées.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| prospect_id | uuid | FK → `prospects` |
| devis_id | uuid | FK → `devis_transport` |
| type_relance | text | `devis_sans_reponse`, `prospect_inactif`, `devis_expire`, `suivi_regulier`, `autre` |
| date_prevue | date | NOT NULL |
| statut | text | `planifiee`, `faite`, `annulee` |
| priorite | text | `haute`, `normale`, `basse` |
| notes | text | |
| commercial_nom | text | |
| created_at | timestamptz | |

---

## 3. RH — Conducteurs

### `conducteurs`
Chauffeurs routiers.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| company_id | integer | FK → `companies` |
| nom / prenom | text | NOT NULL |
| telephone / email / adresse | text | |
| date_naissance | date | |
| numero_permis | text | |
| permis_categories | text[] | |
| permis_expiration | date | |
| fimo_date / fco_date / fco_expiration | date | |
| carte_tachy_numero | text | |
| carte_tachy_expiration | date | |
| statut | text | `actif`, `inactif`, `sorti` |
| matricule / poste / type_contrat | text | |
| date_entree / date_sortie | date | |
| motif_sortie | text | |
| contact_urgence_nom / contact_urgence_telephone | text | |
| visite_medicale_date / visite_medicale_expiration | date | |
| recyclage_date / recyclage_expiration | date | |
| preferences / notes | text | |
| created_at / updated_at | timestamptz | |

### `conducteur_documents`
GED conducteurs (PDF stockés dans Supabase Storage).

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| conducteur_id | uuid | FK → `conducteurs` |
| company_id | integer | FK → `companies` |
| category / title / file_name | text | |
| mime_type | text | défaut `application/pdf` |
| storage_bucket / storage_path | text | |
| issued_at / expires_at | date | |
| is_mandatory | boolean | |
| notes | text | |
| uploaded_by | uuid | FK → `auth.users` |
| archived_at | timestamptz | |
| created_at / updated_at | timestamptz | |

### `conducteur_evenements_rh`
Événements RH conducteurs.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| conducteur_id | uuid | FK → `conducteurs` |
| company_id | integer | FK → `companies` |
| event_type / title | text | |
| description | text | |
| severity | text | `info`, `warning`, `critical` |
| start_date / end_date / reminder_at | date | |
| document_id | uuid | FK → `conducteur_documents` |
| created_by | uuid | FK → `auth.users` |
| created_at / updated_at | timestamptz | |

### `absences_rh`
Demandes d'absence.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| company_id | integer | FK → `companies` |
| employe_id | uuid | FK → `profils` |
| type_absence | text | `conges_payes`, `rtt`, `arret_maladie`, `arret_at`, `formation`, `conge_maternite`, `conge_paternite`, `conge_sans_solde`, `absence_autorisee`, `autre` |
| date_debut / date_fin | date | |
| nb_jours | numeric(5,1) | |
| statut | text | `demande`, `validee`, `refusee`, `annulee` |
| motif | text | |
| justificatif_url | text | |
| validateur_id | uuid | FK → `profils` |
| date_validation | timestamptz | |
| commentaire_rh | text | |
| created_by | uuid | FK → `profils` |
| created_at / updated_at | timestamptz | |

### `soldes_absences`
Soldes CP/RTT par année.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| company_id | integer | FK → `companies` |
| employe_id | uuid | FK → `profils` |
| annee | integer | |
| cp_acquis / cp_pris | numeric(5,1) | |
| rtt_acquis / rtt_pris | numeric(5,1) | |
| created_at / updated_at | timestamptz | |

### `entretiens_rh`
Entretiens RH basiques.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| employe_id | uuid | FK → `auth.users` |
| type | text | `evaluation_annuelle`, `entretien_professionnel`, `bilan_competences`, `reunion_management`, `autre` |
| titre / description | text | |
| date_planifiee | date | |
| heure_debut | time | |
| duree_minutes | integer | |
| evaluateur_id | uuid | FK → `auth.users` |
| statut | text | `planifie`, `effectue`, `reporte`, `annule` |
| resultat / notes_evaluation | text | |
| suivi_requis | boolean | |
| date_suivi_prevu | date | |
| documents_id | uuid[] | |
| created_by | uuid | FK → `auth.users` |
| created_at / updated_at | timestamptz | |

### `journee_travail`
Consolidation journalière par conducteur (CE 561).

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| conducteur_id | uuid | FK → `conducteurs` |
| company_id | integer | FK → `companies` |
| jour | date | UNIQUE avec conducteur_id |
| minutes_conduite / minutes_travail / minutes_repos | integer | ≥ 0 |
| nb_missions | integer | ≥ 0 |
| source | text | `tachygraphe`, `planning` |
| created_at / updated_at | timestamptz | |

---

## 4. Flotte — Véhicules & Remorques

### `vehicules`
Tracteurs et porteurs.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| company_id | integer | FK → `companies` |
| immatriculation | text | UNIQUE NOT NULL |
| marque / modele | text | |
| annee | integer | |
| type_vehicule | text | défaut `tracteur` |
| ptac_kg | numeric(12,2) | |
| km_actuel | integer | |
| numero_parc | text | |
| ct_expiration / assurance_expiration / vignette_expiration | date | |
| tachy_serie | text | |
| tachy_etalonnage_prochain | date | |
| statut | text | `disponible`, `en_mission`, `en_maintenance`, `hors_service` |
| numero_carte_grise / vin | text | |
| date_mise_en_circulation / date_achat | date | |
| cout_achat_ht | numeric(12,2) | |
| type_propriete | text | |
| garantie_expiration | date | |
| contrat_entretien | boolean | |
| prestataire_entretien / garage_entretien | text | |
| preferences / notes | text | |
| created_at / updated_at | timestamptz | |

### `remorques`
Remorques (tautliner, citerne, benne…).

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| company_id | integer | FK → `companies` |
| immatriculation | text | UNIQUE NOT NULL |
| type_remorque | text | défaut `tautliner` |
| marque | text | |
| charge_utile_kg | numeric(12,2) | |
| longueur_m | numeric(6,2) | |
| statut | text | `disponible`, `en_mission`, `en_maintenance`, `hors_service` |
| numero_carte_grise / vin | text | |
| date_mise_en_circulation / date_achat | date | |
| cout_achat_ht | numeric(12,2) | |
| type_propriete | text | |
| garantie_expiration / ct_expiration / assurance_expiration | date | |
| contrat_entretien | boolean | |
| prestataire_entretien / garage_entretien | text | |
| preferences / notes | text | |
| created_at / updated_at | timestamptz | |

### `affectations`
Liaison conducteur ↔ véhicule ↔ remorque.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| company_id | integer | FK → `companies` |
| conducteur_id | uuid | FK → `conducteurs` |
| vehicule_id | uuid | FK → `vehicules` (nullable) |
| remorque_id | uuid | FK → `remorques` (nullable) |
| type_affectation | text | `fixe`, `temporaire` |
| date_debut / date_fin | date | date_fin ≥ date_debut |
| actif | boolean | |
| notes | text | |
| created_at / updated_at | timestamptz | |

### `flotte_documents`
GED véhicules/remorques.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| vehicule_id | uuid | FK → `vehicules` (XOR remorque_id) |
| remorque_id | uuid | FK → `remorques` (XOR vehicule_id) |
| company_id | integer | FK → `companies` |
| category / title / file_name | text | |
| mime_type | text | |
| storage_bucket / storage_path | text | |
| issued_at / expires_at | date | |
| notes | text | |
| uploaded_by | uuid | FK → `auth.users` |
| archived_at | timestamptz | |
| created_at / updated_at | timestamptz | |

### `flotte_entretiens`
Historique de maintenance.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| vehicule_id | uuid | FK → `vehicules` (XOR remorque_id) |
| remorque_id | uuid | FK → `remorques` (XOR vehicule_id) |
| company_id | integer | FK → `companies` |
| maintenance_type | text | |
| service_date | date | |
| km_compteur | integer | |
| cout_ht / cout_ttc | numeric(12,2) | |
| covered_by_contract | boolean | |
| prestataire / garage | text | |
| next_due_date | date | |
| next_due_km | integer | |
| notes | text | |
| mecanicien_id | uuid | FK → `profils` |
| invoice_document_id | uuid | FK → `flotte_documents` |
| created_by | uuid | FK → `auth.users` |
| created_at / updated_at | timestamptz | |

### `flotte_equipements`
Équipements embarqués.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| vehicule_id | uuid | FK → `vehicules` (nullable) |
| remorque_id | uuid | FK → `remorques` (nullable) |
| company_id | integer | FK → `companies` |
| nom / category | text | |
| quantite | integer | |
| statut | text | `conforme`, `a_controler`, `hs` |
| notes | text | |
| created_at / updated_at | timestamptz | |

### `vehicule_releves_km` / `remorque_releves_km`
Relevés kilométriques.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| vehicule_id / remorque_id | uuid | FK |
| company_id | integer | FK → `companies` |
| reading_date | date | UNIQUE avec asset_id |
| km_compteur | integer | |
| source / notes | text | |
| created_by | uuid | FK → `auth.users` |
| created_at / updated_at | timestamptz | |

---

## 5. GMAO (Gestion Maintenance)

### `stock_pieces`
Pièces détachées en stock.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| reference | text | UNIQUE |
| designation | text | |
| categorie | text | `filtres`, `freinage`, `pneus`, `electricite`, `courroies`, `eclairage`, `lubrifiant`, `autre` |
| compatibilite | text | |
| stock_actuel / stock_minimum | integer | |
| prix_unitaire_ht | numeric(10,2) | |
| fournisseur_nom / emplacement | text | |
| created_at / updated_at | timestamptz | |

### `mouvements_stock`
Entrées/sorties de stock.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| piece_id | uuid | FK → `stock_pieces` |
| type_mouvement | text | `entree`, `sortie`, `inventaire` |
| quantite | integer | |
| ot_id | uuid | FK → `flotte_entretiens` |
| vehicule_id | uuid | FK → `vehicules` |
| prix_unitaire_ht | numeric(10,2) | |
| notes | text | |
| created_by | uuid | FK → `auth.users` |
| created_at | timestamptz | |

### `fournisseurs_maintenance`
Fournisseurs et garages.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| nom | text | UNIQUE |
| type_service | text | `garage`, `pneumatique`, `piece`, `carrosserie`, `electrique`, `lubrifiant`, `concessionnaire`, `autre` |
| contact_nom / telephone / email / adresse | text | |
| delai_livraison / conditions_paiement | text | |
| note_qualite | integer | 1-5 |
| contrat_actif | boolean | |
| notes | text | |
| created_at / updated_at | timestamptz | |

### `programmes_maintenance_constructeur`
Programmes d'entretien constructeur.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| marque / modele / motorisation | text | |
| type_entretien | text | |
| periodicite_km | integer | |
| periodicite_mois | integer | |
| huile_moteur_l / huile_boite_l / huile_pont_l / liquide_frein_l | numeric(5,1) | |
| pieces_reference / source_constructeur | text | |
| notes | text | |
| derniere_veille_mois | text | |
| created_at / updated_at | timestamptz | |

---

## 6. Transport — Ordres & Missions

### `ordres_transport`
Cœur métier : ordres de transport.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| company_id | integer | FK → `companies` |
| client_id | uuid | FK → `clients` |
| conducteur_id | uuid | FK → `conducteurs` (nullable) |
| vehicule_id | uuid | FK → `vehicules` (nullable) |
| remorque_id | uuid | FK → `remorques` (nullable) |
| reference | text | UNIQUE NOT NULL |
| numero_ot | text | |
| type_transport | text | `complet`, `partiel`, `groupage`, `express` |
| statut | text | `brouillon`, `planifie`, `en_cours`, `livre`, `facture`, `annule` |
| statut_operationnel | text | |
| date_chargement_prevue / date_livraison_prevue / date_livraison_reelle | date | |
| distance_km | integer | |
| nature_marchandise | text | |
| poids_kg / volume_m3 | numeric(12,2) | |
| nombre_colis | integer | |
| prix_ht | numeric(12,2) | |
| taux_tva | numeric(5,2) | |
| temperature_requise | text | |
| numero_cmr / numero_bl | text | |
| instructions / notes_internes | text | |
| groupage_id | uuid | (auto-référence groupage) |
| groupage_fige | boolean | |
| facturation_id | uuid | FK → `factures` |
| est_affretee | boolean | |
| created_at / updated_at | timestamptz | |

### `etapes_mission`
Étapes de chargement/livraison.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| ot_id | uuid | FK → `ordres_transport` |
| company_id | integer | FK → `companies` |
| ordre | integer | UNIQUE avec ot_id |
| type_etape | text | `chargement`, `livraison`, `passage` |
| adresse_id | uuid | FK → `adresses` |
| adresse_libre / ville / code_postal / pays | text | |
| contact_nom / contact_tel | text | |
| date_prevue / date_reelle | date | |
| instructions | text | |
| statut | text | `en_attente`, `en_cours`, `termine` |
| poids_kg | numeric(12,2) | |
| nombre_colis | integer | |
| reference_marchandise / notes | text | |
| created_at / updated_at | timestamptz | |

### `ot_lignes`
Lignes de détail OT (groupage multi-marchandise).

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| ot_id | uuid | FK → `ordres_transport` |
| company_id | integer | FK → `companies` |
| libelle | text | |
| poids_kg / metrage_ml | numeric(10,2) | |
| nombre_colis | integer | |
| notes | text | |
| created_at | timestamptz | |

### `historique_statuts`
Historique des transitions de statut OT.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| ot_id | uuid | FK → `ordres_transport` |
| company_id | integer | FK → `companies` |
| statut_ancien / statut_nouveau | text | |
| commentaire | text | |
| created_by | uuid | FK → `auth.users` |
| created_at | timestamptz | |

### `transport_missions`
Missions agrégées (groupage multi-OT).

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| type | text | `groupage`, `complet`, `partiel` |
| conducteur_id | uuid | FK → `conducteurs` |
| vehicule_id | uuid | FK → `vehicules` |
| remorque_id | uuid | FK → `remorques` |
| created_at / updated_at | timestamptz | |

### `transport_relais`
Relais conducteur/marchandise.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| ot_id | uuid | FK → `ordres_transport` |
| type_relais | text | `depot_marchandise`, `relais_conducteur` |
| site_id | uuid | FK → `sites_logistiques` |
| lieu_nom / lieu_adresse | text | |
| lieu_lat / lieu_lng | numeric(10,7) | |
| conducteur_depose_id / conducteur_reprise_id | uuid | FK → `conducteurs` |
| vehicule_depose_id / vehicule_reprise_id | uuid | FK → `vehicules` |
| remorque_depose_id / remorque_reprise_id | uuid | FK → `remorques` |
| date_depot | timestamptz | |
| date_reprise_prevue / date_reprise_reelle | timestamptz | |
| statut | text | `en_attente`, `assigne`, `en_cours_reprise`, `termine`, `annule` |
| notes | text | |
| created_by | uuid | FK → `auth.users` |
| created_at / updated_at | timestamptz | |

### `sites_logistiques`
Dépôts, plateformes, entrepôts.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| company_id | integer | FK → `companies` |
| nom / adresse / code_postal / ville / pays | text | |
| type_site | text | |
| usage_type | text | |
| latitude / longitude | numeric(10,7) | |
| capacite_vehicules / capacite_remorques | integer | |
| actif | boolean | |
| notes | text | |
| created_at / updated_at | timestamptz | |

### `course_templates`
Modèles de courses récurrentes.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| label | text | |
| type_transport / nature_marchandise | text | |
| chargement_site_id / livraison_site_id | uuid | FK → `sites_logistiques` |
| client_id | uuid | FK → `clients` |
| distance_km | numeric(10,2) | |
| duree_heures | numeric(5,2) | |
| notes | text | |
| created_at / updated_at | timestamptz | |

### `driver_groups` / `driver_group_members`
Groupes de conducteurs.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| nom / description / couleur | text | (driver_groups) |
| group_id | uuid | FK → `driver_groups` (members) |
| conducteur_id | uuid | FK → `conducteurs` (members) |
| created_at | timestamptz | |

### `ai_placement_constraints`
Contraintes de placement IA.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| vehicule_id | uuid | FK → `vehicules` |
| conducteur_id | uuid | FK → `conducteurs` |
| date_debut / date_fin | date | |
| retour_depot_avant | timestamptz | |
| depot_lat / depot_lng / position_ref_lat / position_ref_lng | numeric(10,7) | |
| rayon_km | integer | |
| statut | text | `active`, `traitee`, `annulee` |
| notes | text | |
| created_by | uuid | FK → `auth.users` |
| created_at / updated_at | timestamptz | |

---

## 7. Affrètement

### `affreteur_onboardings`
Demandes d'intégration d'un affréteur.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| owner_profile_id | uuid | FK → `profils` |
| company_name / siret / vat_number | text | |
| contact_email / contact_phone | text | |
| billing_address / operation_address | text | |
| commercial_review | text | `en_attente`, `valide`, `refuse` |
| comptable_review | text | `en_attente`, `valide`, `refuse` |
| status | text | `en_verification_commerciale`, `en_verification_comptable`, `validee`, `refusee` |
| rejection_reason / notes | text | |
| submitted_at / created_at / updated_at | timestamptz | |

### `affreteur_onboarding_history`
| id, onboarding_id (FK), event_at, actor_role, actor_name, message, created_by (FK → auth.users)

### `affreteur_employees`
| id, onboarding_id (FK), full_name, email, role (`gestionnaire`, `conducteur_affreteur`), permissions (text[]), active

### `affreteur_drivers`
| id, onboarding_id (FK), full_name, email, phone, license_number, active

### `affreteur_vehicles`
| id, onboarding_id (FK), plate, brand, model, capacity_kg, active

### `affreteur_equipments`
| id, onboarding_id (FK), label, kind, serial_number, active

### `affretement_contracts`
Contrats d'affrètement par OT.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| ot_id | uuid | FK → `ordres_transport` (UNIQUE) |
| onboarding_id | uuid | FK → `affreteur_onboardings` |
| status | text | `propose`, `accepte`, `refuse`, `en_cours`, `termine`, `annule` |
| proposed_at / decided_at | timestamptz | |
| proposed_by_role / proposed_by_name | text | |
| exploitation_note / affreteur_note | text | |
| assigned_driver_id | uuid | FK → `affreteur_drivers` |
| assigned_vehicle_id | uuid | FK → `affreteur_vehicles` |
| created_at / updated_at | timestamptz | |

### `affretement_contract_equipments`
| contract_id (FK), equipment_id (FK) — PK composite

### `affretement_contract_updates`
| id, contract_id (FK), status_key, event_at, note, gps_lat/gps_lng, created_by (FK)

### `affretement_contract_history`
| id, contract_id (FK), event_at, actor_role, actor_name, message, created_by (FK)

---

## 8. Comptabilité Générale

### `compta_journaux`
Journaux comptables.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| code_journal | text | UNIQUE (`AC`, `VT`, `BQ`, `CA`, `OD`) |
| libelle | text | |
| actif | boolean | |
| created_at / updated_at | timestamptz | |

### `compta_plan_comptable`
Plan comptable (PCG).

| Colonne | Type | Contraintes |
|---|---|---|
| code_compte | text | PK (ex: `411000`) |
| libelle | text | |
| classe | integer | 1-8 |
| actif | boolean | |
| created_at / updated_at | timestamptz | |

### `compta_pieces`
| id, type_piece (`facture_client`, `facture_fournisseur`, `od`, `banque`, `caisse`), numero_piece, date_piece, source_table, source_id

### `compta_ecritures`
Écritures comptables.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| journal_id | uuid | FK → `compta_journaux` |
| piece_id | uuid | FK → `compta_pieces` |
| date_ecriture | date | |
| exercice | integer | |
| numero_mouvement | integer | UNIQUE avec journal+exercice |
| libelle | text | |
| statut | text | `brouillon`, `validee`, `annulee` |
| valide_at | timestamptz | |
| created_by | uuid | FK → `auth.users` |
| created_at / updated_at | timestamptz | |

### `compta_ecriture_lignes`
Lignes débit/crédit.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| ecriture_id | uuid | FK → `compta_ecritures` |
| ordre | integer | |
| compte_code | text | FK → `compta_plan_comptable` |
| tiers_client_id | uuid | FK → `clients` |
| libelle_ligne | text | |
| debit / credit | numeric(14,2) | ≥ 0, jamais les 2 > 0 |
| devise | text | défaut `EUR` |
| axe_camion_id / axe_chauffeur_id / axe_tournee_id | uuid | axes analytiques |
| axe_client_id | uuid | FK → `clients` |
| axe_mission_id | uuid | FK → `ordres_transport` |
| created_at / updated_at | timestamptz | |

### `compta_tva_regles`
| id, code_tva (UNIQUE), taux, regime (`national`, `intracom`, `export`), compte_collectee/compte_deductible (FK → plan_comptable), actif

### `compta_tva_periodes`
| id, annee, periode_type (`mensuel`, `trimestriel`, `annuel`), periode_index, date_debut/date_fin, statut (`ouverte`, `cloturee`, `declaree`)

### `compta_tva_lignes`
| id, periode_id (FK), code_case, base_ht, montant_tva, origine

### `compta_audit_evenements`
Journal d'audit comptable (append-only, hashé).

| id, event_type, entity, entity_id, payload_json, actor_user_id (FK), hash_prev, hash_current, created_at

### `compta_fec_exports`
| id, exercice, date_export, checksum_sha256, chemin_fichier, genere_par (FK)

### `factures`
Factures clients.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| client_id | uuid | FK → `clients` |
| company_id | integer | FK → `companies` |
| ot_id | uuid | FK → `ordres_transport` |
| numero | text | UNIQUE |
| date_emission / date_echeance / date_paiement | date | |
| mode_paiement | text | |
| montant_ht / montant_tva / montant_ttc | numeric(12,2) | |
| taux_tva | numeric(5,2) | |
| statut | text | `brouillon`, `emise`, `payee`, `annulee` |
| notes | text | |
| created_at / updated_at | timestamptz | |

---

## 9. Comptabilité Transport (Lot B)

### `transport_tarifs_clients`
Barèmes tarifaires par client.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| client_id | uuid | FK → `clients` |
| libelle | text | |
| tarif_km | numeric(8,4) | |
| coeff_gazole | boolean | |
| peages_refactures | boolean | |
| forfait_minimum | numeric(10,2) | |
| actif | boolean | |
| date_debut / date_fin | date | |
| notes | text | |
| created_by | uuid | FK → `auth.users` |
| created_at / updated_at | timestamptz | |

### `transport_cnr_indices`
Indices CNR mensuels (gazole).

| Colonne | Type | Contraintes |
|---|---|---|
| annee | integer | |
| mois | integer | 1-12 |
| indice_gazole | numeric(8,4) | > 0 |
| indice_reference | numeric(8,4) | > 0 |

### `transport_missions_couts`
Coûts réels par mission.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| ot_id | uuid | FK → `ordres_transport` (UNIQUE) |
| km_reels | numeric(9,1) | |
| cout_carburant / cout_peages / cout_conducteur / cout_amortissement / cout_sous_traitance / cout_autres | numeric(10,2) | |
| prix_vente_ht | numeric(10,2) | |
| notes | text | |
| created_by | uuid | FK → `auth.users` |
| created_at / updated_at | timestamptz | |

### `mouvements_bancaires`
Relevés bancaires importés (CSV).

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| date_operation / date_valeur | date | |
| libelle | text | |
| montant / solde_apres | numeric(14,2) | |
| reference_banque | text | |
| compte_bancaire | text | |
| statut | text | `a_rapprocher`, `rapproche`, `ignore` |
| import_hash | text | UNIQUE |
| created_at | timestamptz | |

### `rapprochements_bancaires`
Lettrage bancaire.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| mouvement_bancaire_id | uuid | FK → `mouvements_bancaires` |
| facture_id | uuid | FK → `factures` |
| facture_fournisseur_id | uuid | FK → `compta_factures_fournisseurs` |
| ecriture_id | uuid | FK → `compta_ecritures` |
| montant_rapproche / ecart | numeric(14,2) | |
| mode | text | `auto`, `manuel` |
| commentaire | text | |
| created_by | uuid | FK → `auth.users` |
| created_at | timestamptz | |

### `relances_scenarios`
Scénarios de relance (paramétrage).

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| nom | text | |
| niveau | integer | 1-5 |
| delai_apres_echeance | integer | jours |
| type | text | `email` |
| sujet_template / corps_template | text | |
| actif | boolean | |
| created_at / updated_at | timestamptz | |

---

## 10. Paie Transport

### `payroll_config_annuel`
Configuration paie annuelle (taux sociaux).

| Colonne | Type | Contraintes |
|---|---|---|
| annee | integer | PK |
| pmss | numeric(10,2) | |
| smic_horaire | numeric(8,4) | |
| taux_maladie_sal / vieillesse_plaf_sal / … | numeric(6,4) | taux salariaux |
| taux_maladie_pat / vieillesse_plaf_pat / … | numeric(6,4) | taux patronaux |
| mutuelle_sal_mensuelle / mutuelle_pat_mensuelle | numeric(8,2) | |
| created_at / updated_at | timestamptz | |

### `bareme_indemnites_transport`
Barèmes d'indemnités réglementaires.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| annee | integer | |
| type_regime | text | `gr_petit_deplacement`, `gr_grand_routier`, `tp_repas_midi`, `tp_repas_soir`, `nuitee`, `repas_chantier` |
| libelle | text | |
| montant_max_exonere / montant_max_fiscal | numeric(8,2) | |
| source / note | text | |
| created_at | timestamptz | |

### `bulletins_paie`
Bulletins de paie complets.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| company_id | integer | FK → `companies` |
| conducteur_id | uuid | FK → `conducteurs` |
| employe_profil_id | uuid | FK → `profils` |
| periode_label | text | |
| periode_debut / periode_fin | date | |
| taux_horaire | numeric(8,4) | |
| base_mensuelle_heures | numeric(8,2) | |
| heures_travaillees / heures_absence / heures_sup_25 / heures_sup_50 / heures_nuit | numeric(8,2) | |
| jours_travailles | integer | |
| salaire_base_brut | numeric(10,2) | |
| … (primes, indemnités, cotisations, net) | numeric(10,2) | |
| statut | text | `brouillon`, `valide`, `envoye`, `archive` |
| source_heures | text | `manuel`, `tachygraphe`, `mixte` |
| document_url / document_nom | text | |
| genere_par / valide_par | uuid | FK → `auth.users` |
| valide_at | timestamptz | |
| created_at / updated_at | timestamptz | |

---

## 11. CE 561 / Réglementation

### `parametre_regle`
Seuils réglementaires CE 561.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| code_regle | text | UNIQUE |
| libelle | text | |
| valeur | numeric(10,2) | |
| unite | text | |
| type_controle | text | `bloquant`, `avertissement` |
| regle_source | text | |
| created_at / updated_at | timestamptz | |

### `tachygraphe_entrees`
Données tachygraphe.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| conducteur_id | uuid | FK → `conducteurs` |
| company_id | integer | FK → `companies` |
| type_activite | text | `conduite`, `travail`, `disponibilite`, `repos`, `autre` |
| date_debut / date_fin | timestamptz | |
| duree_minutes | integer | |
| source | text | |
| created_at | timestamptz | |

### `matrice_temps`
Temps de trajet inter-sites.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| site_origine_id / site_destination_id | uuid | FK → `sites_logistiques` |
| distance_km | numeric(10,2) | |
| duree_minutes | integer | |
| source_calcul | text | `osm_route`, `gmaps`, `manuel`, `historique` |
| validee | boolean | |
| notes | text | |
| created_at / updated_at | timestamptz | |

### `indisponibilite_planning`
Indisponibilités planifiées.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| type_ressource | text | `conducteur`, `vehicule`, `remorque` |
| ressource_id | uuid | |
| date_debut / date_fin | timestamptz | |
| type_indisponibilite | text | `maintenance`, `inspection`, `revision_fco`, `visite_controle`, `absence_non_rh`, `conge_temporaire`, `formation`, `autres` |
| motif | text | |
| createur_id | uuid | FK → `profils` |
| created_at / updated_at | timestamptz | |

### `infraction_tachy`
Infractions tachygraphe détectées.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| conducteur_id | uuid | FK → `conducteurs` |
| ot_id | uuid | FK → `ordres_transport` |
| date_infraction | date | |
| code_infraction | text | |
| libelle_infraction | text | |
| type_infraction | text | `conduite_continue`, `pause_insuffisante`, `conduite_journaliere`, `repos_journalier`, `repos_hebdo`, `jours_consecutifs`, `permis_invalide`, `fco_invalide`, `carte_invalide`, `adr_non_habilite`, `autres` |
| valeur_mesuree / seuil_reglementaire | numeric(10,2) | |
| unite | text | |
| severite | text | `legere`, `normale`, `grave`, `critique` |
| etat | text | `detectee`, `avertissable`, `force`, `resolue`, `abandonnee` |
| date_detection / date_resolution | timestamptz | |
| actions_correctrices | text | |
| validateur_id | uuid | FK → `profils` |
| created_at / updated_at | timestamptz | |

---

## 12. Tchat / Communication

### `tchat_conversations`
| id (uuid PK), created_at, updated_at

### `tchat_participants`
| id (PK), conversation_id (FK → tchat_conversations), profil_id (FK → profils), created_at

### `tchat_messages`
| id (PK), conversation_id (FK → tchat_conversations), sender_id (FK → profils), content (text), created_at, read_at

---

## 13. Services & Exploitation

### `services`
| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| company_id | integer | FK → `companies` |
| name / code | text | |
| description | text | |
| color / visual_marker | text | |
| parent_service_id | uuid | FK → `services` (arborescent) |
| is_active | boolean | |
| created_at / updated_at / archived_at | timestamptz | |

### `exploitants`
| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| company_id | integer | FK → `companies` |
| service_id | uuid | FK → `services` |
| profil_id | uuid | FK → `profils` |
| name | text | |
| type_exploitant | text | `individual`, `team`, `virtual` |
| company_department | text | |
| is_manager | boolean | |
| manager_level | integer | 1-3 |
| is_active | boolean | |
| created_at / updated_at / archived_at | timestamptz | |

### `affectations_audit`
| id, affectation_id (FK), company_id (FK), changed_by (FK → profils), operation (`created`, `updated`, `ended_early`, `transferred`), motif, old/new_exploitant_responsable_id (FK → exploitants), old/new_date_fin, changes_json (jsonb)

### `course_transfers`
Transferts de courses inter-exploitants.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK |
| company_id | integer | FK → `companies` |
| ot_id | uuid | FK → `ordres_transport` |
| from_exploitant_id / to_exploitant_id | uuid | FK → `exploitants` |
| requested_by / validated_by | uuid | FK → `profils` |
| motif / notes | text | |
| status | text | `pending`, `approved`, `executed`, `rejected` |
| needs_approval | boolean | |
| conductor_transfer / equipment_transfer | boolean | |
| created_at / updated_at / approved_at / executed_at | timestamptz | |

---

## 14. Objectifs, Bonus & KPI

### `objectives`
| id, company_id (FK), name, category (`revenue`, `margin`, `performance`, `safety`, `efficiency`, `sustainability`), metric_code, scope_type, period_type, target_value, target_unit, weight, is_active, usable_in_bonus

### `bonus_schemes`
| id, company_id (FK), name, scheme_type (`individual`, `team`, `service`, `mixed`), period_start/end, simulation_mode, is_locked

### `bonus_scheme_rules`
| id, scheme_id (FK → bonus_schemes), objective_id (FK → objectives), weight, minimum_threshold_pct, paliers (jsonb), formula_type (`paliers`, `percentage`, `linear`)

### `bonus_calculations`
| id, scheme_id (FK), profil_id (FK), exploitant_id (FK), period_key, total_calculated_bonus, is_validated, is_paid, payment_reference

### `kpi_definitions`
| id, company_id (FK), code, name, category (`financial`, `operational`, `commercial`, `safety`, `rh`), scope_type, formula_type (`sum`, `avg`, `ratio`, `custom`, `sql_query`), unit, is_active

### `kpi_snapshots`
| id, kpi_id (FK), scope_type, scope_ref_id, period_key, metric_value, unit, is_complete, calculated_at

### `kpi_alerts`
| id, kpi_id (FK), alert_type (`threshold_exceeded`, `threshold_below`, `trend_down`, `trend_up`), severity (`info`, `warning`, `critical`), is_acknowledged

---

## 15. Entretiens RH Avancés

### `interview_types`
| id, company_id (FK), code, name, category (9 valeurs), is_mandatory, frequency_months, default_outline (jsonb), access_roles (text[]), is_active

### `interview_document_templates`
| id, company_id (FK), interview_type_id (FK), document_type (9 valeurs), name, version, template_format, body_template, variables_schema (jsonb)

### `interviews`
| id, company_id (FK), interview_type_id (FK), employee_profile_id / manager_profile_id / hr_profile_id (FK → profils), planned_at, status (13 valeurs), priority, reason, summary, decisions, confidentiality_level, report_status

### `interview_participants`
| id, interview_id (FK), profile_id (FK → profils), participant_role, required, present, signature_required

### `interview_status_history`
| id, interview_id (FK), previous_status, new_status, changed_by (FK → profils)

### `interview_notes`
| id, interview_id (FK), note_type, content, visibility, created_by (FK → profils)

### `interview_reports`
| id, interview_id (FK), structured_content (jsonb), summary, decisions, status, version, validated_by (FK → profils)

### `interview_actions`
| id, interview_id (FK), employee_profile_id / responsible_profile_id (FK → profils), title, due_date, status, priority

### `interview_objectives`
| id, interview_id (FK), objective_id (FK → objectives), target/achieved/threshold snapshots, manager/employee_comment

### `interview_alerts`
| id, interview_id (FK), employee_profile_id (FK), alert_type (8 valeurs), severity, due_at, resolved_at

---

## 16. Coffre-Fort Salarié

### `employee_directory`
| id, company_id (FK), profil_id (FK → profils), conducteur_id (FK → conducteurs), matricule, first/last_name, professional/personal_email, employment_status, hire_date, departure_at

### `internal_user_accounts`
| id, employee_id (FK → employee_directory), profil_id (FK → profils), auth_user_id (FK → auth.users), role, is_active

### `employee_vault_accounts`
| id, employee_id (FK), company_id (FK), auth_user_id (FK), internal_account_id (FK), personal_email, status (`invited`, `active`, `locked`, `archived`), keep_access_after_departure

### `document_visibility_policies`
| id, company_id (FK), policy_key, document_type, visible_during_contract, visible_after_departure, allow_download, retention_days, require_acknowledgement/signature, is_sensitive

### `employee_vault_documents`
| id, company_id (FK), employee_id (FK → employee_directory), policy_id (FK), document_type, title, file_name, storage_path, origin_source, visibility_override_after_departure, issued_at, expires_at, current_version_no

### `employee_vault_document_versions`
| id, document_id (FK), version_no, file_name, size_bytes, hash_sha256, storage_path, change_reason

### `employee_vault_access_logs`
| id (bigserial), document_id (FK), employee_id (FK), vault_account_id (FK), action (8 valeurs), ip_hash, user_agent, metadata (jsonb)

### `employee_vault_exit_workflows`
| id, employee_id (FK), status (`draft`, `scheduled`, `executed`, `cancelled`), planned_exit_at, keep_vault_access, vault_access_expires_at, checklist (jsonb)

### `employee_document_exports`
| id, employee_id (FK), scope (`full`, `visible_only`, `by_type`, `by_period`), status (`requested`, `processing`, `ready`, `expired`, `failed`), filters (jsonb), file_name, storage_path

### `employee_document_consents`
| id, document_id (FK), vault_account_id (FK), consent_type (`acknowledgement`, `signature`, `consent`), status (`pending`, `accepted`, `rejected`, `revoked`), signed_at, ip_hash

---

## 17. ETA / Scoring / Cockpit Décision

### `eta_predictions`
| id, company_id (FK), ot_id (FK → ordres_transport), affectation_id (FK), prediction_scope, source_event, distance_km, predicted_duration_minutes, optimistic/predicted/pessimistic_eta, confidence_pct, risk_level (`ok`, `a_surveiller`, `critique`), trace_json, explanation_json

### `eta_history`
| id, eta_prediction_id (FK), ot_id (FK), previous/next_predicted_eta, delta_minutes, drift_reason, snapshot_json

### `job_scores`
| id, company_id (FK), ot_id (FK), global_score (0-100), recommendation (`accepter`, `a_optimiser`, `risque`, `a_refuser`), color (`vert`, `orange`, `rouge`), estimated_revenue/cost/margin, weights_json, explanation_json

### `scoring_details`
| id, job_score_id (FK), axis (`rentabilite`, `faisabilite`, `impact_operationnel`, `qualite_client`, `complexite`), axis_score, axis_weight, detail_json

### `constraint_logs`
| id, company_id (FK), ot_id (FK), engine_name, constraint_type, constraint_code, severity, impact_minutes, impact_score, detail_json

---

## 18. Divers & Intégration API

### `tasks`
| id, user_id (FK → profils), company_id (FK), title, notes, completed, due_date, priority, created_at/updated_at

### `rapports_conducteurs`
| id, conducteur_id (FK), company_id (FK), type (releve_infraction, attestation_activite), periode_debut/fin, contenu (jsonb), statut (genere, envoye, signe)

### `erp_audit_logs`
| id, company_id (FK), module_code, schema_name, table_name, record_id, action (`insert`, `update`, `delete`), actor_user_id (FK → auth.users), actor_role, changed_fields (text[]), change_summary (jsonb), occurred_at

### Module d'intégration (erp_v11)
- `erp_v11_modules` — Modules activés par tenant
- `erp_v11_providers` — Fournisseurs API (tracking, tachy, routing…)
- `erp_v11_api_mappings` — Mappings entrant/sortant
- `erp_v11_cache` — Cache clé/valeur avec TTL
- `erp_v11_api_logs` — Logs d'appels API

---

## 19. Schéma `core` (compte client dédié)

Schéma multi-organisation isolé pour comptes clients dédiés.

| Table | Description |
|---|---|
| `core.comptes_erp` | Comptes ERP clients |
| `core.partenaires` | Partenaires du compte |
| `core.roles_compte` | Rôles par compte |
| `core.utilisateurs_compte` | Utilisateurs par compte |
| `core.ordres_transport` | Ordres de transport |
| `core.vehicules` | Véhicules du compte |
| `core.conducteurs` | Conducteurs du compte |
| `core.remorques` | Remorques du compte |
| `core.adresses` | Sites logistiques |
| `core.equipements` | Équipements |
| `core.maintenance_history` | Historique maintenance |
| `core.amendes` | Infractions/amendes |
| `core.fiches_paie` | Bulletins de paie |
| `core.documents_rh` | Documents RH |
| `core.prospects` | Leads CRM |
| `core.prospect_interactions` | Interactions prospects |
| `core.planning_ot` | Planning OT |
| `core.messages` | Messages internes |

---

## 20. Schémas auxiliaires

| Table | Schéma | Description |
|---|---|---|
| `docs.documents` | docs | GED transport |
| `docs.documents_versions` | docs | Versions documents |
| `rt.evenements_transport` | rt | Événements temps-réel |
| `rt.notifications` | rt | Notifications utilisateur |
| `audit.journal_actions` | audit | Journal d'audit complet |
| `backup.snapshots` | backup | Snapshots annuels |

---

## Vues principales

| Vue | Description |
|---|---|
| `vue_conducteur_alertes` | Alertes expirations conducteurs |
| `vue_alertes_flotte` | Alertes expirations véhicules/remorques |
| `vue_couts_flotte_mensuels` | Coûts maintenance mensuels |
| `vue_cout_kilometrique_vehicules` | Coût au km par véhicule |
| `vue_societe_mere` | Infos société mère (depuis config) |
| `vue_documents_metier` | Documents métier agrégés |

---

## Diagramme des relations principales

```
companies ──┬── profils ── auth.users
            ├── clients ──── contacts
            │              ├── adresses
            │              ├── factures
            │              └── transport_tarifs_clients
            ├── conducteurs ── conducteur_documents
            │               ├── conducteur_evenements_rh
            │               ├── journee_travail
            │               └── tachygraphe_entrees
            ├── vehicules ──── flotte_documents
            │               ├── flotte_entretiens
            │               ├── flotte_equipements
            │               └── vehicule_releves_km
            ├── remorques ──── (même structure que véhicules)
            │
            ├── ordres_transport ── etapes_mission
            │                    ├── historique_statuts
            │                    ├── transport_relais
            │                    ├── ot_lignes
            │                    ├── transport_missions_couts
            │                    ├── affretement_contracts
            │                    ├── eta_predictions
            │                    └── job_scores
            │
            ├── affectations ── conducteurs + vehicules + remorques
            │
            ├── prospects ── contacts_prospects
            │             ├── devis_transport
            │             ├── actions_commerciales
            │             └── relances_commerciales
            │
            ├── compta_journaux ── compta_ecritures ── compta_ecriture_lignes
            │                                        └── compta_plan_comptable
            │
            ├── employee_directory ── employee_vault_accounts
            │                      └── employee_vault_documents
            │
            ├── services ── exploitants
            │             └── course_transfers
            │
            ├── interviews ── interview_participants
            │              ├── interview_notes / reports / actions
            │              └── interview_objectives ── objectives
            │
            └── kpi_definitions ── kpi_snapshots
                               └── kpi_alerts
```

---

> **Note** : Ce document est généré à partir des 120 migrations SQL du dossier `supabase/migrations/`. Les colonnes additionnelles ajoutées par les migrations successives sont consolidées dans chaque table.
