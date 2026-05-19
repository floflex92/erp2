-- ============================================================
-- Dépôts : isolation tenant + seed 2 dépôts pour Tenant Test
-- ============================================================
-- 1. Fonction helper : company_id de l'utilisateur connecté
-- 2. RLS sites_logistiques : filtre par company_id (isolation tenant)
-- 3. Seed : 2 dépôts (type_site='depot') pour tenant test (company_id=1)
-- ============================================================

-- ── 1. Helper get_user_company_id() ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT company_id FROM public.profils WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_company_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;

-- ── 2. RLS sites_logistiques : isolation par tenant ───────────────────────────

DROP POLICY IF EXISTS "sites_log_staff_read" ON public.sites_logistiques;
DROP POLICY IF EXISTS "sites_log_ops_write"  ON public.sites_logistiques;
DROP POLICY IF EXISTS "sites_logistiques_rw" ON public.sites_logistiques;

-- Lecture : tout staff du même tenant
CREATE POLICY "sites_log_staff_read" ON public.sites_logistiques
  FOR SELECT TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND public.get_user_role() IN (
      'admin','dirigeant','exploitant','mecanicien','commercial',
      'comptable','rh','conducteur','logisticien'
    )
  );

-- Écriture : rôles opérationnels du même tenant
CREATE POLICY "sites_log_ops_write" ON public.sites_logistiques
  FOR ALL TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND public.get_user_role() IN ('admin','dirigeant','exploitant','logisticien')
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.get_user_role() IN ('admin','dirigeant','exploitant','logisticien')
  );

-- ── 3. Clients de référence pour tenant test (idempotent) ────────────────────
-- Nécessaires comme entreprise_id pour les dépôts.
-- Correspondent aux clients de demo du seed principal.

INSERT INTO public.clients (id, nom, type_client, actif, company_id)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Transfrais Nord', 'chargeur', true, 1),
  ('20000000-0000-0000-0000-000000000002', 'Batilog Est',     'chargeur', true, 1)
ON CONFLICT (id) DO NOTHING;

-- ── 4. Seed : 2 dépôts pour Tenant Test (company_id = 1) ─────────────────────
-- Les entreprise_id référencent des clients existants du seed principal (company_id = 1)
-- Transfrais Nord : 20000000-0000-0000-0000-000000000001
-- Batilog Est     : 20000000-0000-0000-0000-000000000002

INSERT INTO public.sites_logistiques (
  id,
  nom,
  adresse,
  code_postal,
  ville,
  pays,
  entreprise_id,
  type_site,
  est_depot_relais,
  contact_nom,
  contact_tel,
  capacite_m3,
  horaires_ouverture,
  notes,
  latitude,
  longitude,
  usage_type,
  company_id
) VALUES
(
  'dd000000-0001-0000-0000-000000000001',
  'Dépôt Transfrais Villeneuve-d''Ascq',
  '45 rue du Grand Carrefour',
  '59650',
  'Villeneuve-d''Ascq',
  'France',
  '20000000-0000-0000-0000-000000000001',
  'depot',
  true,
  'Pierre Dumoulin',
  '03 20 10 10 11',
  1200,
  'Lu-Ve 6h-22h / Sa 7h-14h',
  'Dépôt frigorifique multi-températures. Quai 12 portes. Zone ADR séparée. Dépôt relais autorisé.',
  50.6456,
  3.1409,
  'mixte',
  1
),
(
  'dd000000-0002-0000-0000-000000000002',
  'Dépôt Batilog Neuves-Maisons',
  '12 avenue de la Sidérurgie',
  '54230',
  'Neuves-Maisons',
  'France',
  '20000000-0000-0000-0000-000000000002',
  'depot',
  false,
  'Sophie Marchal',
  '03 83 40 20 21',
  580,
  'Lu-Ve 7h-19h',
  'Dépôt palettes et colis lourds. Pont roulant disponible. Accès camion 25t maxi.',
  48.5908,
  6.1282,
  'livraison',
  1
)
ON CONFLICT (id) DO UPDATE SET
  nom                = EXCLUDED.nom,
  adresse            = EXCLUDED.adresse,
  code_postal        = EXCLUDED.code_postal,
  ville              = EXCLUDED.ville,
  pays               = EXCLUDED.pays,
  entreprise_id      = EXCLUDED.entreprise_id,
  type_site          = EXCLUDED.type_site,
  est_depot_relais   = EXCLUDED.est_depot_relais,
  contact_nom        = EXCLUDED.contact_nom,
  contact_tel        = EXCLUDED.contact_tel,
  capacite_m3        = EXCLUDED.capacite_m3,
  horaires_ouverture = EXCLUDED.horaires_ouverture,
  notes              = EXCLUDED.notes,
  latitude           = EXCLUDED.latitude,
  longitude          = EXCLUDED.longitude,
  usage_type         = EXCLUDED.usage_type,
  company_id         = EXCLUDED.company_id;
