-- Fondation CE 561/2006 (phase progressive)
-- Table de consolidation journaliere par conducteur, non destructive.

create table if not exists public.journee_travail (
  id uuid primary key default gen_random_uuid(),
  conducteur_id uuid not null references public.conducteurs(id) on delete cascade,
  jour date not null,
  minutes_conduite integer not null default 0,
  minutes_travail integer not null default 0,
  minutes_repos integer not null default 0,
  nb_missions integer not null default 0,
  source text not null default 'tachygraphe',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journee_travail_unique unique (conducteur_id, jour),
  constraint journee_travail_minutes_conduite_check check (minutes_conduite >= 0),
  constraint journee_travail_minutes_travail_check check (minutes_travail >= 0),
  constraint journee_travail_minutes_repos_check check (minutes_repos >= 0),
  constraint journee_travail_nb_missions_check check (nb_missions >= 0)
);

create index if not exists journee_travail_conducteur_jour_idx
  on public.journee_travail(conducteur_id, jour desc);

create index if not exists journee_travail_jour_idx
  on public.journee_travail(jour desc);

do $$
begin
  perform public.add_updated_at_trigger('public.journee_travail');
exception
  when others then
    null;
end $$;

insert into public.journee_travail (
  conducteur_id,
  jour,
  minutes_conduite,
  minutes_travail,
  minutes_repos,
  source
)
select
  te.conducteur_id,
  (te.date_debut at time zone 'UTC')::date as jour,
  sum(
    case when te.type_activite = 'conduite'
      then coalesce(te.duree_minutes, greatest(0, floor(extract(epoch from (coalesce(te.date_fin, te.date_debut) - te.date_debut)) / 60))::int)
      else 0
    end
  )::int as minutes_conduite,
  sum(
    case when te.type_activite in ('conduite', 'travail', 'disponibilite', 'autre')
      then coalesce(te.duree_minutes, greatest(0, floor(extract(epoch from (coalesce(te.date_fin, te.date_debut) - te.date_debut)) / 60))::int)
      else 0
    end
  )::int as minutes_travail,
  sum(
    case when te.type_activite = 'repos'
      then coalesce(te.duree_minutes, greatest(0, floor(extract(epoch from (coalesce(te.date_fin, te.date_debut) - te.date_debut)) / 60))::int)
      else 0
    end
  )::int as minutes_repos,
  'tachygraphe' as source
from public.tachygraphe_entrees te
group by te.conducteur_id, (te.date_debut at time zone 'UTC')::date
on conflict (conducteur_id, jour) do update
set
  minutes_conduite = excluded.minutes_conduite,
  minutes_travail = excluded.minutes_travail,
  minutes_repos = excluded.minutes_repos,
  source = excluded.source,
  updated_at = now();

with missions as (
  select
    ot.conducteur_id,
    generate_series(
      coalesce(ot.date_chargement_prevue, ot.date_livraison_prevue)::date,
      coalesce(ot.date_livraison_prevue, ot.date_chargement_prevue)::date,
      interval '1 day'
    )::date as jour
  from public.ordres_transport ot
  where ot.conducteur_id is not null
    and ot.statut <> 'annule'
    and (ot.date_chargement_prevue is not null or ot.date_livraison_prevue is not null)
)
insert into public.journee_travail (conducteur_id, jour, nb_missions, source)
select
  m.conducteur_id,
  m.jour,
  count(*)::int as nb_missions,
  'planning' as source
from missions m
group by m.conducteur_id, m.jour
on conflict (conducteur_id, jour) do update
set
  nb_missions = excluded.nb_missions,
  updated_at = now();
