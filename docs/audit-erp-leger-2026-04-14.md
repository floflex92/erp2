# Audit ERP leger

## Objectif

Mettre en place une tracabilite exploitable sans journaliser de facon lourde tout le contenu metier.

Le dispositif pose dans la migration [supabase/migrations/20260414150000_erp_audit_lightweight.sql](supabase/migrations/20260414150000_erp_audit_lightweight.sql) repond a 4 besoins :

- savoir qui a cree, modifie ou supprime une fiche
- savoir quand l'action a eu lieu
- savoir sur quelle table et quel enregistrement l'action porte
- connaitre uniquement les champs modifies, pas un dump complet de toutes les donnees

## Table centrale

La table publique `erp_audit_logs` stocke :

- `company_id`
- `module_code`
- `schema_name`
- `table_name`
- `record_id`
- `record_label`
- `action`
- `actor_user_id`
- `actor_role`
- `audit_origin`
- `changed_fields`
- `change_summary`
- `occurred_at`

Le champ `change_summary` contient un diff JSON `before/after` uniquement sur les champs modifies, hors champs techniques.

## Visibilite

La lecture du journal est volontairement limitee aux roles suivants dans le meme tenant :

- `admin`
- `super_admin`
- `dirigeant`

Il n'y a pas de policy d'ecriture directe pour les utilisateurs metier. L'alimentation du journal passe par les triggers.

## Tables couvertes en phase 1

- `public.clients`
- `public.vehicules`
- `public.ordres_transport`
- `public.factures`
- `public.conducteurs`
- `public.sites_logistiques`
- `public.absences_rh`

Pour les tables qui n'avaient pas encore de colonnes d'auteur standardisees, la migration ajoute `created_by` et `updated_by` quand c'est compatible avec le schema existant.

## Principe de legerete

Le journal ne stocke pas :

- les lectures
- les champs techniques (`created_at`, `updated_at`, `created_by`, `updated_by`, `archived_at`)
- des snapshots complets en double sur chaque update si rien n'a change

Le trigger ignore les updates sans diff reel.

## Extension conseillee

Si vous etendez l'audit a une nouvelle table :

1. verifier qu'elle porte `company_id`
2. ajouter `created_by` et `updated_by` si besoin
3. brancher `public.erp_audit_stamp_actor_columns()` en `before insert or update`
4. brancher `public.erp_audit_log_row_change('<module>')` en `after insert or update or delete`

## Limites actuelles

- aucun ecran front n'exploite encore `erp_audit_logs`
- `absences_rh` est journalise mais son schema d'auteur reste heterogene car il s'appuie deja sur `public.profils`
- le champ `audit_origin` vaut `app` tant qu'aucun contexte technique specifique n'est injecte