-- Autoriser les centres internes du tenant sans entreprise client rattachee.
-- Conserver la contrainte entreprise_id pour les adresses client de chargement/livraison.

alter table public.sites_logistiques
  drop constraint if exists sites_logistiques_entreprise_required_check;

alter table public.sites_logistiques
  add constraint sites_logistiques_entreprise_required_check
  check (
    entreprise_id is not null
    or (
      coalesce(type_site, 'depot') <> 'client'
      and coalesce(usage_type, 'mixte') = 'mixte'
    )
  ) not valid;

create or replace function public.require_company_for_logistic_site()
returns trigger
language plpgsql
as $$
begin
  if new.entreprise_id is null
     and (
       coalesce(new.type_site, 'depot') = 'client'
       or coalesce(new.usage_type, 'mixte') in ('chargement', 'livraison')
     ) then
    raise exception using
      errcode = '23514',
      message = 'Une adresse client de chargement/dechargement doit etre rattachee a une entreprise.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_require_company_for_logistic_site on public.sites_logistiques;

create trigger trg_require_company_for_logistic_site
before insert or update on public.sites_logistiques
for each row
execute function public.require_company_for_logistic_site();
