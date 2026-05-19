-- Migration de priorité haute  P0 : intégrité utilisateurs / tenant / RLS
-- 1) Contrainte de cle étrangère profils.user_id -> auth.users.id
-- 2) RLS sur tables utilisateurs et entreprise
create table if not exists public.profils (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  role text not null default 'conducteur',
  nom text null,
  prenom text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Assure la contrainte FK dans un bloc idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profils_user_id_fkey'
  ) THEN
    ALTER TABLE public.profils
      ADD CONSTRAINT profils_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- RLS avec policy conservatrice (admin/dirigeant):
ALTER TABLE public.profils ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' and tablename = 'profils' and policyname = 'profils_admin_user'
  ) THEN
    CREATE POLICY profils_admin_user
      ON public.profils
      FOR ALL
      TO authenticated
      USING (public.current_app_role() IN ('admin', 'dirigeant'))
      WITH CHECK (public.current_app_role() IN ('admin', 'dirigeant'));
  END IF;
END $$;

-- attaques résiduelles
ALTER TABLE public.config_entreprise ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' and tablename = 'config_entreprise' and policyname = 'config_entreprise_admin'
  ) THEN
    CREATE POLICY config_entreprise_admin
      ON public.config_entreprise
      FOR ALL
      TO authenticated
      USING (public.current_app_role() IN ('admin', 'dirigeant'))
      WITH CHECK (public.current_app_role() IN ('admin', 'dirigeant'));
  END IF;
END $$;
