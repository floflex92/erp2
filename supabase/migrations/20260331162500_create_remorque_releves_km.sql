create table if not exists public.remorque_releves_km (
  id uuid primary key default gen_random_uuid(),
  remorque_id uuid not null references public.remorques(id) on delete cascade,
  reading_date date not null,
  km_compteur integer not null,
  source text null,
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint remorque_releves_km_unique unique (remorque_id, reading_date)
);

create index if not exists remorque_releves_km_remorque_idx
  on public.remorque_releves_km(remorque_id, reading_date);

alter table public.remorque_releves_km enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'remorque_releves_km'
      and policyname = 'remorque_releves_km_rw_flotte'
  ) then
    create policy remorque_releves_km_rw_flotte
      on public.remorque_releves_km
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.profils p
          where p.user_id = auth.uid()
            and p.role in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
        )
      )
      with check (
        exists (
          select 1
          from public.profils p
          where p.user_id = auth.uid()
            and p.role in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
        )
      );
  end if;
end $$;
