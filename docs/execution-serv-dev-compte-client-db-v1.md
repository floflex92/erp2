# Execution serv dev - compte_client_db V1

Date: 2026-03-31
But: sequence d'execution pas a pas sans ambiguite.

## 0. Prerequis

- Projet Supabase cible connecte sur l'environnement dev.
- Acces SQL editor (ou CLI) disponible.
- Fichiers prets:
  - `supabase/migrations/20260331101000_compte_client_db_v1_foundation.sql`
  - `supabase/snippets/compte_client_db_v1_bootstrap_channel_fret.sql`
  - `supabase/snippets/compte_client_db_v1_rls_strict.sql`

## 1. Verifier les migrations locales

1. `supabase migration list`

Resultat attendu:
- la migration `20260331101000_compte_client_db_v1_foundation.sql` est visible localement.

## 2. Dry-run de push

1. `supabase db push --dry-run`

Resultat attendu:
- pas d'erreur SQL bloquante.
- la migration foundation apparait dans le plan.

## 3. Push migration foundation (si dry-run propre)

1. `supabase db push`

Resultat attendu:
- schemas `core`, `docs`, `rt`, `audit`, `backup` crees.
- tables foundation presentes.

## 4. Executer le bootstrap Channel Fret

Option SQL Editor (recommandee):
1. ouvrir `supabase/snippets/compte_client_db_v1_bootstrap_channel_fret.sql`
2. verifier les valeurs de parametrage en tete du script
3. executer

Resultat attendu:
- `core.comptes_erp`: ligne `channel_fret`
- `core.roles_compte`: role `operationnel`
- `core.utilisateurs_compte`: utilisateur `operationnel@channel-fret.fr`
- `core.partenaires`: partenaire par defaut

## 5. Executer le RLS strict

Option SQL Editor:
1. ouvrir `supabase/snippets/compte_client_db_v1_rls_strict.sql`
2. executer

Resultat attendu:
- RLS active sur toutes les tables du perimetre V1
- policies `same_compte` creees
- `audit.journal_actions` en mode append-only

## 6. Tests de verification rapide

1. Connecte en utilisateur A sur compte Channel Fret
2. S'assurer que lecture/ecriture fonctionne sur son `compte_erp_id`
3. Simuler utilisateur B sur autre compte (ou `app.current_compte_erp_id` different)
4. Verifier refus cross-compte

## 7. Rollback logique minimal

En cas de probleme post-RLS:
1. desactiver temporairement les parcours client critiques en front (feature flag)
2. rollback SQL cible sur policies (drop/recreate policies)
3. conserver les donnees, ne pas supprimer physiquement

## 8. Important

- Cette sequence n'inclut aucun push Netlify.
- Cette sequence est orientee `serv dev` uniquement.
