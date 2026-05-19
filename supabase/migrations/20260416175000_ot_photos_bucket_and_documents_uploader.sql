-- ============================================================
-- Migration : bucket ot-photos + colonne uploaded_by sur documents
-- Permet aux conducteurs (exploitant) d'uploader des photos de mission
-- ============================================================

-- 1. Ajouter uploaded_by sur documents si absent
alter table public.documents
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null;

-- index pour retrouver rapidement les photos d'un OT
create index if not exists documents_ot_idx_v2
  on public.documents(ot_id, type_document)
  where ot_id is not null;

-- 2. Bucket ot-photos (images uniquement, 10 Mo max, privé)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ot-photos',
  'ot-photos',
  false,
  10485760,  -- 10 Mo
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

-- 3. RLS Storage — lecture : rôles métier
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'ot_photos_select'
  ) then
    create policy ot_photos_select on storage.objects
      for select to authenticated
      using (
        bucket_id = 'ot-photos'
        and public.get_user_role() in (
          'admin', 'dirigeant', 'exploitant', 'commercial', 'comptable'
        )
      );
  end if;
end $$;

-- 4. RLS Storage — upload : exploitant/admin/dirigeant
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'ot_photos_insert'
  ) then
    create policy ot_photos_insert on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'ot-photos'
        and public.get_user_role() in (
          'admin', 'dirigeant', 'exploitant'
        )
      );
  end if;
end $$;

-- 5. RLS Storage — suppression : admin/dirigeant uniquement
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'ot_photos_delete'
  ) then
    create policy ot_photos_delete on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'ot-photos'
        and public.get_user_role() in ('admin', 'dirigeant')
      );
  end if;
end $$;

-- 6. Mettre à jour la policy documents_rw pour inclure exploitant en INSERT
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'documents'
      and policyname = 'documents_rw_v2'
  ) then
    drop policy if exists documents_rw on public.documents;
    create policy documents_rw_v2 on public.documents
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
  end if;
end $$;
