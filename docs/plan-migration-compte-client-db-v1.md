# Plan migration V1 - compte_client_db

Date: 2026-03-31
Statut: plan d'execution propose (sans deploiement)

## Lot 1 - Foundation (rapide)

Objectif: demarrer vite avec un socle propre et stable.

1. Creer la base `compte_client_db_dev`.
2. Executer `supabase/snippets/compte_client_db_v1_foundation.sql`.
3. Creer un `compte_erp` (Channel Fret) + role `operationnel`.
4. Brancher les ecrans MVP sur la nouvelle base (lecture/ecriture sur core/docs/rt).

Validation lot 1:
- creation OT OK
- message temps reel OK
- upload document + version OK
- notification document OK
- audit ecriture visible

## Lot 2 - Securisation

Objectif: verrouiller les acces et la tracabilite.

1. Ajouter politiques RLS strictes par `compte_erp_id`.
2. Interdire suppression physique cote app (archivage uniquement).
3. Ajouter endpoints serveur pour actions sensibles.
4. Rendre `audit.journal_actions` append-only pour roles standards.

Validation lot 2:
- aucun acces cross-compte
- aucune suppression physique via UI
- journal action complet sur ecritures

## Lot 3 - Production

Objectif: deploiement maitrise.

1. Creer `compte_client_db_prod` avec meme script.
2. Migrer donnees utiles depuis dev/legacy vers prod (scope compte).
3. Executer recette fonctionnelle complete.
4. Activer sauvegardes annuelles:
   - technique complete
   - fonctionnelle par `compte_erp_id`

Validation lot 3:
- performance acceptable sur flux temps reel
- 0 erreur critique sur parcours operationnel
- restauration d'archive testee

## Rollback

1. Conserver l'ancien flux en lecture seule pendant la bascule.
2. Utiliser feature flag de routage (ancien/nouveau backend).
3. En cas d'incident, repasser sur ancien backend sans perte de donnees nouvelles (replay via journal).

## Definition of Done V1

- noms figes appliques partout
- perimetre MVP operationnel
- securite par compte active
- audit actif
- archivage en place
- plan backup annuel valide
