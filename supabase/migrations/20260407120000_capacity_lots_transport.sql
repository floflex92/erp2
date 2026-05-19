-- ============================================================
-- Migration : capacité + lots de transport
-- Ajoute metrage_ml sur ordres_transport et crée ot_lignes
-- ============================================================

-- 1. Ajout métrage linéaire sur les OT
ALTER TABLE public.ordres_transport
  ADD COLUMN IF NOT EXISTS metrage_ml numeric(10,2) DEFAULT NULL;

-- 2. Table des lignes de chargement (groupage / partiel)
CREATE TABLE IF NOT EXISTS public.ot_lignes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_id       uuid        NOT NULL REFERENCES public.ordres_transport(id) ON DELETE CASCADE,
  libelle     text        NOT NULL,
  poids_kg    numeric(10,2)  DEFAULT NULL,
  metrage_ml  numeric(10,2)  DEFAULT NULL,
  nombre_colis integer    DEFAULT NULL,
  notes       text        DEFAULT NULL,
  company_id  integer     NOT NULL DEFAULT 1 REFERENCES public.companies(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS
ALTER TABLE public.ot_lignes ENABLE ROW LEVEL SECURITY;

CREATE POLICY ot_lignes_tenant_read ON public.ot_lignes
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY ot_lignes_tenant_write ON public.ot_lignes
  FOR ALL USING (company_id = get_user_company_id());
