-- ============================================================
-- Sécurité conducteur incidents mission
-- Objectif:
-- - Conducteur: créer/lire/maj incidents uniquement sur ses missions
-- - Conducteur: joindre photo incident uniquement sur ses missions
-- - Sans impact sur photos/signatures déjà validées
-- ============================================================

-- Helper: vérifie que l'OT appartient au conducteur connecté
create or replace function public.is_my_conducteur_ot(target_ot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ordres_transport ot
    join public.employee_directory ed on ed.conducteur_id = ot.conducteur_id
    join public.profils p on p.id = ed.profil_id
    where ot.id = target_ot_id
      and p.user_id = auth.uid()
  );
$$;

-- imprevu_exploitation: garde restrictive pour les conducteurs
-- (les autres rôles gardent le comportement existant)

drop policy if exists imprevu_conducteur_own_ot_select_r on public.imprevu_exploitation;
create policy imprevu_conducteur_own_ot_select_r on public.imprevu_exploitation
  as restrictive
  for select to authenticated
  using (
    public.get_user_role() <> 'conducteur'
    or (
      ot_id is not null
      and public.is_my_conducteur_ot(ot_id)
    )
  );

drop policy if exists imprevu_conducteur_own_ot_insert_r on public.imprevu_exploitation;
create policy imprevu_conducteur_own_ot_insert_r on public.imprevu_exploitation
  as restrictive
  for insert to authenticated
  with check (
    public.get_user_role() <> 'conducteur'
    or (
      ot_id is not null
      and public.is_my_conducteur_ot(ot_id)
    )
  );

drop policy if exists imprevu_conducteur_own_ot_update_r on public.imprevu_exploitation;
create policy imprevu_conducteur_own_ot_update_r on public.imprevu_exploitation
  as restrictive
  for update to authenticated
  using (
    public.get_user_role() <> 'conducteur'
    or (
      ot_id is not null
      and public.is_my_conducteur_ot(ot_id)
    )
  )
  with check (
    public.get_user_role() <> 'conducteur'
    or (
      ot_id is not null
      and public.is_my_conducteur_ot(ot_id)
    )
  );

-- documents: garde restrictive ciblée uniquement sur type_document='incident_photo'
-- pour empêcher un conducteur de lier des photos incident à un OT non assigné.

drop policy if exists documents_conducteur_incident_photo_insert_r on public.documents;
create policy documents_conducteur_incident_photo_insert_r on public.documents
  as restrictive
  for insert to authenticated
  with check (
    public.get_user_role() <> 'conducteur'
    or type_document <> 'incident_photo'
    or (
      ot_id is not null
      and public.is_my_conducteur_ot(ot_id)
    )
  );
