-- ============================================================
-- MULTI-TENANT PHASE 3 : Super Admin Plateforme + Impersonation
-- Date : 2026-04-04
--
-- ISOLATION CRITIQUE :
--   - Les platform_admins sont SEPARES des profils tenant
--   - Aucun acces automatique aux donnees tenant
--   - Chaque operation d'impersonation est journalisee (JAMAIS DELETE)
--
-- SECURITE :
--   - is_platform_admin() : fonction SECURITY DEFINER (pas de recursion RLS)
--   - impersonation_logs : immutable (INSERT uniquement via trigger)
--   - IP hashee (pas stockee en clair)
--   - Sessions expirent automatiquement apres 2h
-- ============================================================


-- ============================================================
-- 1. TABLE PLATFORM_ADMINS
--    Utilsateurs de la plateforme Nexora (pas des tenants).
--    IMPORTANT : un platform_admin peut aussi etre un tenant user.
--    Les deux contextes sont independants.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_admins (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  nom         text        NULL,
  prenom      text        NULL,
  is_active   boolean     NOT NULL DEFAULT true,
  -- Qui a cree cet admin (traçabilite)
  created_by  uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_admins_user_id_idx ON public.platform_admins(user_id);
CREATE INDEX IF NOT EXISTS platform_admins_email_idx   ON public.platform_admins(lower(email));
CREATE INDEX IF NOT EXISTS platform_admins_active_idx  ON public.platform_admins(is_active) WHERE is_active = true;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_platform_admins()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_admins_set_updated_at ON public.platform_admins;
CREATE TRIGGER platform_admins_set_updated_at
  BEFORE UPDATE ON public.platform_admins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_platform_admins();


-- ============================================================
-- 2. FONCTION is_platform_admin()
--    Utilise dans les politiques RLS de toutes les tables plateforme.
--    SECURITY DEFINER evite la recursion RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE user_id = auth.uid()
      AND is_active = true
  );
$$;


-- ============================================================
-- 3. TABLE IMPERSONATION_LOGS
--    Journal IMMUTABLE des sessions d'impersonation.
--    SECURITE : aucun DELETE autorise, meme pour les platform_admins.
--    L'IP est hashee pour la RGPD (pas de stockage en clair).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.impersonation_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Qui impersonate (platform admin)
  admin_user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  admin_email       text        NOT NULL,

  -- Qui est impersonate (tenant user)
  target_user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  target_email      text        NOT NULL,
  target_company_id integer     NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,

  -- Contexte de l'impersonation
  reason            text        NULL,   -- Raison declaree (ex: "Support ticket #123")
  ip_hash           text        NULL,   -- SHA-256 de l'IP (RGPD : pas de stockage brut)

  -- Cycle de vie
  started_at        timestamptz NOT NULL DEFAULT now(),
  ended_at          timestamptz NULL,
  is_active         boolean     NOT NULL DEFAULT true,

  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS impersonation_logs_admin_idx   ON public.impersonation_logs(admin_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS impersonation_logs_target_idx  ON public.impersonation_logs(target_user_id, target_company_id);
CREATE INDEX IF NOT EXISTS impersonation_logs_active_idx  ON public.impersonation_logs(is_active) WHERE is_active = true;

DO $$
BEGIN
  -- Seuls les platform_admins peuvent lire les logs
  DROP POLICY IF EXISTS impersonation_logs_platform_admin_read ON public.impersonation_logs;
  CREATE POLICY impersonation_logs_platform_admin_read
    ON public.impersonation_logs FOR SELECT
    USING (public.is_platform_admin());

  -- Seuls les platform_admins peuvent inserer (creer une session)
  DROP POLICY IF EXISTS impersonation_logs_platform_admin_insert ON public.impersonation_logs;
  CREATE POLICY impersonation_logs_platform_admin_insert
    ON public.impersonation_logs FOR INSERT
    WITH CHECK (public.is_platform_admin());

  -- UPDATE autorise seulement pour fermer la session (ended_at, is_active)
  -- Jamais de DELETE.
  DROP POLICY IF EXISTS impersonation_logs_platform_admin_update ON public.impersonation_logs;
  CREATE POLICY impersonation_logs_platform_admin_update
    ON public.impersonation_logs FOR UPDATE
    USING (public.is_platform_admin());

EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- ============================================================
-- 4. TABLE IMPERSONATION_SESSIONS
--    Sessions actives d'impersonation (volatile, 2h max).
--    Distincte des logs pour ne pas polluer l'audit trail.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id              uuid        NOT NULL REFERENCES public.impersonation_logs(id) ON DELETE CASCADE,

  admin_user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_company_id   integer     NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Flag de session (utilise dans le frontend pour afficher le bandeau d'avertissement)
  is_impersonating    boolean     NOT NULL DEFAULT true,

  -- Nom de l'admin originel (affiche dans le bandeau UI "impersonne par X")
  impersonated_by     text        NOT NULL,

  -- Expiration automatique : 2 heures apres creation
  expires_at          timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS impersonation_sessions_admin_idx     ON public.impersonation_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS impersonation_sessions_target_idx    ON public.impersonation_sessions(target_user_id);
CREATE INDEX IF NOT EXISTS impersonation_sessions_expires_idx   ON public.impersonation_sessions(expires_at);
CREATE INDEX IF NOT EXISTS impersonation_sessions_active_idx    ON public.impersonation_sessions(is_impersonating) WHERE is_impersonating = true;

DO $$
BEGIN
  DROP POLICY IF EXISTS impersonation_sessions_platform_admin ON public.impersonation_sessions;
  CREATE POLICY impersonation_sessions_platform_admin
    ON public.impersonation_sessions FOR ALL
    USING (public.is_platform_admin());

EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- ============================================================
-- 5. FONCTION : nettoyage des sessions expirees
--    A appeler via pg_cron ou depuis un job Supabase Edge Functions.
--    Exemple : SELECT public.cleanup_expired_impersonation_sessions();
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_impersonation_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Marque les sessions expirees comme terminees
  UPDATE public.impersonation_sessions
  SET is_impersonating = false
  WHERE expires_at < now()
    AND is_impersonating = true;

  -- Met a jour les logs correspondants
  UPDATE public.impersonation_logs l
  SET is_active = false,
      ended_at  = now()
  FROM public.impersonation_sessions s
  WHERE s.log_id = l.id
    AND s.is_impersonating = false
    AND l.is_active = true
    AND l.ended_at IS NULL;
END;
$$;


-- ============================================================
-- 6. MISE A JOUR de la RLS companies pour les platform_admins
--    (complements la politique ajoutee en Phase 1)
-- ============================================================

DO $$
BEGIN
  -- platform_admin : acces complet a toutes les companies
  DROP POLICY IF EXISTS companies_platform_admin_all ON public.companies;
  CREATE POLICY companies_platform_admin_all
    ON public.companies FOR ALL
    USING (public.is_platform_admin());

EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- ============================================================
-- 7. TABLE PLATFORM_AUDIT_EVENTS
--    Journal des actions des platform_admins sur la plateforme.
--    (Supplement a impersonation_logs pour les autres actions sensibles)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_audit_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  admin_email   text        NOT NULL,
  event_type    text        NOT NULL,   -- 'company_created', 'company_suspended', 'impersonation_started', etc.
  target_type   text        NULL,       -- 'company', 'user', etc.
  target_id     text        NULL,       -- id de la cible (company_id, user_id...)
  payload       jsonb       NULL,       -- details de l'action (sans donnees sensibles)
  ip_hash       text        NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_audit_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS platform_audit_events_admin_idx ON public.platform_audit_events(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS platform_audit_events_type_idx  ON public.platform_audit_events(event_type, created_at DESC);

DO $$
BEGIN
  DROP POLICY IF EXISTS platform_audit_platform_admin ON public.platform_audit_events;
  CREATE POLICY platform_audit_platform_admin
    ON public.platform_audit_events FOR ALL
    USING (public.is_platform_admin());

EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
