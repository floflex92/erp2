-- ============================================================
-- CRM PROSPECTION FULL — Tables commerciales avancées
-- 20260407200000
-- ============================================================

-- ------------------------------------------------------------
-- 1. Enrichissement de la table prospects existante
-- ------------------------------------------------------------
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS ca_annuel_estime numeric(14,2),
  ADD COLUMN IF NOT EXISTS nb_sites integer,
  ADD COLUMN IF NOT EXISTS concurrent_actuel text,
  ADD COLUMN IF NOT EXISTS source_lead text,
  ADD COLUMN IF NOT EXISTS probabilite_closing integer DEFAULT 20,
  ADD COLUMN IF NOT EXISTS date_derniere_action timestamptz,
  ADD COLUMN IF NOT EXISTS date_prochain_contact date,
  ADD COLUMN IF NOT EXISTS zones_transport text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prospects_source_lead_check'
  ) THEN
    ALTER TABLE public.prospects
      ADD CONSTRAINT prospects_source_lead_check
      CHECK (source_lead IN (
        'telephone_entrant','salon','bouche_a_oreille','linkedin',
        'bourse_fret','site_web','recommandation','autre'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prospects_probabilite_check'
  ) THEN
    ALTER TABLE public.prospects
      ADD CONSTRAINT prospects_probabilite_check
      CHECK (probabilite_closing BETWEEN 0 AND 100);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2. Table contacts_prospects — interlocuteurs par prospect
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contacts_prospects (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id       uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  nom               text NOT NULL,
  prenom            text,
  poste             text,
  telephone         text,
  email             text,
  canal_preference  text NOT NULL DEFAULT 'telephone'
                    CHECK (canal_preference IN ('telephone','email','whatsapp','visio')),
  est_principal     boolean NOT NULL DEFAULT false,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_prospects_prospect ON public.contacts_prospects(prospect_id);

ALTER TABLE public.contacts_prospects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contacts_prospects' AND policyname = 'auth_all_contacts_prospects'
  ) THEN
    CREATE POLICY "auth_all_contacts_prospects" ON public.contacts_prospects
      FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. Table devis_transport — devis commerciaux avec calcul auto
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.devis_transport (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero           text NOT NULL,
  prospect_id      uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  client_id        uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  origine          text NOT NULL,
  destination      text NOT NULL,
  distance_km      integer,
  type_transport   text NOT NULL DEFAULT 'complet'
                   CHECK (type_transport IN ('complet','partiel','groupage','express')),
  poids_kg         numeric(12,2),
  volume_m3        numeric(12,2),
  prix_propose_ht  numeric(12,2),
  cout_estime_ht   numeric(12,2),
  marge_estime_ht  numeric(12,2),
  marge_pct        numeric(5,2),
  statut           text NOT NULL DEFAULT 'brouillon'
                   CHECK (statut IN ('brouillon','envoye','accepte','refuse','expire')),
  date_envoi       date,
  date_validite    date,
  date_reponse     date,
  taux_tva         numeric(5,2) DEFAULT 20,
  notes            text,
  commercial_nom   text,
  ot_reference     text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devis_statut   ON public.devis_transport(statut);
CREATE INDEX IF NOT EXISTS idx_devis_prospect ON public.devis_transport(prospect_id);
CREATE INDEX IF NOT EXISTS idx_devis_created  ON public.devis_transport(created_at DESC);

ALTER TABLE public.devis_transport ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'devis_transport' AND policyname = 'auth_all_devis_transport'
  ) THEN
    CREATE POLICY "auth_all_devis_transport" ON public.devis_transport
      FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.devis_transport_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_devis_transport_updated_at ON public.devis_transport;
CREATE TRIGGER trg_devis_transport_updated_at
  BEFORE UPDATE ON public.devis_transport
  FOR EACH ROW EXECUTE FUNCTION public.devis_transport_set_updated_at();

-- ------------------------------------------------------------
-- 4. Table actions_commerciales — journal d activités
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.actions_commerciales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id    uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  devis_id       uuid REFERENCES public.devis_transport(id) ON DELETE SET NULL,
  type_action    text NOT NULL
                 CHECK (type_action IN ('appel','email','rdv','note','visite','relance')),
  date_action    timestamptz NOT NULL DEFAULT now(),
  duree_minutes  integer,
  resultat       text CHECK (resultat IN ('positif','neutre','negatif','sans_reponse')),
  notes          text NOT NULL DEFAULT '',
  commercial_nom text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actions_prospect ON public.actions_commerciales(prospect_id);
CREATE INDEX IF NOT EXISTS idx_actions_date     ON public.actions_commerciales(date_action DESC);

ALTER TABLE public.actions_commerciales ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'actions_commerciales' AND policyname = 'auth_all_actions_commerciales'
  ) THEN
    CREATE POLICY "auth_all_actions_commerciales" ON public.actions_commerciales
      FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Trigger : synchronise date_derniere_action du prospect à chaque nouvelle action
CREATE OR REPLACE FUNCTION public.sync_prospect_last_action()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.prospects
    SET date_derniere_action = NEW.date_action,
        updated_at           = now()
  WHERE id = NEW.prospect_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_prospect_last_action ON public.actions_commerciales;
CREATE TRIGGER trg_sync_prospect_last_action
  AFTER INSERT ON public.actions_commerciales
  FOR EACH ROW EXECUTE FUNCTION public.sync_prospect_last_action();

-- ------------------------------------------------------------
-- 5. Table relances_commerciales — relances planifiées
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.relances_commerciales (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id   uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  devis_id      uuid REFERENCES public.devis_transport(id) ON DELETE SET NULL,
  type_relance  text NOT NULL DEFAULT 'suivi_regulier'
                CHECK (type_relance IN (
                  'devis_sans_reponse','prospect_inactif',
                  'devis_expire','suivi_regulier','autre'
                )),
  date_prevue   date NOT NULL,
  statut        text NOT NULL DEFAULT 'planifiee'
                CHECK (statut IN ('planifiee','faite','annulee')),
  priorite      text NOT NULL DEFAULT 'normale'
                CHECK (priorite IN ('haute','normale','basse')),
  notes         text,
  commercial_nom text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relances_date    ON public.relances_commerciales(date_prevue);
CREATE INDEX IF NOT EXISTS idx_relances_statut  ON public.relances_commerciales(statut);
CREATE INDEX IF NOT EXISTS idx_relances_prospect ON public.relances_commerciales(prospect_id);

ALTER TABLE public.relances_commerciales ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'relances_commerciales' AND policyname = 'auth_all_relances_commerciales'
  ) THEN
    CREATE POLICY "auth_all_relances_commerciales" ON public.relances_commerciales
      FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
