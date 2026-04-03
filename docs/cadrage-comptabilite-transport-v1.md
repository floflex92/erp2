# Cadrage Comptabilite Transport v1

Date: 2026-04-02
Perimetre: serv dev (local)
Langue: francais uniquement

## 1. Objectif

Mettre en place un module comptable conforme aux obligations francaises (minimum legal) et adapte aux besoins metier du transport.

Le cadrage suit 3 niveaux de priorite:
- Niveau 1: legal et operationnel indispensable (go/no-go)
- Niveau 2: pilotage transport a forte valeur
- Niveau 3: acceleration et automatisation

## 2. Etat actuel (constat rapide)

Base existante identifiee:
- Facturation client deja presente dans l application
- Donnees facture deja stockees (table factures)
- Calculs TVA partiels (ecran) et tableaux de suivi

Ecarts majeurs a combler:
- Pas de comptabilite generale en partie double persistante (journaux/ecritures/lignes)
- Pas de production FEC
- Pas de mecanisme d inalterabilite verifiable des ecritures
- Pas de module de rapprochement bancaire structure
- Pas de moteur TVA declaratif CA3/CA12 complet
- Pas de comptabilite analytique structuree par camion/chauffeur/tournee/client

## 3. Cible fonctionnelle (13 blocs)

### 3.1 Niveau 1 - Obligatoire (minimum legal + operationnel)

1) Comptabilite generale
- Saisie ecritures achats/ventes/OD
- Plan comptable (PCG FR)
- Journaux (banque, caisse, achats, ventes, OD)
- Balance + grand livre
- Bilan + compte de resultat

2) TVA
- TVA collectee / deductible
- Multi-taux (national, intra, export)
- Preparation declarations CA3 / CA12

3) Factures clients/fournisseurs
- Facturation client conforme
- Enregistrement factures fournisseurs
- Numerotation continue conforme anti-fraude

4) Rapprochement bancaire
- Import releves (CSV puis CAMT.053 ensuite)
- Lettrage automatique propose + manuel

5) Archivage legal
- Export FEC sur periode
- Historique non modifiable (append-only + traces)

### 3.2 Niveau 2 - Tres important transport

6) Analytique transport (crucial)
- Axes: camion, chauffeur, tournee, client, mission

7) Suivi des couts transport
- Carburant, peages, entretien, location/credit

8) Gestion flotte
- Amortissements
- Echeances controle technique/maintenance

9) Sous-traitance
- Factures transporteurs externes
- Marge par mission/ordre de transport

10) Reglements clients
- Relances automatiques
- Suivi des impayes et litiges

### 3.3 Niveau 3 - Utile (acceleration)

11) Connexion TMS
- Import tournees
- Facturation automatique

12) Tableaux de bord
- Marge par client
- Rentabilite par camion
- Cout/km

13) Automatisation
- OCR factures fournisseurs
- Rapprochement intelligent
- Lettrage assiste

## 4. Modele de donnees cible (v1)

## 4.1 Referentiels
- compta_plan_comptable
  - code_compte (PK), libelle, classe, actif
- compta_journaux
  - id, code_journal (AC, VT, BQ, CA, OD), libelle, actif
- compta_tva_regles
  - id, code_tva, taux, regime (national/intracom/export), compte_collectee, compte_deductible

## 4.2 Ecritures et pieces
- compta_pieces
  - id, type_piece (facture_client/facture_fournisseur/od/bank), numero_piece, date_piece, source_table, source_id
- compta_ecritures
  - id, journal_id, date_ecriture, numero_mouvement, libelle, piece_id, statut, created_at
- compta_ecriture_lignes
  - id, ecriture_id, compte_code, tiers_id, libelle_ligne, debit, credit, devise, axe_camion_id, axe_chauffeur_id, axe_tournee_id, axe_client_id, axe_mission_id

Regles:
- Somme debit = somme credit par ecriture
- Interdiction update/delete des lignes validees (append-only)
- Correction par contre-ecriture uniquement

## 4.3 TVA declarative
- compta_tva_periodes
  - id, annee, periode_type (mensuel/trimestriel/annuel), periode_index, date_debut, date_fin, statut
- compta_tva_lignes
  - id, periode_id, code_case, base_ht, montant_tva, origine

## 4.4 Banque et lettrage
- compta_banque_releves
  - id, compte_bancaire_id, date_operation, libelle_banque, montant, reference_banque, hash_ligne
- compta_lettrage
  - id, ecriture_ligne_id, releve_id, montant_lettré, mode (auto/manuel), score, created_at

## 4.5 Archivage, audit et FEC
- compta_audit_evenements
  - id, event_type, entity, entity_id, payload_json, actor_id, created_at, hash_prev, hash_current
- compta_fec_exports
  - id, exercice, date_export, checksum_sha256, chemin_fichier, genere_par

Objectif anti-fraude:
- chainage hash des evenements (hash_prev/hash_current)
- suppression logique interdite sur ecritures validees
- export FEC reproductible

## 5. Mapping besoin -> livrable

1. Comptabilite generale
- Livrable: journaux + ecritures + lignes + balance + grand livre

2. TVA
- Livrable: moteur de calcul + pre-remplissage CA3/CA12

3. Factures
- Livrable: numerotation conforme + lien ecriture automatique vente/achat

4. Rapprochement
- Livrable: import CSV + propositions lettrage + validation manuelle

5. Archivage legal
- Livrable: export FEC + journal inalterable

6 a 10. Transport
- Livrable: axes analytiques + couts + amortissements + sous-traitance + recouvrement

11 a 13. Acceleration
- Livrable: connecteurs + dashboards + OCR/auto-match

## 6. Roadmap implementation (lots)

### Lot A - Conformite legale minimale (priorite immediate)
- Schema comptable v1 (journaux/ecritures/lignes/plan comptable)
- Ecriture automatique depuis facture client/fournisseur
- Balance + grand livre
- TVA collectee/deductible multi-taux
- Export FEC v1
- Garde-fous anti-modification

Critere de sortie Lot A:
- Ecritures en partie double valides
- Balance equilibree
- FEC exportable sur exercice
- Journal inalterable active

### Lot B - Tresorerie et rapprochement
- Import releves bancaires CSV
- Lettrage assiste + manuel
- Ecran ecarts non rapproches

Critere de sortie Lot B:
- >= 80% des mouvements standards proposes en auto-match
- Validation manuelle des exceptions

### Lot C - Analytique transport
- Axes analytiques obligatoires sur ecritures de couts/produits
- Marges mission/tournee/client
- Cout/km et rentabilite camion

Critere de sortie Lot C:
- Vision marge nette par mission et par camion disponible

### Lot D - Sous-traitance, recouvrement, automatisations
- Factures transporteurs externes + marge mission
- Relances automatiques impayes
- OCR fournisseurs (v1)

Critere de sortie Lot D:
- Pipeline recouvrement et sous-traitance operationnel

## 7. Regles de gestion critiques

- Numerotation facture: sequence continue, unique, horodatee
- Ecriture comptable: aucune validation si debit != credit
- Cloture periode: interdit les modifications directes, correction par OD
- TVA intra/export: gestion explicite des regimes et justificatifs
- FEC: format conforme DGFiP, export par exercice

## 8. Risques et points d attention

- Risque legal si inalterabilite incomplète
- Risque operationnel si rapprochement absent (vision tresorerie faussee)
- Risque metier si analytique non imposee sur les ecritures transport

## 9. Prochaine etape recommandee

Demarrer le Lot A avec une migration Supabase dediee:
- creation tables comptables coeur
- contraintes d equilibre
- policies RLS strictes
- fonctions SQL de validation/posting

Ensuite brancher un premier ecran "Journal + Grand livre" sur les tables nouvelles.
