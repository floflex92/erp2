-- ============================================================
-- MULTI-TENANT AUTH REFACTOR
-- Date : 2026-04-15
--
-- Objectif : Structurer proprement le systeme tenant / user / role
-- pour un SaaS multi-tenant reel.
--
-- TABLES CREEES / MODIFIEES :
--   1. roles        : ajout scope ('platform' | 'tenant')
--   2. tenant_users : junction user ↔ tenant (avec default_role)
--   3. tenant_user_roles : junction tenant_user ↔ role
--   4. admin_impersonation_sessions : sessions impersonation par role
--   5. platform_admins : upsert super admin florent
--   6. Backfill tenant_users depuis profils existants
--
-- STRATEGIE : ADDITIF UNIQUEMENT - rien n'est supprime.
-- profils.role reste fonctionnel comme fallback.
-- ============================================================


-- ============================================================
-- 1. ROLES : ajout du scope ('platform' | 'tenant')
-- ============================================================

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'tenant'
    CHECK (scope IN ('platform', 'tenant'));

-- Marquer le role super_admin comme scope platform
UPDATE public.roles
SET scope = 'platform'
WHERE name = 'super_admin';

-- Ajouter le role SUPER_ADMIN platform-level s'il n'existe pas
-- (company_id=1 pour les roles systeme, scope=platform)
INSERT INTO public.roles (company_id, name, label, is_system, scope)
VALUES (1, 'super_admin', 'Super Administrateur Plateforme', true, 'platform')
ON CONFLICT (company_id, name) DO UPDATE SET scope = 'platform', label = 'Super Administrateur Plateforme';


-- ============================================================
-- 2. TABLE TENANT_USERS
--    Junction : un auth.user peut appartenir a plusieurs tenants.
--    Un user metier a au moins un tenant_user.
--    Un platform_admin n'a PAS besoin de tenant_user.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_users (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       integer     NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_role_id integer     NULL REFERENCES public.roles(id) ON DELETE SET NULL,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS tenant_users_tenant_idx ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS tenant_users_user_idx ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS tenant_users_active_idx ON public.tenant_users(is_active) WHERE is_active = true;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_tenant_users()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_users_set_updated_at ON public.tenant_users;
CREATE TRIGGER tenant_users_set_updated_at
  BEFORE UPDATE ON public.tenant_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_tenant_users();


-- ============================================================
-- 3. TABLE TENANT_USER_ROLES
--    Junction : un tenant_user peut avoir plusieurs roles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_user_roles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_user_id  uuid        NOT NULL REFERENCES public.tenant_users(id) ON DELETE CASCADE,
  role_id         integer     NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  granted_by      uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_user_id, role_id)
);

CREATE INDEX IF NOT EXISTS tenant_user_roles_tu_idx ON public.tenant_user_roles(tenant_user_id);
CREATE INDEX IF NOT EXISTS tenant_user_roles_role_idx ON public.tenant_user_roles(role_id);


-- ============================================================
-- 4. TABLE ADMIN_IMPERSONATION_SESSIONS
--    Remplace impersonation_sessions pour supporter l'impersonation
--    par role (sans user cible obligatoire).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_impersonation_sessions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id               integer     NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  selected_role_id        integer     NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  -- Optionnel : si on impersonne un utilisateur specifique
  target_user_id          uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Metadonnees pour le bandeau UI
  admin_email             text        NOT NULL,
  tenant_name             text        NOT NULL DEFAULT '',
  role_label              text        NOT NULL DEFAULT '',
  started_at              timestamptz NOT NULL DEFAULT now(),
  ended_at                timestamptz NULL,
  is_active               boolean     NOT NULL DEFAULT true,
  -- Expiration auto : 2 heures
  expires_at              timestamptz NOT NULL DEFAULT (now() + interval '2 hours')
);

ALTER TABLE public.admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ais_admin_idx ON public.admin_impersonation_sessions(super_admin_user_id);
CREATE INDEX IF NOT EXISTS ais_tenant_idx ON public.admin_impersonation_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS ais_active_idx ON public.admin_impersonation_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS ais_expires_idx ON public.admin_impersonation_sessions(expires_at);

DO $$
BEGIN
  DROP POLICY IF EXISTS ais_platform_admin_all ON public.admin_impersonation_sessions;
  CREATE POLICY ais_platform_admin_all
    ON public.admin_impersonation_sessions FOR ALL
    USING (public.is_platform_admin());
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ============================================================
-- 5. FONCTION : cleanup des sessions d'impersonation expirees
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_admin_impersonation_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_impersonation_sessions
  SET is_active = false, ended_at = now()
  WHERE expires_at < now() AND is_active = true;
END;
$$;


-- ============================================================
-- 6. FONCTIONS HELPERS (SECURITY DEFINER)
-- ============================================================

-- Retourne le tenant_id courant de l'utilisateur connecte
-- (premier tenant actif s'il y en a plusieurs)
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tu.tenant_id
  FROM public.tenant_users tu
  WHERE tu.user_id = auth.uid()
    AND tu.is_active = true
  ORDER BY tu.created_at ASC
  LIMIT 1;
$$;

-- Retourne le role actif de l'utilisateur connecte
-- Priorite : impersonation > tenant_user default_role > profils.role
CREATE OR REPLACE FUNCTION public.get_active_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- 1. Session d'impersonation active
    (
      SELECT r.name
      FROM public.admin_impersonation_sessions ais
      JOIN public.roles r ON r.id = ais.selected_role_id
      WHERE ais.super_admin_user_id = auth.uid()
        AND ais.is_active = true
        AND ais.expires_at > now()
      ORDER BY ais.started_at DESC
      LIMIT 1
    ),
    -- 2. Role par defaut du tenant_user
    (
      SELECT r.name
      FROM public.tenant_users tu
      JOIN public.roles r ON r.id = tu.default_role_id
      WHERE tu.user_id = auth.uid()
        AND tu.is_active = true
      ORDER BY tu.created_at ASC
      LIMIT 1
    ),
    -- 3. Fallback legacy : profils.role
    (
      SELECT p.role
      FROM public.profils p
      WHERE p.user_id = auth.uid()
      LIMIT 1
    )
  );
$$;


-- ============================================================
-- 7. UPSERT SUPER ADMIN : chabre.florent@gmail.com
--    Si le user existe dans auth.users, on l'ajoute a platform_admins.
--    Sinon on le signale (la creation du user est cote Supabase Auth).
-- ============================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Cherche le user dans auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'chabre.florent@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Upsert dans platform_admins
    INSERT INTO public.platform_admins (user_id, email, nom, prenom, is_active)
    VALUES (v_user_id, 'chabre.florent@gmail.com', 'Chabre', 'Florent', true)
    ON CONFLICT (user_id) DO UPDATE SET
      email = 'chabre.florent@gmail.com',
      nom = 'Chabre',
      prenom = 'Florent',
      is_active = true,
      updated_at = now();

    -- S'assurer que le profil a bien role = super_admin
    UPDATE public.profils
    SET role = 'super_admin'
    WHERE user_id = v_user_id
      AND role != 'super_admin';

    RAISE NOTICE 'Platform admin chabre.florent@gmail.com upserted (user_id=%)', v_user_id;
  ELSE
    RAISE NOTICE 'User chabre.florent@gmail.com not found in auth.users - will be created at first login.';
  END IF;
END $$;


-- ============================================================
-- 8. BACKFILL TENANT_USERS depuis profils existants
--    Chaque profil avec un company_id et un user_id est migre
--    vers tenant_users avec le role correspondant.
-- ============================================================

INSERT INTO public.tenant_users (tenant_id, user_id, default_role_id, is_active)
SELECT
  COALESCE(p.company_id, 1) AS tenant_id,
  p.user_id,
  r.id AS default_role_id,
  COALESCE(p.is_active, true) AS is_active
FROM public.profils p
LEFT JOIN public.roles r
  ON r.name = p.role
  AND r.company_id = COALESCE(p.company_id, 1)
WHERE p.user_id IS NOT NULL
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Backfill tenant_user_roles depuis le role par defaut
INSERT INTO public.tenant_user_roles (tenant_user_id, role_id)
SELECT tu.id, tu.default_role_id
FROM public.tenant_users tu
WHERE tu.default_role_id IS NOT NULL
ON CONFLICT (tenant_user_id, role_id) DO NOTHING;


-- ============================================================
-- 9. RLS POLICIES pour tenant_users et tenant_user_roles
-- ============================================================

ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Platform admin : acces a tout
  DROP POLICY IF EXISTS tenant_users_platform_admin ON public.tenant_users;
  CREATE POLICY tenant_users_platform_admin
    ON public.tenant_users FOR ALL
    USING (public.is_platform_admin());

  -- Utilisateur : voit ses propres liaisons tenant
  DROP POLICY IF EXISTS tenant_users_own ON public.tenant_users;
  CREATE POLICY tenant_users_own
    ON public.tenant_users FOR SELECT
    USING (user_id = auth.uid());

  -- Admin tenant : voit les users de son tenant
  DROP POLICY IF EXISTS tenant_users_tenant_admin ON public.tenant_users;
  CREATE POLICY tenant_users_tenant_admin
    ON public.tenant_users FOR SELECT
    USING (
      tenant_id IN (
        SELECT tu.tenant_id
        FROM public.tenant_users tu
        JOIN public.roles r ON r.id = tu.default_role_id
        WHERE tu.user_id = auth.uid()
          AND tu.is_active = true
          AND r.name IN ('admin', 'dirigeant')
      )
    );

EXCEPTION WHEN OTHERS THEN NULL;
END $$;


ALTER TABLE public.tenant_user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Platform admin : acces a tout
  DROP POLICY IF EXISTS tur_platform_admin ON public.tenant_user_roles;
  CREATE POLICY tur_platform_admin
    ON public.tenant_user_roles FOR ALL
    USING (public.is_platform_admin());

  -- Utilisateur : voit ses propres roles
  DROP POLICY IF EXISTS tur_own ON public.tenant_user_roles;
  CREATE POLICY tur_own
    ON public.tenant_user_roles FOR SELECT
    USING (
      tenant_user_id IN (
        SELECT id FROM public.tenant_users WHERE user_id = auth.uid()
      )
    );

EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ============================================================
-- 10. FONCTION : get_user_tenants()
--     Retourne tous les tenants de l'utilisateur connecte
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_tenants()
RETURNS TABLE (
  tenant_id integer,
  tenant_name text,
  tenant_slug text,
  tenant_status text,
  default_role text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS tenant_id,
    c.name AS tenant_name,
    c.slug AS tenant_slug,
    c.status AS tenant_status,
    r.name AS default_role,
    tu.is_active
  FROM public.tenant_users tu
  JOIN public.companies c ON c.id = tu.tenant_id
  LEFT JOIN public.roles r ON r.id = tu.default_role_id
  WHERE tu.user_id = auth.uid()
    AND tu.is_active = true
  ORDER BY tu.created_at ASC;
$$;


-- ============================================================
-- 11. FONCTION : start_impersonation_session
--     Demarre une session d'impersonation pour un super admin.
--     Retourne l'id de la session creee.
-- ============================================================

CREATE OR REPLACE FUNCTION public.start_impersonation_session(
  p_tenant_id integer,
  p_role_id integer,
  p_target_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_admin_email text;
  v_tenant_name text;
  v_role_label text;
BEGIN
  -- Verifier que l'appelant est un platform admin
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: not a platform admin';
  END IF;

  -- Fermer les sessions actives precedentes
  UPDATE public.admin_impersonation_sessions
  SET is_active = false, ended_at = now()
  WHERE super_admin_user_id = auth.uid()
    AND is_active = true;

  -- Recuperer les metadonnees
  SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();
  SELECT name INTO v_tenant_name FROM public.companies WHERE id = p_tenant_id;
  SELECT label INTO v_role_label FROM public.roles WHERE id = p_role_id;

  -- Creer la session
  INSERT INTO public.admin_impersonation_sessions (
    super_admin_user_id, tenant_id, selected_role_id,
    target_user_id, admin_email, tenant_name, role_label
  ) VALUES (
    auth.uid(), p_tenant_id, p_role_id,
    p_target_user_id, v_admin_email, v_tenant_name, v_role_label
  )
  RETURNING id INTO v_session_id;

  -- Log dans impersonation_logs si la table existe
  BEGIN
    INSERT INTO public.impersonation_logs (
      admin_user_id, admin_email,
      target_user_id, target_email, target_company_id,
      reason
    ) VALUES (
      auth.uid(), v_admin_email,
      COALESCE(p_target_user_id, auth.uid()),
      COALESCE((SELECT email FROM auth.users WHERE id = p_target_user_id), 'role-only'),
      p_tenant_id,
      format('Impersonation role: %s in tenant: %s', v_role_label, v_tenant_name)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Si impersonation_logs n'a pas les bonnes contraintes, on ignore
    NULL;
  END;

  RETURN v_session_id;
END;
$$;


-- ============================================================
-- 12. FONCTION : end_impersonation_session
-- ============================================================

CREATE OR REPLACE FUNCTION public.end_impersonation_session()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: not a platform admin';
  END IF;

  UPDATE public.admin_impersonation_sessions
  SET is_active = false, ended_at = now()
  WHERE super_admin_user_id = auth.uid()
    AND is_active = true;

  -- Met a jour les logs correspondants
  UPDATE public.impersonation_logs
  SET is_active = false, ended_at = now()
  WHERE admin_user_id = auth.uid()
    AND is_active = true
    AND ended_at IS NULL;
END;
$$;


-- ============================================================
-- 13. FONCTION : get_active_impersonation
--     Retourne la session d'impersonation active (si elle existe)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_active_impersonation()
RETURNS TABLE (
  session_id uuid,
  tenant_id integer,
  tenant_name text,
  role_id integer,
  role_label text,
  role_name text,
  admin_email text,
  target_user_id uuid,
  started_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ais.id AS session_id,
    ais.tenant_id,
    ais.tenant_name,
    ais.selected_role_id AS role_id,
    ais.role_label,
    r.name AS role_name,
    ais.admin_email,
    ais.target_user_id,
    ais.started_at,
    ais.expires_at
  FROM public.admin_impersonation_sessions ais
  JOIN public.roles r ON r.id = ais.selected_role_id
  WHERE ais.super_admin_user_id = auth.uid()
    AND ais.is_active = true
    AND ais.expires_at > now()
  ORDER BY ais.started_at DESC
  LIMIT 1;
$$;
