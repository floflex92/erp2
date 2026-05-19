
-- ─── CLIENTS ────────────────────────────────────────────────
CREATE TABLE clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         text NOT NULL,
  siret       text,
  adresse     text,
  ville       text,
  code_postal text,
  telephone   text,
  email       text,
  notes       text,
  actif       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── CHAUFFEURS ─────────────────────────────────────────────
CREATE TABLE chauffeurs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom                   text NOT NULL,
  prenom                text NOT NULL,
  date_naissance        date,
  telephone             text,
  email                 text,
  adresse               text,
  -- Permis
  numero_permis         text,
  permis_categories     text[],          -- ex: ['C','CE','C1']
  permis_expiration     date,
  -- FIMO / FCO
  fimo_date             date,
  fco_date              date,
  fco_expiration        date,
  -- Carte conducteur tachygraphe
  carte_tachy_numero    text,
  carte_tachy_expiration date,
  -- Statut
  statut                text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif','inactif','conge','arret_maladie')),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ─── VÉHICULES ──────────────────────────────────────────────
CREATE TABLE vehicules (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  immatriculation         text NOT NULL UNIQUE,
  marque                  text,
  modele                  text,
  annee                   int,
  type_vehicule           text NOT NULL DEFAULT 'tracteur' CHECK (type_vehicule IN ('tracteur','porteur','semi','remorque','utilitaire')),
  ptac_kg                 int,
  -- Documents
  ct_date                 date,           -- contrôle technique
  ct_expiration           date,
  assurance_expiration    date,
  vignette_expiration     date,
  -- Tachygraphe
  tachy_serie             text,
  tachy_etalonnage        date,
  tachy_etalonnage_prochain date,
  -- Kilométrage
  km_actuel               int DEFAULT 0,
  km_dernier_entretien    int,
  km_prochain_entretien   int,
  -- Statut
  statut                  text NOT NULL DEFAULT 'disponible' CHECK (statut IN ('disponible','en_service','maintenance','hs','vendu')),
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ─── ENTRETIENS VÉHICULES ───────────────────────────────────
CREATE TABLE entretiens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id   uuid NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
  type_entretien text NOT NULL,          -- vidange, pneus, freins, etc.
  date_entretien date NOT NULL,
  km_au_moment  int,
  cout_ht       numeric(10,2),
  prestataire   text,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── ORDRES DE TRANSPORT ────────────────────────────────────
CREATE TABLE transports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       text NOT NULL UNIQUE,
  client_id       uuid REFERENCES clients(id),
  chauffeur_id    uuid REFERENCES chauffeurs(id),
  vehicule_id     uuid REFERENCES vehicules(id),
  -- Chargement
  adresse_chargement  text,
  ville_chargement    text,
  date_chargement     timestamptz,
  -- Livraison
  adresse_livraison   text,
  ville_livraison     text,
  date_livraison_prevue timestamptz,
  date_livraison_reelle timestamptz,
  -- Marchandise
  nature_marchandise  text,
  poids_kg            numeric(10,2),
  volume_m3           numeric(10,2),
  -- Tarification
  prix_ht             numeric(10,2),
  taux_tva            numeric(5,2) DEFAULT 20.00,
  -- Statut
  statut              text NOT NULL DEFAULT 'planifie' CHECK (statut IN ('planifie','en_cours','livre','litige','annule')),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── FACTURES ───────────────────────────────────────────────
CREATE TABLE factures (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero          text NOT NULL UNIQUE,
  client_id       uuid NOT NULL REFERENCES clients(id),
  transport_id    uuid REFERENCES transports(id),
  date_emission   date NOT NULL DEFAULT CURRENT_DATE,
  date_echeance   date,
  montant_ht      numeric(10,2) NOT NULL DEFAULT 0,
  taux_tva        numeric(5,2) NOT NULL DEFAULT 20.00,
  montant_tva     numeric(10,2) GENERATED ALWAYS AS (montant_ht * taux_tva / 100) STORED,
  montant_ttc     numeric(10,2) GENERATED ALWAYS AS (montant_ht * (1 + taux_tva / 100)) STORED,
  statut          text NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon','envoyee','payee','en_retard','litige','annulee')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── TACHYGRAPHE ────────────────────────────────────────────
CREATE TABLE tachygraphe_entrees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chauffeur_id    uuid NOT NULL REFERENCES chauffeurs(id) ON DELETE CASCADE,
  vehicule_id     uuid REFERENCES vehicules(id),
  date_debut      timestamptz NOT NULL,
  date_fin        timestamptz,
  type_activite   text NOT NULL CHECK (type_activite IN ('conduite','repos','disponibilite','travail_autre')),
  duree_minutes   int GENERATED ALWAYS AS (
    CASE WHEN date_fin IS NOT NULL
    THEN EXTRACT(EPOCH FROM (date_fin - date_debut))::int / 60
    ELSE NULL END
  ) STORED,
  source          text DEFAULT 'manuel' CHECK (source IN ('manuel','webfleet','dtco')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── SÉQUENCE NUMÉROS FACTURES ──────────────────────────────
CREATE SEQUENCE facture_seq START 1001;
CREATE SEQUENCE transport_seq START 1001;

-- ─── UPDATED_AT AUTO ────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_clients_updated_at    BEFORE UPDATE ON clients    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_chauffeurs_updated_at BEFORE UPDATE ON chauffeurs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_vehicules_updated_at  BEFORE UPDATE ON vehicules  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_transports_updated_at BEFORE UPDATE ON transports FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_factures_updated_at   BEFORE UPDATE ON factures   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── INDEX ───────────────────────────────────────────────────
CREATE INDEX idx_transports_client    ON transports(client_id);
CREATE INDEX idx_transports_chauffeur ON transports(chauffeur_id);
CREATE INDEX idx_transports_vehicule  ON transports(vehicule_id);
CREATE INDEX idx_transports_statut    ON transports(statut);
CREATE INDEX idx_factures_client      ON factures(client_id);
CREATE INDEX idx_factures_statut      ON factures(statut);
CREATE INDEX idx_tachy_chauffeur      ON tachygraphe_entrees(chauffeur_id);
CREATE INDEX idx_tachy_date           ON tachygraphe_entrees(date_debut);
CREATE INDEX idx_entretiens_vehicule  ON entretiens(vehicule_id);

-- ─── ROW LEVEL SECURITY (activé mais permissif pour l'instant) ─
ALTER TABLE clients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE chauffeurs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicules             ENABLE ROW LEVEL SECURITY;
ALTER TABLE entretiens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE transports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tachygraphe_entrees   ENABLE ROW LEVEL SECURITY;

-- Policies open (à sécuriser quand l'auth sera en place)
CREATE POLICY "allow_all_clients"    ON clients              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_chauffeurs" ON chauffeurs           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_vehicules"  ON vehicules            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_entretiens" ON entretiens           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_transports" ON transports           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_factures"   ON factures             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tachy"      ON tachygraphe_entrees  FOR ALL USING (true) WITH CHECK (true);
;
