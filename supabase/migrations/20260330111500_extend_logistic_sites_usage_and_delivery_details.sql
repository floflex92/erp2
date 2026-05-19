-- Lieux logistiques unifies: un lieu peut servir au chargement, a la livraison, ou aux deux.
-- Les informations d'ouverture et notes sont stockees sur le lieu pour les usages livraison / mixte.

alter table public.sites_logistiques
  add column if not exists usage_type text,
  add column if not exists horaires_ouverture text,
  add column if not exists jours_ouverture text,
  add column if not exists notes_livraison text;

update public.sites_logistiques
set usage_type = coalesce(usage_type, 'mixte')
where usage_type is null;

alter table public.sites_logistiques
  alter column usage_type set default 'mixte',
  alter column usage_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sites_logistiques_usage_type_check'
  ) then
    alter table public.sites_logistiques
      add constraint sites_logistiques_usage_type_check
      check (usage_type in ('chargement', 'livraison', 'mixte'));
  end if;
end $$;

create index if not exists sites_logistiques_usage_type_idx
  on public.sites_logistiques(usage_type);