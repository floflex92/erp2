-- ============================================================
-- BONUS -> PAYROLL -> ACCOUNTING BRIDGE
-- Date : 2026-04-12
-- Objectif : tracer le rapprochement entre bonus valides,
--            bulletin paie genere et ecriture comptable associee.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.bonus_payroll_accounting_links (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete restrict,
  bonus_calculation_id uuid not null references public.bonus_calculations(id) on delete cascade,
  profil_id uuid null references public.profils(id) on delete set null,
  period_key text not null,
  payroll_slip_id text not null,
  payroll_period_label text not null,
  compta_ecriture_id uuid null references public.compta_ecritures(id) on delete set null,
  statut text not null default 'pending'
    check (statut in ('pending', 'linked', 'accounting_failed')),
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bonus_payroll_links_unique unique (bonus_calculation_id, payroll_slip_id)
);

create index if not exists bonus_payroll_links_company_idx on public.bonus_payroll_accounting_links(company_id);
create index if not exists bonus_payroll_links_bonus_idx on public.bonus_payroll_accounting_links(bonus_calculation_id);
create index if not exists bonus_payroll_links_profil_idx on public.bonus_payroll_accounting_links(profil_id);
create index if not exists bonus_payroll_links_payroll_idx on public.bonus_payroll_accounting_links(payroll_slip_id);
create index if not exists bonus_payroll_links_status_idx on public.bonus_payroll_accounting_links(statut);

alter table public.bonus_payroll_accounting_links enable row level security;

drop policy if exists bonus_payroll_links_staff_read on public.bonus_payroll_accounting_links;
create policy bonus_payroll_links_staff_read on public.bonus_payroll_accounting_links
  for select to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'comptable', 'rh', 'exploitant')
  );

drop policy if exists bonus_payroll_links_finance_write on public.bonus_payroll_accounting_links;
create policy bonus_payroll_links_finance_write on public.bonus_payroll_accounting_links
  for all to authenticated
  using (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'comptable', 'rh', 'super_admin')
  )
  with check (
    company_id = public.my_company_id()
    and public.get_user_role() in ('admin', 'dirigeant', 'comptable', 'rh', 'super_admin')
  );

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'add_updated_at_trigger'
      and pg_function_is_visible(oid)
  ) then
    perform public.add_updated_at_trigger('bonus_payroll_accounting_links');
  end if;
exception when others then
  raise notice 'updated_at trigger bonus_payroll_accounting_links non applique: %', sqlerrm;
end $$;
