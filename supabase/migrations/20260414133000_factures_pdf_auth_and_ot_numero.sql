alter table public.factures
  add column if not exists pdf_storage_bucket text,
  add column if not exists pdf_storage_path text,
  add column if not exists pdf_generated_at timestamptz,
  add column if not exists pdf_sha256 text;

alter table public.ordres_transport
  add column if not exists numero_facturation text;

create index if not exists idx_ordres_transport_numero_facturation
  on public.ordres_transport(numero_facturation)
  where numero_facturation is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('factures-documents', 'factures-documents', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'factures_documents_storage_select'
  ) then
    create policy factures_documents_storage_select
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'factures-documents'
        and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'comptable', 'administratif', 'facturation')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'factures_documents_storage_insert'
  ) then
    create policy factures_documents_storage_insert
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'factures-documents'
        and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'comptable', 'administratif', 'facturation')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'factures_documents_storage_update'
  ) then
    create policy factures_documents_storage_update
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'factures-documents'
        and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'comptable', 'administratif', 'facturation')
      )
      with check (
        bucket_id = 'factures-documents'
        and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'comptable', 'administratif', 'facturation')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'factures_documents_storage_delete'
  ) then
    create policy factures_documents_storage_delete
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'factures-documents'
        and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'comptable', 'administratif', 'facturation')
      );
  end if;
end $$;