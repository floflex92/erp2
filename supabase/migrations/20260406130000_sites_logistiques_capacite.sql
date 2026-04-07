-- Ajout colonne capacite_m3 sur sites_logistiques
alter table public.sites_logistiques
  add column if not exists capacite_m3 numeric(10,2) null;
