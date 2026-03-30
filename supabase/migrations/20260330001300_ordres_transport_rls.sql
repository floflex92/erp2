-- RLS ordres_transport: autoriser les roles metier a lire/ecrire les courses.
-- Migration idempotente.

alter table public.ordres_transport enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ordres_transport'
      and policyname = 'ordres_transport_rw_ops'
  ) then
    create policy ordres_transport_rw_ops
      on public.ordres_transport
      for all
      to authenticated
      using (public.current_app_role() in (
        'admin',
        'dirigeant',
        'exploitant',
        'commercial',
        'comptable',
        'affreteur',
        'conducteur_affreteur'
      ))
      with check (public.current_app_role() in (
        'admin',
        'dirigeant',
        'exploitant',
        'commercial',
        'comptable',
        'affreteur',
        'conducteur_affreteur'
      ));
  end if;
end $$;
