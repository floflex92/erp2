
-- Colonnes manquantes dans ordres_transport (causaient le 400 Bad Request)
alter table public.ordres_transport
  add column if not exists est_affretee     boolean     not null default false,
  add column if not exists source_course    text        not null default 'manuel',
  add column if not exists reference_transport text     null,
  add column if not exists reference_externe  text      null,
  add column if not exists statut_transport   text      null;
;
