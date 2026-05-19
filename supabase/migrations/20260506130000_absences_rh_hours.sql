begin;

alter table public.absences_rh
  add column if not exists heure_debut time null,
  add column if not exists heure_fin time null;

alter table public.absences_rh
  drop constraint if exists absences_rh_hours_chk;

alter table public.absences_rh
  add constraint absences_rh_hours_chk
  check (
    heure_debut is null
    or heure_fin is null
    or date_fin > date_debut
    or heure_fin > heure_debut
  );

commit;