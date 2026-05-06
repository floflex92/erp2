-- Fuel Management System Tables
-- Supports multi-depot tanks, fuel tracking, anomaly detection, and accounting integration

-- ════════════════════════════════════════════════════════════════════════════
-- 1. CUVES (Fuel Tanks)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS carburant_cuves (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  depot_id            UUID REFERENCES adresses(id) ON DELETE SET NULL, -- Multi-depot support
  depot_nom           TEXT,
  numero_cuve         TEXT NOT NULL,
  type_carburant      TEXT NOT NULL CHECK (type_carburant IN ('gazole', 'essence', 'adblue', 'autre')),
  capacite_litres     DECIMAL(10,2) NOT NULL,
  marque              TEXT,
  modele              TEXT,
  jauge_electronique  BOOLEAN DEFAULT FALSE,
  statut              TEXT NOT NULL DEFAULT 'active' CHECK (statut IN ('active', 'inactive', 'maintenance')),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, numero_cuve) -- Unique per company
);

CREATE INDEX idx_carburant_cuves_company ON carburant_cuves(company_id);
CREATE INDEX idx_carburant_cuves_depot ON carburant_cuves(depot_id) WHERE depot_id IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. NIVEAUX_CUVE (Tank Level Readings)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS carburant_niveaux_cuve (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuve_id               UUID NOT NULL REFERENCES carburant_cuves(id) ON DELETE CASCADE,
  date_releve           DATE NOT NULL,
  heure_releve          TIME,
  niveau_litres         DECIMAL(10,2) NOT NULL,
  jauge_type            TEXT NOT NULL DEFAULT 'manuelle' CHECK (jauge_type IN ('electronique', 'manuelle')),
  releve_par_id         UUID,
  releve_par_nom        TEXT,
  anomalie_suspectee    BOOLEAN DEFAULT FALSE,
  anomalie_description  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cuve_id, date_releve, heure_releve)
);

CREATE INDEX idx_carburant_niveaux_cuve_id ON carburant_niveaux_cuve(cuve_id);
CREATE INDEX idx_carburant_niveaux_date ON carburant_niveaux_cuve(date_releve);
CREATE INDEX idx_carburant_niveaux_anomalie ON carburant_niveaux_cuve(anomalie_suspectee) WHERE anomalie_suspectee = TRUE;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. PLEINS (Fuel Fill Records)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS carburant_pleins (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicule_id             UUID NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
  vehicule_immat          TEXT,
  conducteur_id           UUID REFERENCES conducteurs(id) ON DELETE SET NULL,
  conducteur_identifiant_4d TEXT, -- 4-digit ID for fuel station auth
  conducteur_code         TEXT,  -- Conductor code for fuel station
  conducteur_num_parc     TEXT,  -- Parc number for fuel station
  date_plein              DATE NOT NULL,
  heure_plein             TIME,
  cuve_id                 UUID REFERENCES carburant_cuves(id) ON DELETE SET NULL,
  cuve_numero             TEXT,
  litres_verses           DECIMAL(10,2) NOT NULL,
  prix_unitaire_ttc       DECIMAL(8,2) NOT NULL,
  cout_total_ttc          DECIMAL(12,2),
  statut                  TEXT NOT NULL DEFAULT 'enregistre' CHECK (statut IN ('enregistre', 'valide', 'facture')),
  facture_id              UUID REFERENCES factures(id) ON DELETE SET NULL,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_carburant_pleins_company ON carburant_pleins(company_id);
CREATE INDEX idx_carburant_pleins_vehicule ON carburant_pleins(vehicule_id);
CREATE INDEX idx_carburant_pleins_conducteur ON carburant_pleins(conducteur_id);
CREATE INDEX idx_carburant_pleins_date ON carburant_pleins(date_plein);
CREATE INDEX idx_carburant_pleins_statut ON carburant_pleins(statut);

-- ════════════════════════════════════════════════════════════════════════════
-- 4. COMMANDES_CARBURANT (Fuel Purchase Orders)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS carburant_commandes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  numero_commande         TEXT NOT NULL UNIQUE,
  fournisseur_id          UUID REFERENCES fournisseurs(id) ON DELETE SET NULL,
  fournisseur_nom         TEXT NOT NULL,
  type_carburant          TEXT NOT NULL CHECK (type_carburant IN ('gazole', 'essence', 'adblue', 'autre')),
  quantite_litres         DECIMAL(10,2) NOT NULL,
  date_commande           DATE NOT NULL,
  date_livraison_prevue   DATE,
  date_livraison_reelle   DATE,
  cuve_id                 UUID REFERENCES carburant_cuves(id) ON DELETE SET NULL,
  price_unit_ht           DECIMAL(8,2) NOT NULL,
  montant_ht              DECIMAL(12,2) NOT NULL,
  taux_tva                DECIMAL(5,2) NOT NULL DEFAULT 20.0,
  montant_tva             DECIMAL(12,2) NOT NULL,
  montant_ttc             DECIMAL(12,2) NOT NULL,
  statut                  TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'livree', 'facturee', 'payee')),
  facture_num             TEXT,
  facture_date            DATE,
  compte_comptable        TEXT, -- VAT accounting code (e.g., '601')
  centre_analytique       TEXT, -- Cost center for analytics
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_carburant_commandes_company ON carburant_commandes(company_id);
CREATE INDEX idx_carburant_commandes_fournisseur ON carburant_commandes(fournisseur_id);
CREATE INDEX idx_carburant_commandes_statut ON carburant_commandes(statut);
CREATE INDEX idx_carburant_commandes_date ON carburant_commandes(date_commande);

-- ════════════════════════════════════════════════════════════════════════════
-- 5. CONSOMMATION_VEHICULE (Vehicle Fuel Consumption Analytics)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS carburant_consommation_vehicule (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicule_id               UUID NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
  vehicule_immat            TEXT NOT NULL,
  date_debut                DATE NOT NULL,
  date_fin                  DATE NOT NULL,
  nombre_pleins             INTEGER DEFAULT 0,
  litres_consommes          DECIMAL(10,2) DEFAULT 0,
  km_parcourus              DECIMAL(10,2),
  consommation_l_100km      DECIMAL(8,2), -- liters per 100 km
  cout_total_carburant      DECIMAL(12,2) DEFAULT 0,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, vehicule_id, date_debut, date_fin)
);

CREATE INDEX idx_carburant_consommation_company ON carburant_consommation_vehicule(company_id);
CREATE INDEX idx_carburant_consommation_vehicule ON carburant_consommation_vehicule(vehicule_id);
CREATE INDEX idx_carburant_consommation_periode ON carburant_consommation_vehicule(date_debut, date_fin);

-- ════════════════════════════════════════════════════════════════════════════
-- 6. ANOMALIES_CARBURANT (Fuel Anomaly Tracking)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS carburant_anomalies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date_anomalie         DATE NOT NULL,
  type                  TEXT NOT NULL CHECK (type IN ('evaporation_cuve', 'consommation_anormale', 'perte_cuve', 'autre')),
  cuve_id               UUID REFERENCES carburant_cuves(id) ON DELETE SET NULL,
  vehicule_id           UUID REFERENCES vehicules(id) ON DELETE SET NULL,
  litres_manquants      DECIMAL(10,2),
  description           TEXT NOT NULL,
  gravite               TEXT NOT NULL DEFAULT 'warning' CHECK (gravite IN ('info', 'warning', 'critique')),
  statut                TEXT NOT NULL DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'enquete', 'resolu')),
  resolution_notes      TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_carburant_anomalies_company ON carburant_anomalies(company_id);
CREATE INDEX idx_carburant_anomalies_statut ON carburant_anomalies(statut);
CREATE INDEX idx_carburant_anomalies_gravite ON carburant_anomalies(gravite);
CREATE INDEX idx_carburant_anomalies_type ON carburant_anomalies(type);

-- ════════════════════════════════════════════════════════════════════════════
-- 7. STATISTIQUES_CARBURANT (Monthly Fuel Statistics KPIs)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS carburant_statistiques (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cuve_id               UUID NOT NULL REFERENCES carburant_cuves(id) ON DELETE CASCADE,
  annee                 INTEGER NOT NULL,
  mois                  INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
  nombre_pleins_mois    INTEGER DEFAULT 0,
  litres_verses_mois    DECIMAL(10,2) DEFAULT 0,
  niveau_moyen_pct      DECIMAL(5,2), -- Average tank level as %
  anomalies_mois        INTEGER DEFAULT 0,
  cout_carburant_mois   DECIMAL(12,2) DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, cuve_id, annee, mois)
);

CREATE INDEX idx_carburant_statistiques_company ON carburant_statistiques(company_id);
CREATE INDEX idx_carburant_statistiques_cuve ON carburant_statistiques(cuve_id);
CREATE INDEX idx_carburant_statistiques_periode ON carburant_statistiques(annee, mois);

-- ════════════════════════════════════════════════════════════════════════════
-- ENABLE RLS (Row Level Security)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE carburant_cuves ENABLE ROW LEVEL SECURITY;
ALTER TABLE carburant_niveaux_cuve ENABLE ROW LEVEL SECURITY;
ALTER TABLE carburant_pleins ENABLE ROW LEVEL SECURITY;
ALTER TABLE carburant_commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE carburant_consommation_vehicule ENABLE ROW LEVEL SECURITY;
ALTER TABLE carburant_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE carburant_statistiques ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ════════════════════════════════════════════════════════════════════════════

-- RLS for carburant_cuves
CREATE POLICY rls_carburant_cuves_read ON carburant_cuves
  FOR SELECT USING (company_id = my_company_id());

CREATE POLICY rls_carburant_cuves_write ON carburant_cuves
  FOR INSERT WITH CHECK (company_id = my_company_id());

CREATE POLICY rls_carburant_cuves_update ON carburant_cuves
  FOR UPDATE USING (company_id = my_company_id());

CREATE POLICY rls_carburant_cuves_delete ON carburant_cuves
  FOR DELETE USING (company_id = my_company_id());

-- RLS for carburant_niveaux_cuve (all via cuve_id relationship)
CREATE POLICY rls_carburant_niveaux_read ON carburant_niveaux_cuve
  FOR SELECT USING (cuve_id IN (SELECT id FROM carburant_cuves WHERE company_id = my_company_id()));

CREATE POLICY rls_carburant_niveaux_write ON carburant_niveaux_cuve
  FOR INSERT WITH CHECK (cuve_id IN (SELECT id FROM carburant_cuves WHERE company_id = my_company_id()));

CREATE POLICY rls_carburant_niveaux_update ON carburant_niveaux_cuve
  FOR UPDATE USING (cuve_id IN (SELECT id FROM carburant_cuves WHERE company_id = my_company_id()));

-- RLS for carburant_pleins
CREATE POLICY rls_carburant_pleins_read ON carburant_pleins
  FOR SELECT USING (company_id = my_company_id());

CREATE POLICY rls_carburant_pleins_write ON carburant_pleins
  FOR INSERT WITH CHECK (company_id = my_company_id());

CREATE POLICY rls_carburant_pleins_update ON carburant_pleins
  FOR UPDATE USING (company_id = my_company_id());

-- RLS for carburant_commandes
CREATE POLICY rls_carburant_commandes_read ON carburant_commandes
  FOR SELECT USING (company_id = my_company_id());

CREATE POLICY rls_carburant_commandes_write ON carburant_commandes
  FOR INSERT WITH CHECK (company_id = my_company_id());

CREATE POLICY rls_carburant_commandes_update ON carburant_commandes
  FOR UPDATE USING (company_id = my_company_id());

-- RLS for carburant_consommation_vehicule
CREATE POLICY rls_carburant_consommation_read ON carburant_consommation_vehicule
  FOR SELECT USING (company_id = my_company_id());

CREATE POLICY rls_carburant_consommation_write ON carburant_consommation_vehicule
  FOR INSERT WITH CHECK (company_id = my_company_id());

-- RLS for carburant_anomalies
CREATE POLICY rls_carburant_anomalies_read ON carburant_anomalies
  FOR SELECT USING (company_id = my_company_id());

CREATE POLICY rls_carburant_anomalies_write ON carburant_anomalies
  FOR INSERT WITH CHECK (company_id = my_company_id());

CREATE POLICY rls_carburant_anomalies_update ON carburant_anomalies
  FOR UPDATE USING (company_id = my_company_id());

-- RLS for carburant_statistiques
CREATE POLICY rls_carburant_statistiques_read ON carburant_statistiques
  FOR SELECT USING (company_id = my_company_id());

CREATE POLICY rls_carburant_statistiques_write ON carburant_statistiques
  FOR INSERT WITH CHECK (company_id = my_company_id());

-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGERS for updated_at timestamp
-- ════════════════════════════════════════════════════════════════════════════

CREATE TRIGGER tr_carburant_cuves_updated
BEFORE UPDATE ON carburant_cuves
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_carburant_pleins_updated
BEFORE UPDATE ON carburant_pleins
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_carburant_commandes_updated
BEFORE UPDATE ON carburant_commandes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_carburant_anomalies_updated
BEFORE UPDATE ON carburant_anomalies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_carburant_statistiques_updated
BEFORE UPDATE ON carburant_statistiques
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
