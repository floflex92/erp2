alter table public.clients
  add column if not exists code_client text,
  add column if not exists adresse_facturation text,
  add column if not exists code_postal_facturation text,
  add column if not exists ville_facturation text,
  add column if not exists pays_facturation text,
  add column if not exists contact_facturation_nom text,
  add column if not exists contact_facturation_email text,
  add column if not exists contact_facturation_telephone text,
  add column if not exists mode_paiement_defaut text,
  add column if not exists type_echeance text default 'date_facture_plus_delai',
  add column if not exists jour_echeance integer,
  add column if not exists iban text,
  add column if not exists bic text,
  add column if not exists banque text,
  add column if not exists titulaire_compte text;

update public.clients
set
  adresse_facturation = coalesce(adresse_facturation, adresse),
  code_postal_facturation = coalesce(code_postal_facturation, code_postal),
  ville_facturation = coalesce(ville_facturation, ville),
  pays_facturation = coalesce(pays_facturation, pays, 'France'),
  mode_paiement_defaut = coalesce(mode_paiement_defaut, 'virement'),
  type_echeance = coalesce(type_echeance, 'date_facture_plus_delai')
where
  adresse_facturation is null
  or code_postal_facturation is null
  or ville_facturation is null
  or pays_facturation is null
  or mode_paiement_defaut is null
  or type_echeance is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_type_echeance_check'
  ) then
    alter table public.clients
      add constraint clients_type_echeance_check
      check (
        type_echeance is null
        or type_echeance in ('date_facture_plus_delai', 'fin_de_mois', 'fin_de_mois_le_10', 'jour_fixe', 'comptant')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_jour_echeance_check'
  ) then
    alter table public.clients
      add constraint clients_jour_echeance_check
      check (jour_echeance is null or jour_echeance between 1 and 31);
  end if;
end $$;

create index if not exists idx_adresses_client_type on public.adresses (client_id, type_lieu);
create index if not exists idx_contacts_client on public.contacts (client_id);
create index if not exists idx_factures_client_date on public.factures (client_id, date_emission desc);
create index if not exists idx_ordres_transport_client_created on public.ordres_transport (client_id, created_at desc);
