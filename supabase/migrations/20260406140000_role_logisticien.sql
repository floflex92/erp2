-- ============================================================
-- Rôle logisticien : droits RLS sur les tables opérationnelles
-- ============================================================

-- ── sites_logistiques : logisticien = accès complet (lecture + écriture) ──────

DROP POLICY IF EXISTS "sites_log_staff_read" ON public.sites_logistiques;
DROP POLICY IF EXISTS "sites_log_ops_write"  ON public.sites_logistiques;

CREATE POLICY "sites_log_staff_read" ON public.sites_logistiques
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN (
    'admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh','conducteur','logisticien'
  ));

CREATE POLICY "sites_log_ops_write" ON public.sites_logistiques
  FOR ALL TO authenticated
  USING   (public.get_user_role() IN ('admin','dirigeant','exploitant','logisticien'))
  WITH CHECK (public.get_user_role() IN ('admin','dirigeant','exploitant','logisticien'));

-- ── transport_relais : logisticien = accès complet (lecture + écriture) ───────

DROP POLICY IF EXISTS "transport_relais_rw" ON public.transport_relais;

CREATE POLICY "transport_relais_rw"
  ON public.transport_relais
  FOR ALL
  USING (get_user_role() IN ('admin','dirigeant','exploitant','conducteur','logisticien'))
  WITH CHECK (get_user_role() IN ('admin','dirigeant','exploitant','logisticien'));

-- ── ordres_transport : logisticien = lecture + écriture ───────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ordres_transport'
      AND policyname = 'ordres_transport_rw_ops'
  ) THEN
    DROP POLICY "ordres_transport_rw_ops" ON public.ordres_transport;
  END IF;
END $$;

CREATE POLICY "ordres_transport_rw_ops"
  ON public.ordres_transport
  FOR ALL
  TO authenticated
  USING (public.get_user_role() IN (
    'admin','dirigeant','exploitant','commercial','comptable','affreteur','conducteur_affreteur','logisticien'
  ))
  WITH CHECK (public.get_user_role() IN (
    'admin','dirigeant','exploitant','commercial','comptable','affreteur','conducteur_affreteur','logisticien'
  ));

-- ── erp_v11_chat : logisticien peut accéder au tchat (si la table existe) ────

DO $$
DECLARE
  pol_name text;
BEGIN
  IF to_regclass('public.erp_v11_chat') IS NOT NULL THEN
    FOR pol_name IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'erp_v11_chat'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.erp_v11_chat', pol_name);
    END LOOP;

    EXECUTE $sql$
      CREATE POLICY "chat_rw" ON public.erp_v11_chat
        FOR ALL TO authenticated
        USING (public.get_user_role() IN (
          'admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh','conducteur','logisticien'
        ))
        WITH CHECK (public.get_user_role() IN (
          'admin','dirigeant','exploitant','mecanicien','commercial','comptable','rh','conducteur','logisticien'
        ))
    $sql$;
  END IF;
END $$;
