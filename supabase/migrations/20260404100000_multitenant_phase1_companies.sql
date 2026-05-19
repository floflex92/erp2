-- ============================================================
-- MULTI-TENANT PHASE 1 : Table companies + company_id sur toutes les tables metier
-- Date : 2026-04-04
-- Strategie : ADDITIF UNIQUEMENT - aucune colonne supprimee, aucune donnee perdue
--
-- SECURITE : toutes les ALTER TABLE sur les tables metier sont protegees par
-- une verification d'existence via pg_temp.add_company_id().
-- Si une table n'existe pas encore, elle sera ignoree (RAISE NOTICE).
--
-- RISQUE ZERO : idempotent, rejouable.
-- ============================================================


-- ============================================================
-- 1. TABLE COMPANIES
--    Socle de l'isolation multi-tenant.
--    id=1 represente le client unique actuel (migration mono → multi).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id                  serial        PRIMARY KEY,
  name                text          NOT NULL,
  slug                text          NOT NULL UNIQUE,
  status              text          NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  subscription_plan   text          NOT NULL DEFAULT 'starter'
                        CHECK (subscription_plan IN ('starter', 'pro', 'enterprise')),
  max_users           integer       NOT NULL DEFAULT 10,
  max_screens         integer       NOT NULL DEFAULT 3,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

-- Seed obligatoire : represente les donnees actuelles avant migration
-- IMPORTANT : id=1 est fixe deliberement pour que le DEFAULT 1 sur toutes
--             les tables pointe toujours sur ce tenant de reference.
INSERT INTO public.companies (id, name, slug, status, subscription_plan, max_users, max_screens)
VALUES (1, 'Tenant Test', 'tenant_test', 'active', 'enterprise', 100, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.companies (id, name, slug, status, subscription_plan, max_users, max_screens)
VALUES (1, 'Tenant Test', 'tenant_test', 'active', 'enterprise', 100, 10)
ON CONFLICT (slug) DO NOTHING;

-- Aligne la sequence pour eviter les conflits lors des prochains INSERTs
SELECT setval('public.companies_id_seq', GREATEST((SELECT MAX(id) FROM public.companies), 1));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_companies()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_set_updated_at ON public.companies;
CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_companies();


-- ============================================================
-- 2. LIEN erp_v11_tenants → companies
--    Le systeme tenant_key reste operationnel (compatibilite ascendante).
-- ============================================================

ALTER TABLE public.erp_v11_tenants
  ADD COLUMN IF NOT EXISTS company_id integer NULL
  REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS erp_v11_tenants_company_id_idx
  ON public.erp_v11_tenants(company_id);

INSERT INTO public.erp_v11_tenants (tenant_key, display_name, company_id, default_max_concurrent_screens, allowed_pages)
VALUES ('tenant_test', 'Tenant Test', 1, 10, '[]'::jsonb)
ON CONFLICT (tenant_key) DO UPDATE SET company_id = 1;

UPDATE public.erp_v11_tenants
SET company_id = 1
WHERE company_id IS NULL;


-- ============================================================
-- 3. company_id sur profils
--    Ajout sans NOT NULL, backfill, puis DEFAULT.
-- ============================================================

ALTER TABLE public.profils
  ADD COLUMN IF NOT EXISTS company_id integer NULL
  REFERENCES public.companies(id) ON DELETE SET NULL;

UPDATE public.profils p
SET company_id = t.company_id
FROM public.erp_v11_tenants t
WHERE p.tenant_key = t.tenant_key
  AND t.company_id IS NOT NULL
  AND p.company_id IS NULL;

UPDATE public.profils
SET company_id = 1
WHERE company_id IS NULL;

ALTER TABLE public.profils
  ALTER COLUMN company_id SET DEFAULT 1;

CREATE INDEX IF NOT EXISTS profils_company_id_idx
  ON public.profils(company_id);


-- ============================================================
-- 4. FONCTION UTILITAIRE : pg_temp.add_company_id
--    Ajoute company_id a une table SI elle existe.
--    Idempotent. Safe si la table n'existe pas encore.
-- ============================================================

CREATE OR REPLACE FUNCTION pg_temp.add_company_id(p_table text)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_table
  ) THEN
    RAISE NOTICE 'Table public.% ignoree (n''existe pas encore)', p_table;
    RETURN;
  END IF;

  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id integer NOT NULL DEFAULT 1 REFERENCES public.companies(id) ON DELETE RESTRICT',
    p_table
  );

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON public.%I(company_id)',
    p_table || '_company_id_idx',
    p_table
  );
END;
$$;


-- ============================================================
-- 5. TABLES CORE
-- ============================================================

SELECT pg_temp.add_company_id('clients');
SELECT pg_temp.add_company_id('contacts');
SELECT pg_temp.add_company_id('adresses');
SELECT pg_temp.add_company_id('conducteurs');
SELECT pg_temp.add_company_id('vehicules');
SELECT pg_temp.add_company_id('remorques');
SELECT pg_temp.add_company_id('affectations');
SELECT pg_temp.add_company_id('ordres_transport');
SELECT pg_temp.add_company_id('etapes_mission');
SELECT pg_temp.add_company_id('historique_statuts');
SELECT pg_temp.add_company_id('factures');
SELECT pg_temp.add_company_id('tasks');
SELECT pg_temp.add_company_id('prospects');
SELECT pg_temp.add_company_id('config_entreprise');


-- ============================================================
-- 6. TABLES RH / FLOTTE
-- ============================================================

SELECT pg_temp.add_company_id('conducteur_documents');
SELECT pg_temp.add_company_id('conducteur_evenements_rh');
SELECT pg_temp.add_company_id('flotte_documents');
SELECT pg_temp.add_company_id('flotte_entretiens');
SELECT pg_temp.add_company_id('flotte_equipements');
SELECT pg_temp.add_company_id('vehicule_releves_km');
SELECT pg_temp.add_company_id('remorque_releves_km');
SELECT pg_temp.add_company_id('entretiens_rh');


-- ============================================================
-- 7. TABLES TRANSPORT / LOGISTIQUE
-- ============================================================

SELECT pg_temp.add_company_id('sites_logistiques');
SELECT pg_temp.add_company_id('ordres_transport_statut_history');
SELECT pg_temp.add_company_id('tachygraphe_entrees');
SELECT pg_temp.add_company_id('couts_mission');
SELECT pg_temp.add_company_id('documents');
SELECT pg_temp.add_company_id('entretiens');
SELECT pg_temp.add_company_id('maintenance_events');
SELECT pg_temp.add_company_id('journee_travail');
SELECT pg_temp.add_company_id('parametre_regle');
SELECT pg_temp.add_company_id('rapports_conducteurs');


-- ============================================================
-- 8. TABLES COMMUNICATION / TCHAT
-- ============================================================

SELECT pg_temp.add_company_id('tchat_conversations');
SELECT pg_temp.add_company_id('tchat_messages');
SELECT pg_temp.add_company_id('tchat_participants');


-- ============================================================
-- 9. TABLES COMPTABILITE
-- ============================================================

SELECT pg_temp.add_company_id('compta_journaux');
SELECT pg_temp.add_company_id('compta_plan_comptable');
SELECT pg_temp.add_company_id('compta_tva_regles');
SELECT pg_temp.add_company_id('compta_pieces');
SELECT pg_temp.add_company_id('compta_ecritures');
SELECT pg_temp.add_company_id('compta_ecriture_lignes');
SELECT pg_temp.add_company_id('compta_tva_periodes');
SELECT pg_temp.add_company_id('compta_tva_lignes');
SELECT pg_temp.add_company_id('compta_audit_evenements');
SELECT pg_temp.add_company_id('compta_fec_exports');
SELECT pg_temp.add_company_id('compta_factures_fournisseurs');


-- ============================================================
-- 10. TABLES AFFRETEMENT
-- ============================================================

SELECT pg_temp.add_company_id('affreteur_onboardings');
SELECT pg_temp.add_company_id('affretement_contracts');


-- ============================================================
-- FIN DE LA MIGRATION PHASE 1
-- ============================================================
