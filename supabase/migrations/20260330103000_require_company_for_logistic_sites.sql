-- Verrou metier: une adresse de chargement/dechargement ne peut pas exister sans entreprise rattachee.
-- La contrainte est ajoutee en NOT VALID pour ne pas casser l'historique eventuel,
-- mais elle s'applique a toutes les nouvelles insertions et mises a jour.

create table if not exists public.sites_logistiques (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  adresse text not null,
  latitude numeric(10,7) null,
  longitude numeric(10,7) null,
  entreprise_id uuid null references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sites_logistiques
  drop constraint if exists sites_logistiques_entreprise_id_fkey;

alter table public.sites_logistiques
  add constraint sites_logistiques_entreprise_id_fkey
  foreign key (entreprise_id)
  references public.clients(id)
  on delete restrict;

alter table public.sites_logistiques
  drop constraint if exists sites_logistiques_entreprise_required_check;

alter table public.sites_logistiques
  add constraint sites_logistiques_entreprise_required_check
  check (entreprise_id is not null) not valid;

create or replace function public.require_company_for_logistic_site()
returns trigger
language plpgsql
as $$
begin
  if new.entreprise_id is null then
    raise exception using
      errcode = '23514',
      message = 'Une adresse de chargement/dechargement doit etre rattachee a une entreprise.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_require_company_for_logistic_site on public.sites_logistiques;

create trigger trg_require_company_for_logistic_site
before insert or update on public.sites_logistiques
for each row
execute function public.require_company_for_logistic_site();