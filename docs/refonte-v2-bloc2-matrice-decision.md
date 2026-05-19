# Refonte V2 - Bloc 2 Renforce

Date: 2026-04-15
Objectif: matrice operationnelle table par table pour piloter Keep / Merge / Split / Rename / Deprecate, avec risques et strategie de migration.

## Legende

- Action: KEEP, MERGE, SPLIT, RENAME, DEPRECATE
- Complexite migration: L / M / H
- Risque regression: L / M / H
- Double ecriture: Oui / Non
- Priorite: P1 (critique), P2 (haute), P3 (moyenne)

## 1) Identite

| Table source | Action | Cible V2 | Probleme actuel | Benefice cible | Complexite | Risque | Double ecriture | Priorite |
|---|---|---|---|---|---|---|---|---|
| profils | KEEP + SPLIT | persons + person_profiles + internal_user_accounts | Donnees humaines melangees avec auth/roles | Separation nette identite humaine vs compte applicatif | H | H | Oui | P1 |
| conducteurs | KEEP + SPLIT | persons + person_driver_details | Duplication nom/prenom/email/matricule | Referentiel humain unique, specialisation transport propre | H | H | Oui | P1 |
| employee_directory | KEEP + MERGE partiel | persons + person_employment | Recouvrement fort avec profils/conducteurs | Cohesion RH et suppression incoherences | H | H | Oui | P1 |
| internal_user_accounts | KEEP + RENAME | person_internal_accounts | Bonne base mais trop liee a employee_directory | Aligne avec pivot persons | M | M | Oui | P1 |
| roles | KEEP | roles (scope stabilise) | Derive possible entre role legacy et role tenant | Gouvernance role unique et claire | M | M | Non | P1 |
| user_roles | DEPRECATE progressive | tenant_user_roles | Coexistence modeles role legacy / tenant | Un seul modele de role multi-tenant | M | M | Oui | P1 |
| tenant_users | KEEP | tenant_users | Nouveau modele encore en transition | Base standard SaaS multi-tenant | M | M | Oui | P1 |
| tenant_user_roles | KEEP | tenant_user_roles | Besoin d alignement complet avec policies | RBAC coherent par tenant | M | M | Oui | P1 |

## 2) CRM

| Table source | Action | Cible V2 | Probleme actuel | Benefice cible | Complexite | Risque | Double ecriture | Priorite |
|---|---|---|---|---|---|---|---|---|
| clients | KEEP + RENAME logique | crm_accounts | Table large et heterogene | Clarifie compte client vs contact/site | M | M | Non | P2 |
| contacts | KEEP + RENAME logique | crm_contacts | Bonne table mais nomenclature fragmentee | Alignement domaine CRM | L | L | Non | P2 |
| adresses | MERGE partiel | crm_sites + logistic_sites | Recouvrement avec sites_logistiques | Modele unique de sites avec usages differencies | M | M | Oui | P2 |
| prospects | KEEP | crm_leads | Enum statuts en texte/check | Parametrage pipeline et i18n | M | M | Non | P2 |
| contacts_prospects | KEEP | crm_lead_contacts | Correct mais non harmonise nommage | Cohesion CRM | L | L | Non | P2 |
| devis_transport | KEEP + normalisation | crm_quotes | Numerotation et statuts a normaliser tenant | Robustesse commerciale + reporting | M | M | Non | P2 |
| actions_commerciales | KEEP | crm_activities | Vocabulaire metier hardcode | Pilotage via referentiels | M | L | Non | P2 |
| relances_commerciales | KEEP | crm_followups | Priorite/statut en texte | Automatisation relances et qualite data | M | L | Non | P2 |

## 3) Operation transport

| Table source | Action | Cible V2 | Probleme actuel | Benefice cible | Complexite | Risque | Double ecriture | Priorite |
|---|---|---|---|---|---|---|---|---|
| ordres_transport | KEEP + refactor | transport_orders | Coeur metier charge, references heterogenes | Noyau operationnel stabilise | H | H | Oui | P1 |
| etapes_mission | KEEP + RENAME logique | transport_stops | Bonne granularite mais couplage legacy adresses | Parcours OT plus coherent | M | M | Oui | P1 |
| transport_missions | KEEP + extension | transport_missions | mission_id recent, modele encore incomplet | Groupage/mission robuste | M | M | Oui | P1 |
| transport_relais | KEEP | transport_relays | Multiples FK ressources legacy | Relais aligne avec persons/assets | H | H | Oui | P1 |
| ordres_transport_statut_history | KEEP + MERGE partiel | transport_status_history + entity_history | Double historique avec historique_statuts | Historique unifie + lecture metier conservee | M | M | Oui | P2 |
| historique_statuts | DEPRECATE progressive | transport_status_history | Redondance fonctionnelle | Simplifie requetage et maintenance | M | M | Oui | P2 |
| affectations | MERGE | asset_assignments | Pattern vehicule/remorque XOR | Affectation generique personne/asset | H | H | Oui | P1 |
| affectations_audit | MERGE | entity_history + assignment_events | Historique specifique disperse | Audit uniforme | M | M | Oui | P2 |
| course_transfers | KEEP | course_transfers | Coherence inter-services a renforcer | Flux exploitation lisible | M | M | Non | P2 |

## 4) Ressources / flotte / affretement

| Table source | Action | Cible V2 | Probleme actuel | Benefice cible | Complexite | Risque | Double ecriture | Priorite |
|---|---|---|---|---|---|---|---|---|
| vehicules | MERGE | assets + asset_vehicle_details | Duplication structurelle avec remorques | Super-entite asset evolutive | H | H | Oui | P1 |
| remorques | MERGE | assets + asset_trailer_details | Duplication structurelle avec vehicules | Meme pipeline de gestion asset | H | H | Oui | P1 |
| vehicule_releves_km | MERGE | asset_km_readings | Double table km vehicule/remorque | Analyse flotte unifiee | M | M | Oui | P1 |
| remorque_releves_km | MERGE | asset_km_readings | Double table km vehicule/remorque | Comparabilite et maintenance simplifiees | M | M | Oui | P1 |
| flotte_documents | MERGE | documents + document_links | GED flotte en silo | GED transverse | M | M | Oui | P2 |
| flotte_entretiens | MERGE | asset_maintenance_events | XOR vehicule/remorque repete | Maintenance uniforme | M | M | Oui | P2 |
| entretiens (legacy) | DEPRECATE | asset_maintenance_events | Table legacy doublon | Reduction dette technique | M | L | Oui | P3 |
| maintenance_events | KEEP + extension | asset_maintenance_events | Bon debut mais pas encore pivot asset | Continuite migration GMAO | M | M | Oui | P2 |
| affreteur_onboardings | KEEP | subcontractors | Correct mais isolation du modele affrete | Unifie sous owner_kind | M | M | Non | P2 |
| affreteur_vehicles | MERGE | assets (ownership_type=subcontracted) | Silo vehicules affretes | Un seul modele asset | H | H | Oui | P1 |
| affreteur_drivers | MERGE partiel | persons + person_subcontractor_links | Identite externe en silo | Vision personne transverse | H | H | Oui | P1 |
| affretement_contracts | KEEP | affretement_contracts | Solide, mais references legacy ressources | Contrats relies aux pivots persons/assets | M | M | Oui | P2 |

## 5) Support (GED, audit, historique)

| Table source | Action | Cible V2 | Probleme actuel | Benefice cible | Complexite | Risque | Double ecriture | Priorite |
|---|---|---|---|---|---|---|---|---|
| documents (OT legacy) | KEEP + extension | documents | Portee trop OT centrique | Moteur documentaire transverse | M | M | Oui | P2 |
| document_links | KEEP + extension | document_links | Entity types limites | Liens documentaires generiques | M | L | Non | P2 |
| employee_vault_documents | MERGE modulaire | documents (scope employee_vault) | GED coffre en silo | Gouvernance documentaire unique | H | H | Oui | P1 |
| employee_vault_document_versions | MERGE | document_versions | Versioning parallele | Standardisation versions | H | H | Oui | P1 |
| conducteur_documents | MERGE | documents + links | Redondance GED RH | Dossier salarie unifie | M | M | Oui | P2 |
| employee_vault_access_logs | KEEP + RENAME logique | document_access_logs | Logs limites au coffre | Audit acces transverse | M | M | Oui | P2 |
| employee_document_consents | KEEP + RENAME logique | document_consents | Portee coffre uniquement | Consentements documentaires unifies | M | M | Oui | P2 |
| document_visibility_policies | KEEP + extension | document_visibility_policies | Bon socle, couverture partielle | Politiques d acces unifiees | M | L | Non | P2 |
| erp_audit_logs | KEEP | erp_audit_logs | Audit technique bon mais perimetre incomplet | Journal transverse de reference | M | L | Non | P1 |
| compta_audit_evenements | KEEP specialise + pont | compta_audit_evenements + entity_history | Audit compta specialise isole | Conformite compta preservee + socle commun | M | M | Non | P2 |
| interview_status_history | KEEP specialise + pont | interview_status_history + entity_history | Historique RH specialise | Lecture metier RH preservee | M | L | Non | P2 |

## 6) Finance

| Table source | Action | Cible V2 | Probleme actuel | Benefice cible | Complexite | Risque | Double ecriture | Priorite |
|---|---|---|---|---|---|---|---|---|
| factures | KEEP + durcissement | finance_invoices | Cle metier a securiser tenant | Anti-collision + robustesse legale | M | H | Non | P1 |
| devis_transport | KEEP + durcissement | crm_quotes | Numero a securiser tenant | Fiabilite commerciale | M | M | Non | P1 |
| compta_pieces | KEEP | finance_documents | Bon socle, alignement numerotation necessaire | Coherence piece/ecriture/facture | M | M | Non | P2 |
| compta_ecritures | KEEP | finance_entries | Correct mais dependances fortes | Stabilite comptable | M | H | Non | P1 |
| compta_ecriture_lignes | KEEP | finance_entry_lines | Correct | Precision comptable maintenue | L | M | Non | P1 |
| compta_tva_periodes / lignes / regles | KEEP | finance_tax_* | Bonne structure | Conformite TVA | L | M | Non | P1 |
| bulletins_paie | KEEP + liaison person_id | payroll_slips | Lien conducteur/profil heterogene | Paie unifiee sur pivot personne | M | H | Oui | P2 |

## Decisions transverses obligatoires (Bloc 2)

1. Ne rien supprimer en phase 1: uniquement additif + sync.
2. Toute table P1 avec action MERGE/SPLIT exige:
   - mapping id legacy -> id pivot
   - double ecriture temporaire
   - tests de non regression module.
3. RLS: conserver company_id sur entites racines, historiques, journaux, et tables a lecture frequente pour eviter des policies trop couteuses en jointures.
4. Unicite metier par tenant a generaliser:
   - ordres_transport: unique(company_id, reference)
   - factures: unique(company_id, numero)
   - devis_transport: unique(company_id, numero)
   - profils/persons: unique(company_id, matricule)
   - assets: unique(company_id, registration) quand non null.

## Perimetre no-go phase 1 (a figer)

1. Pas de rework profond des tables comptables de base (compta_ecritures, compta_lignes) avant stabilisation identite/assets.
2. Pas de suppression des historiques specialises (interview_status_history, compta_audit_evenements) avant mise en service entity_history.
3. Pas de bascule full GED employee_vault sans simulation complete des droits post-depart.

## Definition of Done - Bloc 2

1. Matrice validee metier + technique pour toutes tables critiques P1/P2.
2. Owners et ordre d execution assignes par chantier.
3. Liste de migrations fondation pretes pour Bloc 5:
   - persons foundation
   - assets foundation
   - refs + unicites tenant
   - entity_history foundation
   - documents v2 foundation
