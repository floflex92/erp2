# Validation fonctionnelle guidee - compte_client_db V1

Date: 2026-03-31
But: valider rapidement le fonctionnement metier de la base compte client en serv dev.

## 1. Verification technique initiale

1. Ouvrir les migrations appliquees:
   - `npx supabase migration list`
2. Verifier que les 3 migrations V1 sont synchronisees local/remote:
   - `20260331101000_compte_client_db_v1_foundation`
   - `20260331102000_compte_client_db_v1_bootstrap_channel_fret`
   - `20260331103000_compte_client_db_v1_rls_strict`

## 2. Verification bootstrap Channel Fret

Dans SQL Editor, verifier:

1. Compte Channel Fret present
```sql
select id, code, nom from core.comptes_erp where code = 'channel_fret';
```

2. Role operationnel present
```sql
select rc.id, rc.code, rc.libelle
from core.roles_compte rc
join core.comptes_erp c on c.id = rc.compte_erp_id
where c.code = 'channel_fret' and rc.code = 'operationnel';
```

3. Utilisateur operationnel present
```sql
select u.id, u.email, u.nom, u.prenom
from core.utilisateurs_compte u
join core.comptes_erp c on c.id = u.compte_erp_id
where c.code = 'channel_fret' and u.email = 'operationnel@channel-fret.fr';
```

## 3. Verification RLS (automatique)

1. Executer:
   - `supabase/snippets/compte_client_db_v1_rls_tests.sql`
2. Verifier les attendus dans les commentaires du script.

## 4. Verification fonctionnelle metier (MVP)

## 4.1 OT

1. Creer un OT lie a Channel Fret
2. Modifier son statut
3. Archiver l'OT (sans suppression physique)

Attendu:
- creation/modification OK
- pas de delete physique expose

## 4.2 Documents

1. Creer un document
2. Ajouter une version
3. Archiver le document

Attendu:
- insertion dans `docs.documents` + `docs.documents_versions`
- archivage via `archived_at`

## 4.3 Messages et realtime

1. Inserer un message lie a un OT
2. Inserer un evenement statut dans `rt.evenements_transport`
3. Inserer une notification document dans `rt.notifications`

Attendu:
- donnees visibles dans le perimetre compte actif
- aucun acces cross-compte

## 4.4 Audit

1. Inserer une entree dans `audit.journal_actions`
2. Tenter update/delete d'une entree audit

Attendu:
- insert autorise
- update/delete refuses (append-only)

## 5. Resultat global (Go/No-Go)

Go si:
1. RLS isole correctement par `compte_erp_id`
2. parcours MVP passent sans erreur bloquante
3. audit append-only est confirme
4. archivage remplace bien la suppression

No-Go si:
1. lecture/ecriture cross-compte possible
2. audit modifiable
3. suppression physique exposee en parcours client
