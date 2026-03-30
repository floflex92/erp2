-- Migration P1 : table et RLS pour le module Tasks (gestion de tâches utilisateur)

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profils(id) on delete cascade,
  title text not null,
  notes text null,
  completed boolean not null default false,
  due_date date null,
  priority text not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_user_id on public.tasks(user_id);

alter table public.tasks enable row level security;

-- Politique: les utilisateurs écrivent/lisent leurs tâches, admin/dirigeant peuvent tout lire/écrire.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_rw'
  ) THEN
    CREATE POLICY tasks_rw ON public.tasks
      FOR ALL TO authenticated
      USING (
        public.current_app_role() IN ('admin','dirigeant')
        OR user_id = (SELECT p.id FROM public.profils p WHERE p.user_id = auth.uid() LIMIT 1)
      )
      WITH CHECK (
        public.current_app_role() IN ('admin','dirigeant')
        OR user_id = (SELECT p.id FROM public.profils p WHERE p.user_id = auth.uid() LIMIT 1)
      );
  END IF;
END$$;
