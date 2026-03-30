-- ============================================================
-- Fix critique : récursion infinie RLS + auto-création profils
-- ============================================================
--
-- PROBLÈME :
--   current_app_role() lit public.profils sans SECURITY DEFINER.
--   La table profils a une politique RLS qui appelle current_app_role()
--   → boucle infinie → UPDATEs silencieusement bloqués (drag & drop cassé).
--
-- CORRECTIFS :
--   1. SECURITY DEFINER sur current_app_role()
--   2. Politique self-read sur profils (chaque user lit son propre profil)
--   3. Trigger handle_new_user : crée automatiquement un profil à chaque inscription
--   4. Backfill : crée les profils manquants pour les users déjà inscrits
--   5. RPC upsert_my_profile : permet au frontend de forcer la création du profil
-- ============================================================

-- 1. current_app_role() avec SECURITY DEFINER (casse la récursion RLS)
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profils p
  where p.user_id = auth.uid()
  limit 1
$$;

-- 2. Politique : chaque utilisateur peut lire son propre profil
--    (sans passer par current_app_role() → aucun risque de récursion)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'profils'
      and policyname = 'profils_self_read'
  ) then
    create policy profils_self_read
      on public.profils
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- 3. Fonction RPC : upsert du profil courant (SECURITY DEFINER)
--    Détermine le rôle depuis :
--      a) la liste d'emails réservés (admin hardcodés)
--      b) raw_app_meta_data / raw_user_meta_data de Supabase Auth
--      c) 'conducteur' par défaut
--    Retourne le profil créé/mis à jour sous forme JSON.
create or replace function public.upsert_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_email     text;
  v_meta_role text;
  v_role      text;
  v_profile   public.profils;
  v_valid_roles text[] := array[
    'admin','dirigeant','exploitant','mecanicien','commercial',
    'comptable','rh','conducteur','conducteur_affreteur','client','affreteur'
  ];
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;

  -- Récupère email et rôle depuis auth.users
  select
    lower(trim(u.email)),
    coalesce(
      u.raw_app_meta_data->>'role',
      u.raw_user_meta_data->>'role'
    )
  into v_email, v_meta_role
  from auth.users u
  where u.id = v_uid;

  -- Priorité : emails réservés > metadata > défaut
  v_role := case
    when v_email in (
      'chabre.florent@gmail.com',
      'admin@erp-demo.fr'
    ) then 'admin'
    when v_email = 'direction@erp-demo.fr' then 'dirigeant'
    when v_meta_role = any(v_valid_roles) then v_meta_role
    else 'conducteur'
  end;

  insert into public.profils (user_id, role)
  values (v_uid, v_role)
  on conflict (user_id) do update
    set role       = excluded.role,
        updated_at = now()
  returning * into v_profile;

  return jsonb_build_object(
    'id',     v_profile.id,
    'role',   v_profile.role,
    'nom',    v_profile.nom,
    'prenom', v_profile.prenom
  );
end;
$$;

-- 4. Trigger : crée un profil automatiquement à chaque nouvel utilisateur Supabase
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta_role text;
  v_role      text;
  v_email     text := lower(trim(new.email));
  v_valid_roles text[] := array[
    'admin','dirigeant','exploitant','mecanicien','commercial',
    'comptable','rh','conducteur','conducteur_affreteur','client','affreteur'
  ];
begin
  v_meta_role := coalesce(
    new.raw_app_meta_data->>'role',
    new.raw_user_meta_data->>'role'
  );

  v_role := case
    when v_email in ('chabre.florent@gmail.com', 'admin@erp-demo.fr') then 'admin'
    when v_email = 'direction@erp-demo.fr' then 'dirigeant'
    when v_meta_role = any(v_valid_roles) then v_meta_role
    else 'conducteur'
  end;

  insert into public.profils (user_id, role)
  values (new.id, v_role)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Backfill : profils manquants pour les utilisateurs déjà inscrits
--    Même logique de résolution de rôle que le trigger.
insert into public.profils (user_id, role)
select
  u.id,
  case
    when lower(trim(u.email)) in ('chabre.florent@gmail.com', 'admin@erp-demo.fr') then 'admin'
    when lower(trim(u.email)) = 'direction@erp-demo.fr' then 'dirigeant'
    when coalesce(
           u.raw_app_meta_data->>'role',
           u.raw_user_meta_data->>'role'
         ) in (
           'admin','dirigeant','exploitant','mecanicien','commercial',
           'comptable','rh','conducteur','conducteur_affreteur','client','affreteur'
         )
      then coalesce(u.raw_app_meta_data->>'role', u.raw_user_meta_data->>'role')
    else 'conducteur'
  end
from auth.users u
where not exists (
  select 1 from public.profils p where p.user_id = u.id
)
on conflict (user_id) do nothing;
