-- Comptes de demonstration / prospects / investisseurs
-- - Role par defaut: dirigeant
-- - Demande publique d'acces test depuis la page de connexion
-- - Gestion et tracabilite des changements de role

ALTER TABLE public.profils
  ALTER COLUMN role SET DEFAULT 'dirigeant';

ALTER TABLE public.profils
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'actif',
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_demo_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_investor_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_origin text NOT NULL DEFAULT 'manuel_admin',
  ADD COLUMN IF NOT EXISTS assigned_by_admin uuid NULL,
  ADD COLUMN IF NOT EXISTS requested_from_public_form boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS notes_admin text NULL,
  ADD COLUMN IF NOT EXISTS last_role_change_at timestamptz NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profils_assigned_by_admin_fkey'
  ) THEN
    ALTER TABLE public.profils
      ADD CONSTRAINT profils_assigned_by_admin_fkey
      FOREIGN KEY (assigned_by_admin)
      REFERENCES public.profils(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE public.profils DROP CONSTRAINT IF EXISTS profils_role_check;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profils_role_token_check'
  ) THEN
    ALTER TABLE public.profils
      ADD CONSTRAINT profils_role_token_check
      CHECK (role ~ '^[a-z0-9_]{2,64}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profils_account_status_check'
  ) THEN
    ALTER TABLE public.profils
      ADD CONSTRAINT profils_account_status_check
      CHECK (account_status IN ('actif', 'suspendu', 'archive', 'desactive'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profils_account_type_check'
  ) THEN
    ALTER TABLE public.profils
      ADD CONSTRAINT profils_account_type_check
      CHECK (account_type IN ('standard', 'test', 'prospect', 'investisseur', 'demo'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.project_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  company_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  need_type text NOT NULL,
  company_size text NULL,
  fleet_size integer NULL,
  employee_count integer NULL,
  message text NULL,
  accepted_policy boolean NOT NULL DEFAULT false,
  request_status text NOT NULL DEFAULT 'nouveau',
  lead_status text NOT NULL DEFAULT 'nouveau',
  source text NOT NULL DEFAULT 'demande_page_connexion',
  linked_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_profile_id uuid NULL REFERENCES public.profils(id) ON DELETE SET NULL,
  linked_role text NULL,
  created_account_email text NULL,
  account_created boolean NOT NULL DEFAULT false,
  requested_account_type text NOT NULL DEFAULT 'test',
  requested_role text NOT NULL DEFAULT 'dirigeant',
  assigned_by_admin uuid NULL REFERENCES public.profils(id) ON DELETE SET NULL,
  notes_admin text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_access_requests_status_check'
  ) THEN
    ALTER TABLE public.project_access_requests
      ADD CONSTRAINT project_access_requests_status_check
      CHECK (request_status IN ('nouveau', 'contacte', 'qualifie', 'compte_cree', 'refuse', 'archive'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_access_requests_lead_status_check'
  ) THEN
    ALTER TABLE public.project_access_requests
      ADD CONSTRAINT project_access_requests_lead_status_check
      CHECK (lead_status IN ('nouveau', 'contacte', 'qualifie', 'compte_cree', 'refuse'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS project_access_requests_created_at_idx
  ON public.project_access_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS project_access_requests_email_idx
  ON public.project_access_requests(lower(email));

CREATE INDEX IF NOT EXISTS project_access_requests_status_idx
  ON public.project_access_requests(request_status, lead_status);

CREATE TABLE IF NOT EXISTS public.user_role_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id uuid NULL REFERENCES public.profils(id) ON DELETE SET NULL,
  target_profile_id uuid NOT NULL REFERENCES public.profils(id) ON DELETE CASCADE,
  previous_role text NOT NULL,
  new_role text NOT NULL,
  change_reason text NULL,
  source text NOT NULL DEFAULT 'admin_interface',
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_role_change_log_target_idx
  ON public.user_role_change_log(target_profile_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.admin_can_manage_accounts()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profils p
    WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'dirigeant')
    LIMIT 1
  )
$$;

ALTER TABLE public.project_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_access_requests_insert_public ON public.project_access_requests;
CREATE POLICY project_access_requests_insert_public
  ON public.project_access_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (accepted_policy = true);

DROP POLICY IF EXISTS project_access_requests_admin_read ON public.project_access_requests;
CREATE POLICY project_access_requests_admin_read
  ON public.project_access_requests
  FOR SELECT
  TO authenticated
  USING (public.admin_can_manage_accounts());

DROP POLICY IF EXISTS project_access_requests_admin_update ON public.project_access_requests;
CREATE POLICY project_access_requests_admin_update
  ON public.project_access_requests
  FOR UPDATE
  TO authenticated
  USING (public.admin_can_manage_accounts())
  WITH CHECK (public.admin_can_manage_accounts());

DROP POLICY IF EXISTS project_access_requests_admin_delete ON public.project_access_requests;
CREATE POLICY project_access_requests_admin_delete
  ON public.project_access_requests
  FOR DELETE
  TO authenticated
  USING (public.admin_can_manage_accounts());

DROP POLICY IF EXISTS user_role_change_log_admin_read ON public.user_role_change_log;
CREATE POLICY user_role_change_log_admin_read
  ON public.user_role_change_log
  FOR SELECT
  TO authenticated
  USING (public.admin_can_manage_accounts());

DROP POLICY IF EXISTS user_role_change_log_admin_insert ON public.user_role_change_log;
CREATE POLICY user_role_change_log_admin_insert
  ON public.user_role_change_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.admin_can_manage_accounts());

CREATE OR REPLACE FUNCTION public.upsert_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_email     text;
  v_meta_role text;
  v_role      text;
  v_profile   public.profils;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifie';
  END IF;

  SELECT
    lower(trim(u.email)),
    lower(trim(coalesce(u.raw_app_meta_data->>'role', u.raw_user_meta_data->>'role', '')))
  INTO v_email, v_meta_role
  FROM auth.users u
  WHERE u.id = v_uid;

  v_meta_role := regexp_replace(v_meta_role, '[^a-z0-9_]+', '_', 'g');

  v_role := CASE
    WHEN v_email IN ('chabre.florent@gmail.com', 'admin@erp-demo.fr', 'contact@nexora-truck.fr') THEN 'admin'
    WHEN v_email = 'direction@erp-demo.fr' THEN 'dirigeant'
    WHEN length(v_meta_role) BETWEEN 2 AND 64 THEN v_meta_role
    ELSE 'dirigeant'
  END;

  INSERT INTO public.profils (user_id, role, account_origin)
  VALUES (v_uid, v_role, 'auto_auth_signup')
  ON CONFLICT (user_id) DO UPDATE
    SET role = excluded.role,
        updated_at = now()
  RETURNING * INTO v_profile;

  RETURN jsonb_build_object(
    'id', v_profile.id,
    'role', v_profile.role,
    'nom', v_profile.nom,
    'prenom', v_profile.prenom
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meta_role text;
  v_role      text;
  v_email     text := lower(trim(new.email));
BEGIN
  v_meta_role := lower(trim(coalesce(new.raw_app_meta_data->>'role', new.raw_user_meta_data->>'role', '')));
  v_meta_role := regexp_replace(v_meta_role, '[^a-z0-9_]+', '_', 'g');

  v_role := CASE
    WHEN v_email IN ('chabre.florent@gmail.com', 'admin@erp-demo.fr', 'contact@nexora-truck.fr') THEN 'admin'
    WHEN v_email = 'direction@erp-demo.fr' THEN 'dirigeant'
    WHEN length(v_meta_role) BETWEEN 2 AND 64 THEN v_meta_role
    ELSE 'dirigeant'
  END;

  INSERT INTO public.profils (user_id, role, account_origin)
  VALUES (new.id, v_role, 'auto_auth_signup')
  ON CONFLICT (user_id) DO UPDATE
    SET role = excluded.role,
        updated_at = now();

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
