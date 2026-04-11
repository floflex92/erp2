-- =============================================================================
-- Migration : Activation RLS sur les 4 tables publiques non sécurisées
-- Tables concernées : erp_v11_tenants, permissions, platform_admins, role_permissions
-- Signalement Supabase : rls_disabled_in_public (07 Apr 2026)
-- =============================================================================

-- ── 1. erp_v11_tenants ────────────────────────────────────────────────────────
-- Table de configuration des tenants ERP inter-connectés.
-- • Lecture : utilisateurs authentifiés (pour connaître le tenant courant)
-- • Écriture : platform_admins uniquement

ALTER TABLE public.erp_v11_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS erp_v11_tenants_select_authenticated ON public.erp_v11_tenants;
CREATE POLICY erp_v11_tenants_select_authenticated
  ON public.erp_v11_tenants
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS erp_v11_tenants_manage_platform_admin ON public.erp_v11_tenants;
CREATE POLICY erp_v11_tenants_manage_platform_admin
  ON public.erp_v11_tenants
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ── 2. permissions ────────────────────────────────────────────────────────────
-- Référentiel des permissions disponibles dans le système.
-- • Lecture : utilisateurs authentifiés (nécessaire pour l'UI de gestion des rôles)
-- • Écriture : platform_admins uniquement (référentiel géré en interne)

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS permissions_select_authenticated ON public.permissions;
CREATE POLICY permissions_select_authenticated
  ON public.permissions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS permissions_manage_platform_admin ON public.permissions;
CREATE POLICY permissions_manage_platform_admin
  ON public.permissions
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ── 3. platform_admins ────────────────────────────────────────────────────────
-- Table ultra-sensible : liste des administrateurs de la plateforme.
-- • Lecture : platform_admins uniquement (pas d'accès pour les utilisateurs normaux)
-- • Écriture : platform_admins uniquement
-- • Aucun accès anonymous (anon role)

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_admins_select_self ON public.platform_admins;
CREATE POLICY platform_admins_select_self
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS platform_admins_manage_platform_admin ON public.platform_admins;
CREATE POLICY platform_admins_manage_platform_admin
  ON public.platform_admins
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ── 4. role_permissions ───────────────────────────────────────────────────────
-- Table de liaison rôles ↔ permissions.
-- • Lecture : utilisateurs authentifiés (nécessaire pour vérifier les droits)
-- • Écriture : platform_admins uniquement

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS role_permissions_select_authenticated ON public.role_permissions;
CREATE POLICY role_permissions_select_authenticated
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS role_permissions_manage_platform_admin ON public.role_permissions;
CREATE POLICY role_permissions_manage_platform_admin
  ON public.role_permissions
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
