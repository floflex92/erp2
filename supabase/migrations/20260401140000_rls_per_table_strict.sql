-- Hardening RLS par table : remplace les fallbacks generiques (auth.uid() IS NOT NULL)
-- par des policies metier strictes avec restrictions par role.
--
-- Groupes de roles utilises :
--   internal_staff : admin, dirigeant, exploitant, mecanicien, commercial, comptable, rh, conducteur
--   ops_write      : admin, dirigeant, exploitant
--   fleet_write    : admin, dirigeant, exploitant, mecanicien
--   rh_write       : admin, dirigeant, rh, exploitant
--   finance        : admin, dirigeant, comptable, exploitant
--   config_mgmt    : admin, dirigeant
--   commercial_mgmt: admin, dirigeant, commercial

-- ============================================================
-- Fonction helper: get_user_role()
-- SECURITY DEFINER avec search_path explicite pour eviter l'injection de schema.
-- Evite une jointure profils par ligne dans chaque policy (performance + securite).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.profils WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- ============================================================
-- config_entreprise : admin/dirigeant uniquement (donnees systeme sensibles)
-- ============================================================
DROP POLICY IF EXISTS "role_guard_config_entreprise"                ON public.config_entreprise;
DROP POLICY IF EXISTS "config_entreprise_r"                         ON public.config_entreprise;
DROP POLICY IF EXISTS "config_entreprise_w"                         ON public.config_entreprise;

CREATE POLICY "config_entreprise_mgmt" ON public.config_entreprise
  FOR ALL TO authenticated
  USING   (public.get_user_role() IN ('admin','dirigeant'))
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant'));

-- ============================================================
-- rapports_conducteurs : rh/admin/dirigeant (tous) + conducteur (ses propres rapports)
-- ============================================================
DROP POLICY IF EXISTS "role_guard_rapports_conducteurs"             ON public.rapports_conducteurs;
DROP POLICY IF EXISTS "Authenticated read rapports"                 ON public.rapports_conducteurs;
DROP POLICY IF EXISTS "rapports_cond_staff_r"                       ON public.rapports_conducteurs;
DROP POLICY IF EXISTS "rapports_cond_w"                             ON public.rapports_conducteurs;

CREATE POLICY "rapports_cond_read" ON public.rapports_conducteurs
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('admin','dirigeant','rh','exploitant')
    OR (
      public.get_user_role() = 'conducteur'
      AND conducteur_id IN (
        SELECT c.id
        FROM public.conducteurs c
        JOIN auth.users u ON lower(u.email) = lower(c.email)
        WHERE u.id = auth.uid()
      )
    )
  );

CREATE POLICY "rapports_cond_write" ON public.rapports_conducteurs
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','rh','exploitant'));

CREATE POLICY "rapports_cond_update" ON public.rapports_conducteurs
  FOR UPDATE TO authenticated
  USING   (public.get_user_role() IN ('admin','dirigeant','rh'))
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','rh'));

CREATE POLICY "rapports_cond_delete" ON public.rapports_conducteurs
  FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('admin','dirigeant'));

-- ============================================================
-- prospects : commercial/dirigeant/admin uniquement
-- ============================================================
DROP POLICY IF EXISTS "role_guard_prospects"                        ON public.prospects;
DROP POLICY IF EXISTS "admin_all_prospects"                         ON public.prospects;

CREATE POLICY "prospects_commercial_rw" ON public.prospects
  FOR ALL TO authenticated
  USING   (public.get_user_role() IN ('admin','dirigeant','commercial'))
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','commercial'));

-- ============================================================
-- ordres_transport : lecture = tous les staffs internes ; ecriture = ops
-- ============================================================
DROP POLICY IF EXISTS "role_guard_ordres_transport"                 ON public.ordres_transport;

CREATE POLICY "ot_staff_read" ON public.ordres_transport
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN (
    'admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh','conducteur'
  ));

CREATE POLICY "ot_ops_insert" ON public.ordres_transport
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant'));

CREATE POLICY "ot_ops_update" ON public.ordres_transport
  FOR UPDATE TO authenticated
  USING   (public.get_user_role() IN ('admin','dirigeant','exploitant'))
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant'));

CREATE POLICY "ot_ops_delete" ON public.ordres_transport
  FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('admin','dirigeant','exploitant'));

-- ============================================================
-- conducteurs : lecture = tous les staffs internes ; ecriture = rh/ops
-- ============================================================
DROP POLICY IF EXISTS "role_guard_conducteurs"                      ON public.conducteurs;

CREATE POLICY "conducteurs_staff_read" ON public.conducteurs
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN (
    'admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh','conducteur'
  ));

CREATE POLICY "conducteurs_rh_write" ON public.conducteurs
  FOR ALL TO authenticated
  USING   (public.get_user_role() IN ('admin','dirigeant','exploitant','rh'))
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant','rh'));

-- ============================================================
-- vehicules : lecture = tous les staffs internes ; ecriture = fleet
-- ============================================================
DROP POLICY IF EXISTS "role_guard_vehicules"                        ON public.vehicules;

CREATE POLICY "vehicules_staff_read" ON public.vehicules
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN (
    'admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh','conducteur'
  ));

CREATE POLICY "vehicules_fleet_write" ON public.vehicules
  FOR ALL TO authenticated
  USING   (public.get_user_role() IN ('admin','dirigeant','exploitant','mecanicien'))
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant','mecanicien'));

-- ============================================================
-- remorques : lecture = tous les staffs internes ; ecriture = fleet
-- ============================================================
DROP POLICY IF EXISTS "role_guard_remorques"                        ON public.remorques;

CREATE POLICY "remorques_staff_read" ON public.remorques
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN (
    'admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh','conducteur'
  ));

CREATE POLICY "remorques_fleet_write" ON public.remorques
  FOR ALL TO authenticated
  USING   (public.get_user_role() IN ('admin','dirigeant','exploitant','mecanicien'))
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant','mecanicien'));

-- ============================================================
-- affectations : lecture = tous les staffs internes ; ecriture = ops
-- ============================================================
DROP POLICY IF EXISTS "role_guard_affectations"                     ON public.affectations;

CREATE POLICY "affectations_staff_read" ON public.affectations
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN (
    'admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh','conducteur'
  ));

CREATE POLICY "affectations_ops_write" ON public.affectations
  FOR ALL TO authenticated
  USING   (public.get_user_role() IN ('admin','dirigeant','exploitant'))
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant'));

-- ============================================================
-- tachygraphe_entrees : lecture = rh/ops + conducteur (ses propres) ; ecriture = rh/ops
-- ============================================================
DROP POLICY IF EXISTS "role_guard_tachygraphe_entrees"              ON public.tachygraphe_entrees;

CREATE POLICY "tachy_staff_read" ON public.tachygraphe_entrees
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin','dirigeant','exploitant','rh'));

CREATE POLICY "tachy_ops_write" ON public.tachygraphe_entrees
  FOR ALL TO authenticated
  USING   (public.get_user_role() IN ('admin','dirigeant','exploitant','rh'))
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant','rh'));

-- ============================================================
-- sites_logistiques : lecture = tous les staffs internes ; ecriture = ops
-- ============================================================
DROP POLICY IF EXISTS "role_guard_sites_logistiques"                ON public.sites_logistiques;

CREATE POLICY "sites_log_staff_read" ON public.sites_logistiques
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN (
    'admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh','conducteur'
  ));

CREATE POLICY "sites_log_ops_write" ON public.sites_logistiques
  FOR ALL TO authenticated
  USING   (public.get_user_role() IN ('admin','dirigeant','exploitant'))
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant'));

-- ============================================================
-- flotte_entretiens : fleet/ops uniquement (si la table existe)
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.flotte_entretiens') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "role_guard_flotte_entretiens" ON public.flotte_entretiens';
    EXECUTE '
      CREATE POLICY "flotte_ent_fleet_rw" ON public.flotte_entretiens
        FOR ALL TO authenticated
        USING (public.get_user_role() IN (''admin'',''dirigeant'',''exploitant'',''mecanicien''))
        WITH CHECK (public.get_user_role() IN (''admin'',''dirigeant'',''exploitant'',''mecanicien''))
    ';
  END IF;
END $$;

-- ============================================================
-- remorque_releves_km : fleet uniquement (si la table existe)
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.remorque_releves_km') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "role_guard_remorque_releves_km" ON public.remorque_releves_km';
    EXECUTE 'DROP POLICY IF EXISTS "remorque_releves_km_rw_flotte" ON public.remorque_releves_km';
    EXECUTE '
      CREATE POLICY "remorque_km_fleet_rw" ON public.remorque_releves_km
        FOR ALL TO authenticated
        USING (public.get_user_role() IN (''admin'',''dirigeant'',''exploitant'',''mecanicien''))
        WITH CHECK (public.get_user_role() IN (''admin'',''dirigeant'',''exploitant'',''mecanicien''))
    ';
  END IF;
END $$;

-- ============================================================
-- clients : lecture = tous les staffs internes ; ecriture = commercial/ops
-- ============================================================
DROP POLICY IF EXISTS "role_guard_clients"                          ON public.clients;

CREATE POLICY "clients_staff_read" ON public.clients
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN (
    'admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh','conducteur'
  ));

CREATE POLICY "clients_comm_write" ON public.clients
  FOR ALL TO authenticated
  USING   (public.get_user_role() IN ('admin','dirigeant','exploitant','commercial'))
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant','commercial'));

-- ============================================================
-- adresses : lecture = tous les staffs internes ; ecriture = ops/commercial
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.adresses') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "role_guard_adresses" ON public.adresses';
    EXECUTE '
      CREATE POLICY "adresses_staff_read" ON public.adresses
        FOR SELECT TO authenticated
        USING (public.get_user_role() IN
          (''admin'',''dirigeant'',''exploitant'',''mecanicien'',''commercial'',''comptable'',''rh'',''conducteur''))
    ';
    EXECUTE '
      CREATE POLICY "adresses_ops_write" ON public.adresses
        FOR ALL TO authenticated
        USING (public.get_user_role() IN (''admin'',''dirigeant'',''exploitant'',''commercial''))
        WITH CHECK (public.get_user_role() IN (''admin'',''dirigeant'',''exploitant'',''commercial''))
    ';
  END IF;
END $$;

-- ============================================================
-- factures : finance uniquement (si la table existe)
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.factures') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "role_guard_factures" ON public.factures';
    EXECUTE '
      CREATE POLICY "factures_finance_rw" ON public.factures
        FOR ALL TO authenticated
        USING (public.get_user_role() IN (''admin'',''dirigeant'',''comptable'',''exploitant''))
        WITH CHECK (public.get_user_role() IN (''admin'',''dirigeant'',''comptable'',''exploitant''))
    ';
  END IF;
END $$;
