-- Bootstrap Channel Fret pour compte_client_db V1
-- Prerequis:
-- 1) migration foundation deja appliquee
-- 2) un user_auth_id existant pour l'utilisateur operationnel (optionnel)

-- PARAMETRES A ADAPTER
-- remplacer ces valeurs avant execution
-- 
-- channel_fret_code: code technique unique du compte
-- channel_fret_nom: libelle metier du compte
-- operationnel_email: email utilisateur operationnel initial
-- operationnel_user_auth_id: uuid auth optionnel (mettre null si inconnu)

with upsert_compte as (
  insert into core.comptes_erp (code, nom)
  values ('channel_fret', 'Channel Fret')
  on conflict (code) do update set nom = excluded.nom, updated_at = now()
  returning id
), compte_ref as (
  select id from upsert_compte
  union all
  select id from core.comptes_erp where code = 'channel_fret' limit 1
), upsert_role as (
  insert into core.roles_compte (compte_erp_id, code, libelle)
  select id, 'operationnel', 'Operationnel'
  from compte_ref
  on conflict (compte_erp_id, code) do update set libelle = excluded.libelle, updated_at = now()
  returning id, compte_erp_id
), role_ref as (
  select id, compte_erp_id from upsert_role
  union all
  select rc.id, rc.compte_erp_id
  from core.roles_compte rc
  join compte_ref c on c.id = rc.compte_erp_id
  where rc.code = 'operationnel'
  limit 1
)
insert into core.utilisateurs_compte (compte_erp_id, role_compte_id, user_auth_id, email, nom, prenom)
select
  rr.compte_erp_id,
  rr.id,
  null::uuid,
  'operationnel@channel-fret.fr',
  'Equipe',
  'Operationnelle'
from role_ref rr
on conflict (compte_erp_id, email) do update
set role_compte_id = excluded.role_compte_id,
    user_auth_id = coalesce(excluded.user_auth_id, core.utilisateurs_compte.user_auth_id),
    nom = excluded.nom,
    prenom = excluded.prenom,
    updated_at = now();

-- Seed partenaire par defaut (optionnel, utile pour demarrer)
insert into core.partenaires (compte_erp_id, code, nom, email)
select c.id, 'partner_default', 'Partenaire principal Channel Fret', 'contact@partenaire.local'
from core.comptes_erp c
where c.code = 'channel_fret'
on conflict do nothing;
