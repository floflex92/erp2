-- Matricule utilisateur interne pour lever les ambiguits de noms.
-- Ajout non destructif avec backfill automatique pour les profils existants.

alter table public.profils
  add column if not exists matricule text;

update public.profils
set matricule = 'USR-' || upper(left(replace(id::text, '-', ''), 8))
where matricule is null or btrim(matricule) = '';

create unique index if not exists profils_matricule_uidx
  on public.profils(matricule);

alter table public.profils
  alter column matricule set not null;
