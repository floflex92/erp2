
-- ============================================================
-- TABLE PROSPECTS (pipeline commercial)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prospects (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_entreprise          text NOT NULL,
  statut                  text NOT NULL DEFAULT 'lead'
                            CHECK (statut IN ('lead','qualification','devis_envoye','negociation','closing','gagne','perdu')),
  montant_mensuel_estime  numeric(12,2),
  commercial_nom          text,
  secteur                 text,
  type_transport          text,
  ville                   text,
  code_postal             text,
  latitude                numeric,
  longitude               numeric,
  contact_nom             text,
  contact_email           text,
  contact_telephone       text,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospects_statut ON public.prospects(statut);
CREATE INDEX IF NOT EXISTS idx_prospects_created ON public.prospects(created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.prospects_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_prospects_updated_at ON public.prospects;
CREATE TRIGGER trg_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.prospects_set_updated_at();

-- RLS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_prospects" ON public.prospects;
CREATE POLICY "admin_all_prospects" ON public.prospects FOR ALL USING (auth.uid() IS NOT NULL);

-- Données de démo
INSERT INTO public.prospects (nom_entreprise, statut, montant_mensuel_estime, commercial_nom, secteur, type_transport, ville, code_postal, latitude, longitude)
VALUES
  ('Réseau Nord Distribution', 'qualification',  18000, 'Martin D.', 'Distribution',    'groupage',  'Lille',      '59000', 50.6292,  3.0573),
  ('BioFret Est',              'devis_envoye',   26000, 'Lambert P.','Pharmacie',       'express',   'Strasbourg', '67000', 48.5734,  7.7521),
  ('Batimat Provence',         'negociation',    31000, 'Ramirez S.','BTP',             'complet',   'Marseille',  '13000', 43.2965,  5.3698),
  ('Mode Textile Rhénan',      'closing',        14500, 'Dupont C.', 'Textile',         'partiel',   'Mulhouse',   '68100', 47.7508,  7.3359),
  ('AgroSud Logistique',       'lead',            8000, 'Moreau L.', 'Agroalimentaire', 'groupage',  'Montpellier','34000', 43.6117,  3.8777),
  ('Trans-Alpes Express',      'lead',           12000, 'Petit R.',  'Commerce',        'express',   'Grenoble',   '38000', 45.1885,  5.7245),
  ('Ouest Pharma Transit',     'qualification',  22000, 'Bernard F.','Pharmacie',       'express',   'Nantes',     '44000', 47.2184, -1.5536),
  ('Centre Val Frais',         'gagne',          19500, 'Simon E.',  'Alimentation',    'groupage',  'Orléans',    '45000', 47.9029,  1.9039);
;
