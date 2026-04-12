-- Migration : table course_templates
-- Permet de sauvegarder et réutiliser des modèles de courses depuis le planning.
-- Idempotente.

create table if not exists public.course_templates (
  id                  uuid        primary key default gen_random_uuid(),
  label               text        not null,
  type_transport      text,
  nature_marchandise  text,
  chargement_site_id  uuid        references public.sites_logistiques(id) on delete set null,
  livraison_site_id   uuid        references public.sites_logistiques(id) on delete set null,
  client_id           uuid        references public.clients(id) on delete set null,
  distance_km         numeric(10,2),
  duree_heures        numeric(5,2),
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.course_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'course_templates'
      and policyname = 'course_templates_rw_ops'
  ) then
    create policy course_templates_rw_ops
      on public.course_templates
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
