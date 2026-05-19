# Coffre-fort numerique salarie v2

## Diagnostic de l'existant

1. Le perimetre historique est trop centre conducteur:
- tables `public.conducteur_documents` et `public.conducteur_evenements_rh`.
- bucket `conducteur-documents`.
- vues et workflows relies au dossier conducteur.

2. Le coffre front actuel est majoritairement local navigateur:
- `src/lib/hrDocuments.ts`, `src/lib/vault.ts`, `src/lib/employeeRecords.ts` utilisent `localStorage`.
- ce mode ne garantit ni traçabilite serveur ni acces multi-appareils natif.

3. L'authentification du coffre est couplée au compte ERP:
- routage et droits via `profils.role` dans `src/lib/auth.tsx`.
- pas de cycle de vie autonome du compte coffre-fort.

4. Risque d'acces perdu apres depart:
- desactivation compte interne coupe l'acces global.
- pas de workflow natif qui maintient explicitement un acces coffre autonome.

5. Distinction visibilite post-depart non formalisee:
- pas de moteur central par type de document + duree.

## Architecture cible implementee

La migration SQL `supabase/migrations/20260412200000_employee_vault_employee_scope.sql` ajoute les composants suivants:

1. Employee:
- `public.employee_directory`
- representation employe entreprise (pas limite conducteur)
- lien optionnel vers `profils` et/ou `conducteurs`

2. InternalUserAccount:
- `public.internal_user_accounts`
- cycle de vie compte ERP interne (activation/desactivation)

3. EmployeeVaultAccount:
- `public.employee_vault_accounts`
- compte coffre-fort distinct, email personnel, statut propre

4. Document:
- `public.employee_vault_documents`

5. DocumentVersion:
- `public.employee_vault_document_versions`

6. DocumentAccessLog:
- `public.employee_vault_access_logs`

7. DocumentVisibilityPolicy:
- `public.document_visibility_policies`
- regles par type: pendant contrat, apres depart, duree, telechargement, export

8. ExitWorkflow:
- `public.employee_vault_exit_workflows`
- procedure `public.process_employee_exit(...)`

9. EmployeeDocumentExport:
- `public.employee_document_exports`

10. EmployeeConsent / Signature / Acknowledgement:
- `public.employee_document_consents`

## Droits et roles (resume)

1. RH/Admin/Dirigeant:
- administration complete des comptes, politiques, documents, versions, exports, workflow sortie.

2. Salarie (compte coffre):
- lecture de ses seuls documents selon politique et statut d'emploi.
- upload autorise pour `justificatif_personnel`.
- consentements/signatures sur ses documents visibles.
- demandes d'export de son perimetre visible.

3. Separation interne / coffre:
- compte interne ERP: `internal_user_accounts` + `profils`.
- compte coffre-fort: `employee_vault_accounts`.
- desactivation interne possible sans suppression coffre.

## Workflow d'entree salarie

1. Creer/mettre a jour l'employe dans `employee_directory`.
2. Creer/mettre a jour `internal_user_accounts` pour les acces ERP metier.
3. Provisionner `employee_vault_accounts` avec email personnel.
4. Affecter les politiques documentaires par type via `document_visibility_policies`.
5. Depositer les documents initiaux (contrat, charte, convention, etc.) et version 1.
6. Journaliser les acces/lectures/telechargements/signatures.

## Workflow de sortie salarie

1. Appeler `public.process_employee_exit(...)`.
2. Marquer l'employe `departed` + date/motif.
3. Desactiver compte interne ERP (option par defaut activee).
4. Conserver ou couper acces coffre selon choix:
- conserve: compte coffre reste `active`.
- coupe: compte coffre passe `locked` ou date d'expiration.
5. Application automatique des politiques post-depart sur la visibilite.

## Logique post-depart

1. Le moteur calcule la visibilite par:
- statut emploi + date de sortie,
- politique du type de document,
- override optionnel documentaire.

2. Les documents non visibles post-depart restent inaccessibles cote salarie.

3. Les donnees jamais exposees au salarie restent hors de son scope:
- champs administratifs internes, metadonnees sensibles, elements de pilotage RH internes.

## Documents minimum couverts

Politiques preconfigurees:
- bulletins de paie
- contrats
- avenants
- attestations
- documents RH remis
- documents signes
- entretiens
- convocations
- avertissements
- fin de contrat
- justificatifs personnels

## Strategie de migration sans casse

1. Non regression:
- les tables historiques `conducteur_documents` et workflows existants ne sont pas supprimes.

2. Backfill:
- alimentation `employee_directory` depuis `profils` + `conducteurs`.
- reprise `conducteur_documents` vers `employee_vault_documents` + version initiale.

3. Coexistence progressive:
- ancien module utilisable pendant la transition.
- nouveau modele pret pour basculer les ecrans/API par lots.

4. Validation backend:
- module `netlify/functions/_lib/employee-vault-validation.js` pour valider payloads documents/comptes/sortie/exports/consents.

## Portail salarie cible

Principes UX et securite a conserver lors de la bascule front:
- vue strictement personnelle (jamais transverse)
- filtres par type et statut de visibilite
- historique des versions
- actions lecture/telechargement/export selon politique
- accusé de lecture / signature tracees
- recuperation mot de passe autonome du compte coffre

## Prochaines etapes techniques

1. Brancher les ecrans Coffre RH sur les nouvelles tables Supabase (remplacer le localStorage).
2. Ajouter les endpoints Netlify dedies (`/vault/*`) avec validation centralisee.
3. Ajouter tests RLS et tests de non-regression post-depart.
4. Mettre en place migration des blobs legacy vers bucket `employee-vault-documents` avec prefixe par compte coffre.
