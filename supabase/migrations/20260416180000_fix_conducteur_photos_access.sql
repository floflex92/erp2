-- ============================================================
-- Fix accès conducteur : bucket ot-photos + table documents
-- Un conducteur (profils.role = 'conducteur') doit pouvoir :
--   - uploader des photos de mission (INSERT)
--   - lire les photos des missions (SELECT)
-- Contrainte de sécurité :
--   - SELECT : conducteur lit ses propres uploads OU toutes les photos
--     des missions (les exploitants voient tout de toute façon)
--   - INSERT : conducteur peut ajouter une photo à n'importe quel OT
--     (le filtrage métier est fait côté app mobile)
-- ============================================================

-- 1. Storage SELECT : ajouter conducteur
drop policy if exists ot_photos_select on storage.objects;
create policy ot_photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ot-photos'
    and public.get_user_role() in (
      'admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'conducteur'
    )
  );

-- 2. Storage INSERT : ajouter conducteur
drop policy if exists ot_photos_insert on storage.objects;
create policy ot_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ot-photos'
    and public.get_user_role() in (
      'admin', 'dirigeant', 'exploitant', 'conducteur'
    )
  );

-- 3. Table documents : remplacer documents_rw_v2 pour inclure conducteur
--    SELECT conducteur : ses propres uploads uniquement (uploaded_by = auth.uid())
--    INSERT conducteur : peut insérer (ot_id + uploaded_by obligatoires côté app)
--    Autres rôles : accès complet comme avant

drop policy if exists documents_rw_v2 on public.documents;

create policy documents_staff_rw on public.documents
  for all to authenticated
  using (
    public.get_user_role() in (
      'admin', 'dirigeant', 'exploitant', 'commercial', 'comptable'
    )
  )
  with check (
    public.get_user_role() in (
      'admin', 'dirigeant', 'exploitant', 'commercial', 'comptable'
    )
  );

-- Policy dédiée conducteur : lecture de SES photos uniquement
create policy documents_conducteur_select on public.documents
  for select to authenticated
  using (
    public.get_user_role() = 'conducteur'
    and uploaded_by = auth.uid()
  );

-- Policy dédiée conducteur : upload autorisé (ot_id non null imposé côté app)
create policy documents_conducteur_insert on public.documents
  for insert to authenticated
  with check (
    public.get_user_role() = 'conducteur'
    and uploaded_by = auth.uid()
    and ot_id is not null
  );
