-- Observabilite : table app_error_logs pour capturer les erreurs frontend et Netlify functions.
-- source : 'frontend' | 'netlify'
-- error_type : 'unhandled_error' | 'unhandled_rejection' | 'react_boundary' | 'api_error' | 'api_500'
-- context : jsonb libre (url, role, filename, component_stack, lineno...)
--
-- RLS :
--   INSERT -> tout utilisateur authentifie (catch erreurs en prod)
--   SELECT -> admin / super_admin / dirigeant uniquement (donnees potentiellement sensibles)
--   DELETE -> admin / super_admin (purge manuelle)

create table if not exists public.app_error_logs (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  source      text        not null default 'frontend',
  error_type  text        not null,
  message     text        not null,
  stack_trace text        null,
  context     jsonb       null,
  tenant_key  text        not null default 'default',
  constraint app_error_logs_source_check
    check (source in ('frontend', 'netlify')),
  constraint app_error_logs_type_check
    check (error_type in ('unhandled_error', 'unhandled_rejection', 'react_boundary', 'api_error', 'api_500'))
);

create index if not exists app_error_logs_created_idx
  on public.app_error_logs(created_at desc);

create index if not exists app_error_logs_source_type_idx
  on public.app_error_logs(source, error_type, created_at desc);

alter table public.app_error_logs enable row level security;

-- INSERT : tout utilisateur authentifie peut reporter une erreur
drop policy if exists app_error_logs_insert on public.app_error_logs;
create policy app_error_logs_insert
  on public.app_error_logs
  for insert
  to authenticated
  with check (true);

-- SELECT : admin / super_admin / dirigeant uniquement
drop policy if exists app_error_logs_select on public.app_error_logs;
create policy app_error_logs_select
  on public.app_error_logs
  for select
  to authenticated
  using (public.get_user_role() in ('admin', 'super_admin', 'dirigeant'));

-- DELETE : admin / super_admin uniquement (purge)
drop policy if exists app_error_logs_delete on public.app_error_logs;
create policy app_error_logs_delete
  on public.app_error_logs
  for delete
  to authenticated
  using (public.get_user_role() in ('admin', 'super_admin'));
