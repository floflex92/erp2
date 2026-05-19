-- Migration: Journal saisies manuelles persistées
-- Date: 2026-04-11
-- Description: Table dédiée aux saisies comptables manuelles (journal OD) depuis l'UI Facturation

-- 1. Table journal_manuel
create table if not exists public.compta_journal_manuel (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  libelle       text not null,
  compte        text not null,
  debit         numeric(14,2) not null default 0,
  credit        numeric(14,2) not null default 0,
  created_by    uuid null references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. Trigger updated_at
do $$ begin
  create trigger trg_compta_journal_manuel_touch
    before update on public.compta_journal_manuel
    for each row execute function public.compta_touch_updated_at();
exception when others then null;
end; $$;

-- 3. Index date desc pour chargement ordonné
create index if not exists idx_compta_journal_manuel_date
  on public.compta_journal_manuel(date desc);

-- 4. RLS
alter table public.compta_journal_manuel enable row level security;

do $$ begin
  drop policy if exists "journal_manuel_read" on public.compta_journal_manuel;
  create policy "journal_manuel_read" on public.compta_journal_manuel
    for select to authenticated
    using (auth.uid() is not null);

  drop policy if exists "journal_manuel_write" on public.compta_journal_manuel;
  create policy "journal_manuel_write" on public.compta_journal_manuel
    for all to authenticated
    using (public.get_user_role(auth.uid()) in ('admin', 'dirigeant', 'comptable', 'facturation'))
    with check (public.get_user_role(auth.uid()) in ('admin', 'dirigeant', 'comptable', 'facturation'));
exception when others then
  null;
end; $$;
