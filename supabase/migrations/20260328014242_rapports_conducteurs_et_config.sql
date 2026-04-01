
-- Table des rapports générés (relevés d'infraction + attestations d'activité)
CREATE TABLE rapports_conducteurs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conducteur_id uuid NOT NULL REFERENCES conducteurs(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('releve_infraction', 'attestation_activite')),
  periode_debut date NOT NULL,
  periode_fin   date NOT NULL,
  periode_label text NOT NULL,         -- ex: "Mars 2026"
  contenu       jsonb NOT NULL DEFAULT '{}',  -- snapshot complet du document
  statut        text NOT NULL DEFAULT 'genere'
                CHECK (statut IN ('genere', 'envoye', 'signe')),
  envoye_at     timestamptz,
  signe_at      timestamptz,
  created_at    timestamptz DEFAULT now(),
  created_by    uuid REFERENCES profils(id)
);

CREATE INDEX idx_rapports_conducteur ON rapports_conducteurs(conducteur_id);
CREATE INDEX idx_rapports_type_periode ON rapports_conducteurs(type, periode_debut);

ALTER TABLE rapports_conducteurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read rapports" ON rapports_conducteurs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Table de configuration entreprise (clé-valeur)
CREATE TABLE config_entreprise (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cle         text UNIQUE NOT NULL,
  valeur      jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at  timestamptz DEFAULT now(),
  updated_by  uuid REFERENCES profils(id)
);

ALTER TABLE config_entreprise ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read config" ON config_entreprise
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Valeurs par défaut
INSERT INTO config_entreprise (cle, valeur, description) VALUES
  ('jour_generation_releves',      '1',  'Jour du mois de génération automatique des relevés d''infraction (1-28)'),
  ('jour_generation_attestations', '1',  'Jour du mois de génération automatique des attestations d''activité (1-28)'),
  ('societe_nom',                  '"NEXORA TRANSPORT"', 'Raison sociale de la société'),
  ('societe_adresse',              '"Zone logistique Nord — 59000 Lille"', 'Adresse société'),
  ('societe_siret',                '"123 456 789 00012"', 'SIRET société'),
  ('responsable_exploitation_nom', '"Responsable Exploitation"', 'Nom du signataire employeur sur les documents');
;
