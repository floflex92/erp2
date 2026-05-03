-- ============================================================
-- AUDIT LOT 2A — Inventaire tables: company_id + RLS + classification
-- A coller dans Supabase SQL Editor (service role requis)
-- Genere le 2026-05-03
-- ============================================================

-- ── 1. Vue d'ensemble: toutes les tables avec statut RLS ──────────────────────
SELECT
  t.table_schema,
  t.table_name,
  CASE WHEN c.relrowsecurity THEN 'OUI' ELSE 'NON ⚠️' END AS rls_active,
  CASE WHEN c.relforcerowsecurity THEN 'FORCE' ELSE 'non-force' END AS rls_forced
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY rls_active, t.table_name;


-- ── 2. Tables sans colonne company_id (candidates a corriger) ─────────────────
SELECT t.table_name
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT IN (
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'company_id'
  )
ORDER BY t.table_name;


-- ── 3. Tables avec company_id NULLABLE (risque fuite) ────────────────────────
SELECT table_name, column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'company_id'
  AND is_nullable = 'YES'
ORDER BY table_name;


-- ── 4. Policies RLS existantes par table ─────────────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ── 5. Tables metier SANS aucune policy RLS ───────────────────────────────────
SELECT t.table_name
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND c.relrowsecurity = TRUE  -- RLS activee mais...
  AND t.table_name NOT IN (
    SELECT tablename FROM pg_policies WHERE schemaname = 'public'
  )
ORDER BY t.table_name;


-- ── 6. Fonctions SECURITY DEFINER ────────────────────────────────────────────
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER ⚠️' ELSE 'SECURITY INVOKER' END AS security,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = TRUE
ORDER BY p.proname;


-- ── 7. Comptes sans tenant_users (orphelins potentiels) ──────────────────────
SELECT
  p.user_id,
  p.email,
  p.role,
  p.company_id,
  p.created_at
FROM profils p
LEFT JOIN tenant_users tu ON tu.user_id = p.user_id
WHERE tu.user_id IS NULL
  AND p.role NOT IN ('super_admin')  -- platform admins exclus intentionnellement
ORDER BY p.created_at DESC
LIMIT 100;


-- ── 8. Comptes avec tenant_users mais sans tenant_user_roles ─────────────────
SELECT
  p.user_id,
  p.email,
  p.role,
  tu.tenant_id,
  tu.id AS tenant_user_id
FROM profils p
JOIN tenant_users tu ON tu.user_id = p.user_id
LEFT JOIN tenant_user_roles tur ON tur.tenant_user_id = tu.id
WHERE tur.id IS NULL
ORDER BY p.created_at DESC
LIMIT 100;


-- ── 9. Distribution des company_id sur les tables tenant critiques ────────────
SELECT 'profils' AS table_name, company_id, COUNT(*) AS nb_lignes
FROM profils GROUP BY company_id
UNION ALL
SELECT 'conducteurs', company_id, COUNT(*) FROM conducteurs GROUP BY company_id
UNION ALL
SELECT 'vehicules', company_id, COUNT(*) FROM vehicules GROUP BY company_id
UNION ALL
SELECT 'ordres_transport', company_id, COUNT(*) FROM ordres_transport GROUP BY company_id
ORDER BY table_name, company_id;


-- ── 10. Lignes sans company_id sur tables critiques ───────────────────────────
SELECT 'profils' AS table_name, COUNT(*) AS nb_sans_company_id FROM profils WHERE company_id IS NULL
UNION ALL
SELECT 'conducteurs', COUNT(*) FROM conducteurs WHERE company_id IS NULL
UNION ALL
SELECT 'vehicules', COUNT(*) FROM vehicules WHERE company_id IS NULL
UNION ALL
SELECT 'ordres_transport', COUNT(*) FROM ordres_transport WHERE company_id IS NULL
UNION ALL
SELECT 'sites_logistiques', COUNT(*) FROM sites_logistiques WHERE company_id IS NULL
UNION ALL
SELECT 'driver_groups', COUNT(*) FROM driver_groups WHERE company_id IS NULL
UNION ALL
SELECT 'transport_relais', COUNT(*) FROM transport_relais WHERE company_id IS NULL;


-- ── BACKFILL: Mettre a jour les lignes sans company_id (a adapter) ────────────
-- ATTENTION: a executer seulement apres validation de l'inventaire ci-dessus.
-- Remplacer 1 par le company_id cible pour les donnees legacy.

-- UPDATE profils SET company_id = 1 WHERE company_id IS NULL;
-- UPDATE conducteurs SET company_id = 1 WHERE company_id IS NULL;
-- UPDATE vehicules SET company_id = 1 WHERE company_id IS NULL;
-- UPDATE ordres_transport SET company_id = 1 WHERE company_id IS NULL;
-- UPDATE sites_logistiques SET company_id = 1 WHERE company_id IS NULL;
-- UPDATE driver_groups SET company_id = 1 WHERE company_id IS NULL;
-- UPDATE transport_relais SET company_id = 1 WHERE company_id IS NULL;


-- ── ADD COLUMN: Ajouter company_id aux tables qui n'en ont pas ────────────────
-- A executer apres l'inventaire etape 2.
-- Exemple pour sites_logistiques si company_id manque:
-- ALTER TABLE sites_logistiques ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id);
-- UPDATE sites_logistiques SET company_id = 1 WHERE company_id IS NULL;
-- ALTER TABLE sites_logistiques ALTER COLUMN company_id SET NOT NULL;

-- Meme pattern pour: driver_groups, driver_group_members, transport_relais, tachygraphe_entrees, config_entreprise


-- ── RLS TEMPLATES: A activer sur chaque table tenant ─────────────────────────
-- Pattern standard a appliquer sur toutes les tables classifiees "tenant":

/*
-- Activer RLS
ALTER TABLE sites_logistiques ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: l'utilisateur doit etre dans tenant_users pour ce tenant
CREATE POLICY "tenant_select" ON sites_logistiques
  FOR SELECT
  USING (
    company_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Policy INSERT: meme condition
CREATE POLICY "tenant_insert" ON sites_logistiques
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Policy UPDATE
CREATE POLICY "tenant_update" ON sites_logistiques
  FOR UPDATE
  USING (
    company_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Policy DELETE
CREATE POLICY "tenant_delete" ON sites_logistiques
  FOR DELETE
  USING (
    company_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );
*/

-- ── TEST ISOLATION: Tenant A ne lit pas Tenant B ──────────────────────────────
-- A executer avec le user_id d'un utilisateur appartenant a company_id=1
-- et verifier que les resultats ne contiennent que company_id=1.
-- Remplacer <user_id_tenant_a> par un UUID reel.

/*
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '<user_id_tenant_a>';

-- Ce SELECT ne doit retourner que les lignes de company_id=1
SELECT id, company_id FROM sites_logistiques LIMIT 10;
SELECT id, tenant_id FROM tenant_users LIMIT 10;

RESET ROLE;
*/
