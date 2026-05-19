-- Verifie la presence de mecaniciens sur le compte ERP channel_fret.
-- Si aucun mecanicien n'existe, cree 2 utilisateurs mecaniciens.

do $$
declare
  v_compte_id uuid;
  v_role_id uuid;
  v_existing_count integer;
begin
  select id into v_compte_id
  from core.comptes_erp
  where code = 'channel_fret'
  limit 1;

  if v_compte_id is null then
    raise notice 'channel_fret introuvable: aucun mecanicien cree';
    return;
  end if;

  insert into core.roles_compte (compte_erp_id, code, libelle)
  values (v_compte_id, 'mecanicien', 'Mecanicien')
  on conflict (compte_erp_id, code) do update
    set libelle = excluded.libelle,
        updated_at = now();

  select id into v_role_id
  from core.roles_compte
  where compte_erp_id = v_compte_id
    and code = 'mecanicien'
  limit 1;

  select count(*) into v_existing_count
  from core.utilisateurs_compte u
  join core.roles_compte r on r.id = u.role_compte_id
  where u.compte_erp_id = v_compte_id
    and r.code = 'mecanicien'
    and u.archived_at is null;

  if v_existing_count = 0 then
    insert into core.utilisateurs_compte (
      id,
      compte_erp_id,
      role_compte_id,
      user_auth_id,
      email,
      nom,
      prenom,
      actif
    )
    values
      (
        'aaaaaaaa-1111-4aaa-8aaa-111111111111',
        v_compte_id,
        v_role_id,
        null,
        'mecanicien1@channel-fret.fr',
        'Atelier',
        'Mecanicien 1',
        true
      ),
      (
        'aaaaaaaa-2222-4aaa-8aaa-222222222222',
        v_compte_id,
        v_role_id,
        null,
        'mecanicien2@channel-fret.fr',
        'Atelier',
        'Mecanicien 2',
        true
      )
    on conflict (compte_erp_id, email) do update
      set role_compte_id = excluded.role_compte_id,
          nom = excluded.nom,
          prenom = excluded.prenom,
          actif = true,
          updated_at = now();

    raise notice '0 mecanicien detecte: 2 mecaniciens crees';
  else
    raise notice '% mecanicien(s) deja present(s): aucune creation', v_existing_count;
  end if;
end $$;
