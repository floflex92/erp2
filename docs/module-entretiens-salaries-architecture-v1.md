# Module entretiens salaries - audit, architecture cible et plan d implementation

Date: 12/04/2026
Perimetre: ERP transport Nexora Truck (React + TypeScript + Supabase)

## A. Audit de l existant

### 1) Stack et points d integration

- Frontend: React 19 + TypeScript + Vite.
- Auth/Roles: table public.profils + helpers public.get_user_role(), public.my_company_id(), route guards dans src/lib/auth.tsx.
- Data access: client Supabase cote front (src/lib/supabase.ts) avec pattern service local dans src/lib/*.ts.
- Navigation: routes dans src/App.tsx, menu dans src/components/layout/Sidebar.tsx.
- RH existant:
  - Ecran RH: src/pages/Rh.tsx.
  - Absences RH deja structurees: src/lib/absencesRh.ts + table absences_rh.
  - Entretiens RH minimalistes existants: src/lib/entretienRh.ts + table entretiens_rh (mode simplifie).
  - Dossier conducteur RH: src/pages/Chauffeurs.tsx + tables conducteur_evenements_rh / conducteur_documents.

### 2) Ce qui est reutilisable

- Gestion multi-tenant et roles deja en place (company_id + RLS).
- Pattern migration additive et policies par role deja standardises.
- Composants de layout et styles utilitaires deja cohesifs.
- Donnees objectif deja existantes avec table public.objectives.

### 3) Limites de l existant pour ton besoin

- entretiens_rh est trop limite (type/statut simplistes, pas de participants, pas de workflow documentaire versionne, pas de vrai audit trail, pas de liaison objectifs multi-entretien robuste).
- Pas de modele parametrique des types d entretien (categorie, droits, trame, modele documentaire, regles metier).
- Pas de sous-systeme documentaire complet (versions, signatures, scan reinjecte, piste d audit complete par document).
- Pas de vue globale centralisee avec filtres multicriteres et indicateurs metier complets.

### 4) Risques et parades

- Risque de regression RH existante: evite via schema additive only (nouvelles tables, sans suppression).
- Risque de doublon de source: l ecran nouveau lit exclusivement public.interviews + tables filles.
- Risque RLS: policies calquees sur helpers existants (my_company_id + get_user_role) et relations parent/enfant.
- Risque migration front/types: module isole dans src/lib/hrInterviewsModule.ts et page dediee.

## B. Architecture cible

### 1) Regle de source unique

Un entretien existe une seule fois dans public.interviews et est projete dans:
- vue globale RH,
- dossier salarie,
- suivi manager,
- actions,
- documents,
- objectifs,
- audit.

### 2) Sous-systemes

- Referential: interview_types, interview_document_templates.
- Core: interviews, interview_participants, interview_status_history, interview_notes, interview_reports.
- Suivi: interview_actions, interview_objectives, interview_alerts.
- Documentaire: interview_documents, interview_document_versions, interview_document_signatures.
- Traçabilite: interview_audit_logs + triggers metier.

### 3) Workflows cibles

- Workflow entretien: a_planifier -> planifie -> convocation_* -> en_attente_realisation -> realise -> compte_rendu_* -> signe -> cloture -> archive.
- Workflow compte rendu: brouillon -> valide -> signe -> archive.
- Workflow action: a_faire -> en_cours -> bloquee -> terminee/annulee.
- Workflow documentaire: brouillon -> genere -> imprime/envoye -> en_attente_signature -> signe/scanne -> valide -> archive.

### 4) Permissions

- Lecture metier: admin/super_admin/dirigeant/rh, + participant salarie/manager selon lien direct.
- Ecriture metier: admin/super_admin/dirigeant/rh/exploitant (pilotage operationnel).
- Audit logs: lecture restreinte admin/super_admin/dirigeant/rh.
- Confidentialite disciplinaire: restreinte aux profils autorises (rh/direction/admin + acteurs concernes).

## C. Schema de donnees detaille

### Entites

- interview_types
  - PK: id (uuid)
  - FK: company_id -> companies.id, created_by -> profils.id, default_document_template_id -> interview_document_templates.id
  - Contraintes: unique(company_id, code), category enum logique metier.

- interview_document_templates
  - PK: id
  - FK: company_id, interview_type_id, created_by
  - Contraintes: unique(company_id, name, version), document_type enum.

- interviews
  - PK: id
  - FK: company_id, interview_type_id, employee_profile_id, manager_profile_id, hr_profile_id, creator_profile_id
  - Statuts: cycle complet professionnel
  - Champs metier: motif, contexte, resume, notes preparatoires, decisions, confidentialite, report_status.

- interview_participants
  - PK: id
  - FK: company_id, interview_id, profile_id
  - Contraintes: unique(interview_id, profile_id)

- interview_status_history
  - PK: id
  - FK: company_id, interview_id, changed_by

- interview_notes
  - PK: id
  - FK: company_id, interview_id, created_by
  - Champs: note_type, visibility, content.

- interview_reports
  - PK: id
  - FK: company_id, interview_id, validated_by, created_by
  - Versionning: unique(interview_id, version)

- interview_actions
  - PK: id
  - FK: company_id, interview_id, employee_profile_id, responsible_profile_id, closed_by, created_by
  - Statuts: a_faire/en_cours/bloquee/terminee/annulee.

- interview_objectives
  - PK: id
  - FK: company_id, interview_id, objective_id -> objectives.id
  - Snapshot: target/realise/seuils/unite/impact bonus + freeze_on_closure.

- interview_alerts
  - PK: id
  - FK: company_id, interview_id, employee_profile_id, resolved_by
  - Types: a_venir/en_retard/doc manquant/non signe/compte rendu/action/objectif/echeance obligatoire.

- interview_documents
  - PK: id
  - FK: company_id, interview_id, employee_profile_id, template_id, generated_by, sent_by
  - Statut documentaire + chemins source/signe.

- interview_document_versions
  - PK: id
  - FK: company_id, document_id, uploaded_by
  - Contraintes: unique(document_id, version).

- interview_document_signatures
  - PK: id
  - FK: company_id, document_id, version_id, signatory_profile_id

- interview_audit_logs
  - PK: id
  - FK: company_id, actor_profile_id, interview_id, employee_profile_id
  - Indexes sur occurred_at, interview_id, entity.

### Indexes

Indexes crees sur:
- company_id (isolation tenant + perfs),
- filtres metier (status, priority, planned_at, due_date, confidentiality),
- liens parent-enfant (interview_id/document_id/objective_id).

## D. Fichiers crees et modifies

### Crees

- supabase/migrations/20260412193000_hr_interviews_module_foundation.sql
- src/lib/hrInterviewsModule.ts
- src/pages/EntretiensSalaries.tsx
- docs/module-entretiens-salaries-architecture-v1.md

### Modifies

- src/App.tsx (nouvelle route /entretiens-salaries)
- src/lib/auth.tsx (droits d acces par role)
- src/components/layout/Sidebar.tsx (menu RH + icone)
- src/components/layout/AppLayout.tsx (titre page)

## E. Prochaines etapes implementation (bloc suivant)

1. Connecter cette nouvelle page dans le dossier salarie RH existant (onglet entretiens unifie).
2. Ajouter edition detaillee: participants, compte rendu structure, statut workflow.
3. Ajouter ecrans operationnels documentaires (generer/imprimer/envoyer/upload scan/versionning).
4. Ajouter automate d alertes et generation periodique (obligatoires + campagnes).
5. Ajouter tests front + controles de transitions de statuts.
