# Analyse du prompt transport - 2026-03-30

## Perimetre
- Source analysee: document `PROMPT_Planning_Transport_Marchandises.docx`
- Objectif: audit de l ERP actuel, comparaison au modele cible CE 561/2006, plan de migration, proposition de generation de code et plan de tests.

## Phase 1 - Audit du code existant

### 1) Stack technique
- Frontend: React 19 + TypeScript + Vite
- Data access: Supabase JS (client direct depuis pages et libs)
- Base: PostgreSQL (schema Supabase + migrations SQL)
- Tests: Vitest (present, peu de couverture metier planning/CE 561)

### 2) Entites / tables existantes pertinentes
- Coeur transport:
  - `conducteurs`
  - `vehicules`
  - `remorques`
  - `clients`
  - `ordres_transport`
  - `etapes_mission`
  - `historique_statuts`
  - `affectations`
- Complement transport:
  - `sites_logistiques`
  - `ordres_transport_statut_history`
  - `tachygraphe_entrees`
  - `maintenance_events` / `entretiens` (legacy)

### 3) Validations/regles deja en place
- Statuts transport encadres (checks SQL sur `statut_transport`).
- Validations UI/metier de base sur planning (drag/drop, conflits horaires visuels, fallback schema date/timestamp).
- Tachygraphe: donnees et ecran d infractions, mais pas de moteur CE 561 centralise persistant avec regles parametrables.

### 4) Patterns de code
- Pattern dominant: composants page riches + services utilitaires `src/lib/*`.
- Melange de logique UI et metier dans certaines pages critiques (ex: planning).
- Pas de service unique de validation reglementaire transversale (API + UI).

### 5) Conventions
- SQL: snake_case.
- TypeScript/React: camelCase + types explicites.
- Noms metier: plutot francais en UI, technique mixte fr/en en code.

## Phase 2 - Comparaison avec le modele cible

| Table cible prompt | Etat | Mapping actuel | Ecart principal |
|---|---|---|---|
| CHAUFFEUR | PARTIEL | `conducteurs` | manque ADR explicite, centre/depot structure, normalisation validites cible |
| CAMION | PARTIEL | `vehicules` | manque certains enums cibles, centre_id, classes normalisees |
| REMORQUE | PARTIEL | `remorques` | manque volume palettes, enums cibles stricts |
| CLIENT | PARTIEL | `clients` | proche mais denomination differente (`nom` vs `raison_sociale`) |
| SITE | PARTIEL | `adresses` + `sites_logistiques` | unification a faire + type_site/horaires/temps manutention |
| MISSION | A ADAPTER | `ordres_transport` | concept proche, mais champs CE/ADR/temperature/type cible a aligner |
| ETAPE | PARTIEL | `etapes_mission` | manque certains statuts/types stricts et granularite horaire cible |
| AFFECTATION | A ADAPTER | `affectations` + affectation directe OT | table pivot cible (mission+journee) absente |
| JOURNEE_TRAVAIL | ABSENT | aucun equivalent dedie | table et recalcul CE absents |
| MATRICE_TEMPS | ABSENT | aucun equivalent dedie | O/D duree-distance absent |
| ABSENCE | ABSENT | gestion RH paie non structuree transport | pas de table planning absence chauffeur |
| INDISPONIBILITE | ABSENT | maintenance/events partiels | pas de table indisponibilite exploitable planning |
| INFRACTION_TACHY | ABSENT | UI infractions + `tachygraphe_entrees` | pas de table normative infraction tracee |
| PARAMETRE_REGLE | ABSENT | aucun equivalent | seuils CE non centralises/parametrables |

## Phase 3 - Plan de migration ordonne

1. Migrations base de donnees
- Creer `parametre_regle`, `journee_travail`, `matrice_temps`, `absence`, `indisponibilite`, `infraction_tachy`.
- Ajouter indexes metier: chauffeur/date, camion/date, O/D, semaines CE.
- Ajouter colonnes manquantes sur `ordres_transport` (ou table `missions` cible avec vue de compatibilite).

2. Nouveaux modeles/services
- Creer module `src/lib/ce561Validation.ts` (moteur central).
- Creer module `src/lib/journeeTravail.ts` (recalcul aggregates).
- Creer module `src/lib/planningCompliance.ts` (facade UI/API).

3. Adaptation modeles existants
- Adapter `ordres_transport` -> semantics mission transport (sans casser l existant).
- Harmoniser `adresses`/`sites_logistiques` via vue ou table de convergence.
- Conserver compatibilite en lecture/ecriture pendant migration.

4. API/endpoints
- Ajouter endpoints (Netlify functions) pour:
  - pre-validation legere drag-over (chevauchement)
  - validation complete on-drop
  - recalcul journee source/cible
- Garder les erreurs codes (ex: `CE561_CONDUITE_CONTINUE_MAX`).

5. Interface planning
- Integrer validation complete avant commit de drop.
- Afficher alertes bloquantes/avertissements avec option forcer.
- Afficher compteurs CE en temps reel pendant drag.

## Phase 4 - Generation de code (proposition AVANT/APRES)

### A) Planning onDrop
AVANT
- Le drop ecrit directement dans `ordres_transport` puis recharge.

APRES
- Le drop appelle `validateAndAssignMission(input)`:
  1. pre-check chevauchement
  2. validation CE complete via `ce561Validation`
  3. si ok: transaction affectation + recalcul journees
  4. retour `alertes[]` avec `code`, `type`, `message`, `canForce`

### B) Moteur CE 561 separé
AVANT
- Pas de module unique centralisant les regles CE 561.

APRES
- Nouveau module pur metier:
  - `validerAffectation(input): ValidationResult`
  - `recalculerJourneeTravail(chauffeurId, date): void`
  - toutes les valeurs lues depuis `parametre_regle`

### C) Regles parametrees
AVANT
- Seuils implicites/fragmentes (UI tachy, logique partielle).

APRES
- Seuils exclusivement dans `parametre_regle`.
- Ajout admin simple pour edition/activation des regles.

## Phase 5 - Tests de validation (a implementer)

- Cas nominal affectation valide.
- Conduite continue > 4h30.
- Conduite journaliere > 9h puis > 10h.
- Repos journalier < 11h puis < 9h.
- 3e repos reduit entre 2 repos hebdo.
- 6e jour consecutif travaille.
- Depassement 56h hebdo et 90h bi-hebdo.
- Permis/FCO/carte conducteur expires.
- Mission ADR avec chauffeur non habilite.
- Chevauchement missions chauffeur et conflit camion/remorque.

## Risques et recommandations
- Risque principal: regression planning si on remplace brutalement les ecritures actuelles.
- Strategie recommandee: migration progressive avec facade compatible.
- Priorite execution: 
  1) schema + parametres regles,
  2) moteur CE,
  3) branchement planning,
  4) tests,
  5) decommission ancienne logique.
