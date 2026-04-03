-- Ajoute contact@nexora-truck.fr aux emails reserves admin.
-- Effets:
-- - nouveaux comptes: role admin via upsert_my_profile() et handle_new_user()
-- - comptes existants: promotion du profil en admin si l'email correspond

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
    raise exception 'Non authentifie';
  end if;

  select
    lower(trim(u.email)),
    coalesce(
      u.raw_app_meta_data->>'role',
      u.raw_user_meta_data->>'role'
    )
  into v_email, v_meta_role
  from auth.users u
  where u.id = v_uid;

  v_role := case
    when v_email in (
      'chabre.florent@gmail.com',
      'admin@erp-demo.fr',
      'contact@nexora-truck.fr'
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
    when v_email in (
      'chabre.florent@gmail.com',
      'admin@erp-demo.fr',
      'contact@nexora-truck.fr'
    ) then 'admin'
    when v_email = 'direction@erp-demo.fr' then 'dirigeant'
    when v_meta_role = any(v_valid_roles) then v_meta_role
    else 'conducteur'
  end;

  insert into public.profils (user_id, role)
  values (new.id, v_role)
  on conflict (user_id) do update
    set role = excluded.role,
        updated_at = now();

  return new;
end;
$$;

update public.profils p
set role = 'admin',
    updated_at = now()
from auth.users u
where p.user_id = u.id
  and lower(trim(u.email)) in (
    'chabre.florent@gmail.com',
    'admin@erp-demo.fr',
    'contact@nexora-truck.fr'
  )
  and p.role is distinct from 'admin';

insert into public.profils (user_id, role)
select u.id, 'admin'
from auth.users u
where lower(trim(u.email)) in (
  'chabre.florent@gmail.com',
  'admin@erp-demo.fr',
  'contact@nexora-truck.fr'
)
  and not exists (
    select 1 from public.profils p where p.user_id = u.id
  )
on conflict (user_id) do update
set role = excluded.role,
    updated_at = now();