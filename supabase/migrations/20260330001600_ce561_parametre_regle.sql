-- Fondation CE 561/2006 (non destructive)
-- Phase 1: table des parametres de regles avec valeurs par defaut.

create table if not exists public.parametre_regle (
  id uuid primary key default gen_random_uuid(),
  code_regle text not null unique,
  libelle text not null,
  valeur numeric(10,2) not null,
  unite text not null default 'minutes',
  type_controle text not null default 'bloquant',
  regle_source text not null default 'CE_561_2006',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parametre_regle_type_controle_check
    check (type_controle in ('bloquant', 'avertissement'))
);

create index if not exists parametre_regle_source_idx
  on public.parametre_regle(regle_source, type_controle);

insert into public.parametre_regle (code_regle, libelle, valeur, unite, type_controle, regle_source)
values
  ('CONDUITE_CONTINUE_MAX',   'Conduite continue max',                          270,  'minutes', 'bloquant',      'CE_561_2006'),
  ('PAUSE_APRES_CONDUITE',    'Pause obligatoire apres 4h30',                    45,   'minutes', 'bloquant',      'CE_561_2006'),
  ('CONDUITE_JOUR_MAX',       'Conduite journaliere max',                        540,  'minutes', 'bloquant',      'CE_561_2006'),
  ('CONDUITE_JOUR_ETENDU',    'Conduite journaliere etendue',                    600,  'minutes', 'avertissement', 'CE_561_2006'),
  ('NB_JOUR_ETENDU_MAX',      'Nb jours a 10h par semaine',                      2,    'jours',   'bloquant',      'CE_561_2006'),
  ('CONDUITE_HEBDO_MAX',      'Conduite hebdomadaire max',                       3360, 'minutes', 'bloquant',      'CE_561_2006'),
  ('CONDUITE_BI_HEBDO_MAX',   'Conduite bi-hebdomadaire max',                    5400, 'minutes', 'bloquant',      'CE_561_2006'),
  ('REPOS_JOURNALIER_NORMAL', 'Repos journalier normal',                         660,  'minutes', 'bloquant',      'CE_561_2006'),
  ('REPOS_JOURNALIER_REDUIT', 'Repos journalier reduit',                         540,  'minutes', 'avertissement', 'CE_561_2006'),
  ('NB_REPOS_REDUIT_MAX',     'Nb repos reduits entre 2 hebdo',                  3,    'jours',   'bloquant',      'CE_561_2006'),
  ('REPOS_HEBDO_NORMAL',      'Repos hebdomadaire normal',                       2700, 'minutes', 'bloquant',      'CE_561_2006'),
  ('REPOS_HEBDO_REDUIT',      'Repos hebdomadaire reduit',                       1440, 'minutes', 'avertissement', 'CE_561_2006'),
  ('JOURS_CONSECUTIFS_MAX',   'Jours travailles consecutifs',                    6,    'jours',   'bloquant',      'CE_561_2006'),
  ('PAUSE_TRAVAIL_6_9H',      'Pause si travail entre 6h et 9h',                 30,   'minutes', 'bloquant',      'code_travail'),
  ('PAUSE_TRAVAIL_PLUS_9H',   'Pause si travail > 9h',                           45,   'minutes', 'bloquant',      'code_travail')
on conflict (code_regle) do nothing;
