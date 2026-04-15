-- Refonte V2 - Bloc 1
-- Baseline diagnostic executable (lecture seule).

create schema if not exists refonte_v2;

create table if not exists refonte_v2.baseline_metrics (
  metric_key text primary key,
  metric_value bigint not null,
  measured_at timestamptz not null default now()
);

create or replace function refonte_v2.capture_baseline_metrics()
returns void
language plpgsql
security definer
set search_path = public, refonte_v2
as $$
begin
  insert into refonte_v2.baseline_metrics(metric_key, metric_value, measured_at)
  values
    ('profils.count', (select count(*) from public.profils), now()),
    ('conducteurs.count', (select count(*) from public.conducteurs), now()),
    ('employee_directory.count', (select count(*) from public.employee_directory), now()),
    ('vehicules.count', (select count(*) from public.vehicules), now()),
    ('remorques.count', (select count(*) from public.remorques), now()),
    ('ordres_transport.count', (select count(*) from public.ordres_transport), now()),
    ('factures.count', (select count(*) from public.factures), now()),
    ('devis_transport.count', (select count(*) from public.devis_transport), now())
  on conflict (metric_key) do update
  set metric_value = excluded.metric_value,
      measured_at = excluded.measured_at;
end;
$$;

create or replace view refonte_v2.v_duplicate_business_keys as
select 'ordres_transport.reference'::text as key_name, company_id, reference as key_value, count(*) as cnt
from public.ordres_transport
where reference is not null
group by company_id, reference
having count(*) > 1
union all
select 'factures.numero'::text, company_id, numero, count(*)
from public.factures
where numero is not null
group by company_id, numero
having count(*) > 1
union all
select 'devis_transport.numero'::text, c.company_id, d.numero, count(*)
from public.devis_transport d
join public.clients c on c.id = d.client_id
where d.numero is not null
group by c.company_id, d.numero
having count(*) > 1;

select refonte_v2.capture_baseline_metrics();
