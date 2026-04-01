-- Crée les profils mecaniciens pour le frontend (lecture seule depuis liste OT)
-- Utilisateurs stub sans auth users associates

do $$
declare
  v_compte_id uuid;
  v_count integer;
  v_mech1_id uuid := '11111111-1111-4aaa-8aaa-111111111111'::uuid;
  v_mech2_id uuid := '22222222-2222-4aaa-8aaa-222222222222'::uuid;
begin
  -- Recuperer le compte channel_fret
  select id into v_compte_id
  from core.comptes_erp
  where code = 'channel_fret'
  limit 1;

  if v_compte_id is null then
    raise notice 'sync skipped: compte channel_fret introuvable';
    return;
  end if;

  -- Inserer les 2 mecaniciens directement dans profils
  -- (utilise des UUIDs stables pour les matcher avec core.utilisateurs_compte)
  insert into public.profils (
    id,
    user_id,
    role,
    nom,
    prenom,
    matricule,
    created_at
  )
  values
    (
      v_mech1_id,
      null,
      'mecanicien',
      'Atelier',
      'Mecanicien 1',
      'USR-001-MECH',
      now()
    ),
    (
      v_mech2_id,
      null,
      'mecanicien',
      'Atelier',
      'Mecanicien 2',
      'USR-002-MECH',
      now()
    )
  on conflict (matricule) do update
  set role = excluded.role,
      nom = excluded.nom,
      prenom = excluded.prenom,
      updated_at = now();

  select count(*) into v_count
  from public.profils
  where role = 'mecanicien';

  raise notice 'sync completed: % mecanicien(s) now visible in public.profils', v_count;
end $$;
