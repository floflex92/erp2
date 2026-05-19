-- Planning custom rows and blocks (replaces localStorage persistence)

create table if not exists public.planning_custom_rows (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  subtitle   text not null default '',
  created_at timestamptz default now()
);

alter table public.planning_custom_rows enable row level security;
drop policy if exists "authenticated can manage custom rows" on public.planning_custom_rows;
create policy "authenticated can manage custom rows" on public.planning_custom_rows
  for all to authenticated using (true) with check (true);

create table if not exists public.planning_custom_blocks (
  id         uuid primary key default gen_random_uuid(),
  row_id     uuid not null references public.planning_custom_rows(id) on delete cascade,
  label      text not null default '',
  date_start text not null,
  date_end   text not null,
  color      text not null default '#6366f1',
  ot_id      uuid references public.ordres_transport(id) on delete set null,
  kind       text,
  created_at timestamptz default now()
);

alter table public.planning_custom_blocks enable row level security;
drop policy if exists "authenticated can manage custom blocks" on public.planning_custom_blocks;
create policy "authenticated can manage custom blocks" on public.planning_custom_blocks
  for all to authenticated using (true) with check (true);
