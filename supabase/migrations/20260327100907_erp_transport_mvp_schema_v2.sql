
-- ═══════════════════════════════════════════════════════════
-- ERP TRANSPORT — SCHÉMA MVP V2
-- ═══════════════════════════════════════════════════════════

-- Nettoyage de l'ancien schéma
DROP TABLE IF EXISTS tachygraphe_entrees CASCADE;
DROP TABLE IF EXISTS entretiens         CASCADE;
DROP TABLE IF EXISTS factures           CASCADE;
DROP TABLE IF EXISTS transports         CASCADE;
DROP TABLE IF EXISTS vehicules          CASCADE;
DROP TABLE IF EXISTS chauffeurs         CASCADE;
DROP TABLE IF EXISTS clients            CASCADE;
DROP SEQUENCE IF EXISTS facture_seq;
DROP SEQUENCE IF EXISTS transport_seq;
DROP FUNCTION IF EXISTS set_updated_at CASCADE;

-- ───────────────────────────────────────────────────────────
-- UTILITAIRES
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION add_updated_at_trigger(tbl text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I
     FOR EACH ROW EXECUTE FUNCTION set_updated_at()', tbl, tbl);
END;
$$;

-- ───────────────────────────────────────────────────────────
-- RÉFÉRENTIEL — CLIENTS
-- ───────────────────────────────────────────────────────────
CREATE TABLE clients (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identité
  nom           text        NOT NULL,
  siret         text,
  tva_intra     text,
  -- Type
  type_client   text        NOT NULL DEFAULT 'client'
                            CHECK (type_client IN ('client','prospect','sous_traitant','fournisseur')),
  -- Coordonnées
  adresse       text,
  code_postal   text,
  ville         text,
  pays          text        DEFAULT 'France',
  telephone     text,
  email         text,
  site_web      text,
  -- Finance
  conditions_paiement  int  DEFAULT 30,  -- jours
  encours_max   numeric(12,2),
  taux_tva_defaut numeric(5,2) DEFAULT 20.00,
  -- Meta
  actif         boolean     NOT NULL DEFAULT true,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
SELECT add_updated_at_trigger('clients');

-- Contacts liés aux clients
CREATE TABLE contacts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  prenom      text,
  nom         text        NOT NULL,
  poste       text,
  telephone   text,
  email       text,
  principal   boolean     DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────────────────────
-- RÉFÉRENTIEL — ADRESSES (réutilisables)
-- ───────────────────────────────────────────────────────────
CREATE TABLE adresses (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid        REFERENCES clients(id) ON DELETE SET NULL,
  -- Localisation
  nom_lieu      text        NOT NULL,   -- ex: "Entrepôt Lyon Nord"
  adresse       text,
  code_postal   text,
  ville         text        NOT NULL,
  pays          text        DEFAULT 'France',
  -- Géolocalisation
  latitude      numeric(10,7),
  longitude     numeric(10,7),
  -- Opérationnel
  type_lieu     text        DEFAULT 'autre'
                            CHECK (type_lieu IN ('chargement','livraison','depot','plateforme','autre')),
  horaires      text,        -- ex: "Lun-Ven 8h-17h"
  contact_nom   text,
  contact_tel   text,
  instructions  text,        -- instructions spécifiques au lieu
  -- Meta
  actif         boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
SELECT add_updated_at_trigger('adresses');

-- ───────────────────────────────────────────────────────────
-- RÉFÉRENTIEL — CONDUCTEURS
-- ───────────────────────────────────────────────────────────
CREATE TABLE conducteurs (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identité
  nom                     text    NOT NULL,
  prenom                  text    NOT NULL,
  date_naissance          date,
  telephone               text,
  email                   text,
  adresse                 text,
  -- Permis
  numero_permis           text,
  permis_categories       text[], -- ['C','CE','C1']
  permis_expiration       date,
  -- Qualifications
  fimo_date               date,
  fco_date                date,
  fco_expiration          date,
  -- Carte tachygraphe
  carte_tachy_numero      text,
  carte_tachy_expiration  date,
  -- Statut
  statut                  text    NOT NULL DEFAULT 'actif'
                          CHECK (statut IN ('actif','inactif','conge','arret_maladie')),
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
SELECT add_updated_at_trigger('conducteurs');

-- ───────────────────────────────────────────────────────────
-- RÉFÉRENTIEL — VÉHICULES (tracteurs)
-- ───────────────────────────────────────────────────────────
CREATE TABLE vehicules (
  id                        uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  immatriculation           text    NOT NULL UNIQUE,
  marque                    text,
  modele                    text,
  annee                     int,
  type_vehicule             text    NOT NULL DEFAULT 'tracteur'
                            CHECK (type_vehicule IN ('tracteur','porteur','utilitaire')),
  ptac_kg                   int,
  -- Documents
  ct_expiration             date,
  assurance_expiration      date,
  vignette_expiration       date,
  -- Tachygraphe
  tachy_serie               text,
  tachy_etalonnage_prochain date,
  -- Kilométrage
  km_actuel                 int     DEFAULT 0,
  -- Statut
  statut                    text    NOT NULL DEFAULT 'disponible'
                            CHECK (statut IN ('disponible','en_mission','maintenance','hs','vendu')),
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
SELECT add_updated_at_trigger('vehicules');

-- ───────────────────────────────────────────────────────────
-- RÉFÉRENTIEL — REMORQUES
-- ───────────────────────────────────────────────────────────
CREATE TABLE remorques (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  immatriculation       text    NOT NULL UNIQUE,
  type_remorque         text    NOT NULL DEFAULT 'semi'
                        CHECK (type_remorque IN ('semi','plateau','benne','frigo','citerne','bache','autre')),
  marque                text,
  longueur_m            numeric(5,2),
  charge_utile_kg       int,
  -- Documents
  ct_expiration         date,
  assurance_expiration  date,
  -- Statut
  statut                text    NOT NULL DEFAULT 'disponible'
                        CHECK (statut IN ('disponible','en_mission','maintenance','hs','vendue')),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
SELECT add_updated_at_trigger('remorques');

-- ───────────────────────────────────────────────────────────
-- EXPLOITATION — ORDRES DE TRANSPORT
-- ───────────────────────────────────────────────────────────
CREATE SEQUENCE ot_seq START 1001;

CREATE TABLE ordres_transport (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       text    NOT NULL UNIQUE DEFAULT ('OT-' || to_char(now(),'YYYY') || '-' || lpad(nextval('ot_seq')::text, 4, '0')),
  client_id       uuid    NOT NULL REFERENCES clients(id),
  -- Nature
  type_transport  text    NOT NULL DEFAULT 'route'
                  CHECK (type_transport IN ('route','affretement','sous_traitance')),
  nature_marchandise text,
  poids_kg        numeric(10,2),
  volume_m3       numeric(10,2),
  nombre_colis    int,
  temperature_requise text,  -- ex: "0/+4°C", "ambiant"
  -- Tarification
  prix_ht         numeric(10,2),
  taux_tva        numeric(5,2)    DEFAULT 20.00,
  distance_km     int,
  -- Statut
  statut          text    NOT NULL DEFAULT 'brouillon'
                  CHECK (statut IN ('brouillon','planifie','affecte','en_cours','charge','livre','cloture','annule','litige')),
  -- Affectation
  conducteur_id   uuid    REFERENCES conducteurs(id),
  vehicule_id     uuid    REFERENCES vehicules(id),
  remorque_id     uuid    REFERENCES remorques(id),
  -- Dates prévues (globales — précisées dans les étapes)
  date_chargement_prevue  timestamptz,
  date_livraison_prevue   timestamptz,
  date_livraison_reelle   timestamptz,
  -- Documents
  numero_cmr      text,
  numero_bl       text,
  -- Finance
  facturation_id  uuid,  -- FK ajoutée après création table factures
  -- Notes
  instructions    text,
  notes_internes  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
SELECT add_updated_at_trigger('ordres_transport');

-- ───────────────────────────────────────────────────────────
-- EXPLOITATION — ÉTAPES DE MISSION
-- ───────────────────────────────────────────────────────────
CREATE TABLE etapes_mission (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_id           uuid    NOT NULL REFERENCES ordres_transport(id) ON DELETE CASCADE,
  ordre           int     NOT NULL DEFAULT 1,  -- séquence des étapes
  type_etape      text    NOT NULL
                  CHECK (type_etape IN ('chargement','livraison','relais','douane','retour','autre')),
  -- Lieu
  adresse_id      uuid    REFERENCES adresses(id),
  adresse_libre   text,   -- si l'adresse n'est pas dans le référentiel
  ville           text,
  code_postal     text,
  pays            text    DEFAULT 'France',
  -- Dates
  date_prevue     timestamptz,
  date_reelle     timestamptz,
  -- Statut
  statut          text    NOT NULL DEFAULT 'en_attente'
                  CHECK (statut IN ('en_attente','en_cours','realise','annule')),
  -- Marchandise à cette étape
  reference_marchandise text,
  poids_kg        numeric(10,2),
  nombre_colis    int,
  -- Contact sur place
  contact_nom     text,
  contact_tel     text,
  instructions    text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
SELECT add_updated_at_trigger('etapes_mission');

-- ───────────────────────────────────────────────────────────
-- TRAÇABILITÉ — HISTORIQUE STATUTS
-- ───────────────────────────────────────────────────────────
CREATE TABLE historique_statuts (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_id           uuid    NOT NULL REFERENCES ordres_transport(id) ON DELETE CASCADE,
  statut_ancien   text,
  statut_nouveau  text    NOT NULL,
  commentaire     text,
  -- Qui / quand
  created_by      uuid,   -- user id (Supabase auth)
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Trigger auto sur changement de statut OT
CREATE OR REPLACE FUNCTION log_statut_ot()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.statut IS DISTINCT FROM NEW.statut THEN
    INSERT INTO historique_statuts (ot_id, statut_ancien, statut_nouveau)
    VALUES (NEW.id, OLD.statut, NEW.statut);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_ot_statut_history
  AFTER UPDATE ON ordres_transport
  FOR EACH ROW EXECUTE FUNCTION log_statut_ot();

-- ───────────────────────────────────────────────────────────
-- DOCUMENTS
-- ───────────────────────────────────────────────────────────
CREATE TABLE documents (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_id           uuid    REFERENCES ordres_transport(id) ON DELETE CASCADE,
  type_document   text    NOT NULL
                  CHECK (type_document IN ('cmr','bl','pod','facture','devis','autre')),
  nom_fichier     text    NOT NULL,
  url_stockage    text,   -- Supabase Storage path
  taille_bytes    int,
  uploaded_by     uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────────────────────
-- FINANCE — COÛTS DE MISSION
-- ───────────────────────────────────────────────────────────
CREATE TABLE couts_mission (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_id           uuid    NOT NULL REFERENCES ordres_transport(id) ON DELETE CASCADE,
  type_cout       text    NOT NULL
                  CHECK (type_cout IN ('carburant','peage','sous_traitance','chauffeur','amortissement','autre')),
  libelle         text,
  montant_ht      numeric(10,2) NOT NULL,
  taux_tva        numeric(5,2)  DEFAULT 20.00,
  date_cout       date          DEFAULT CURRENT_DATE,
  fournisseur     text,
  reference_piece text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Vue calculée marge par OT
CREATE OR REPLACE VIEW vue_marge_ot AS
SELECT
  ot.id,
  ot.reference,
  c.nom                                           AS client,
  ot.statut,
  ot.prix_ht                                      AS chiffre_affaires,
  COALESCE(SUM(cm.montant_ht), 0)                 AS total_couts,
  COALESCE(ot.prix_ht, 0) - COALESCE(SUM(cm.montant_ht), 0) AS marge_brute,
  CASE
    WHEN COALESCE(ot.prix_ht, 0) > 0
    THEN ROUND(((COALESCE(ot.prix_ht, 0) - COALESCE(SUM(cm.montant_ht), 0))
         / ot.prix_ht * 100)::numeric, 2)
    ELSE 0
  END                                             AS taux_marge_pct,
  ot.date_livraison_prevue,
  ot.date_livraison_reelle,
  ot.created_at
FROM ordres_transport ot
JOIN clients c ON c.id = ot.client_id
LEFT JOIN couts_mission cm ON cm.ot_id = ot.id
GROUP BY ot.id, c.nom;

-- ───────────────────────────────────────────────────────────
-- FINANCE — FACTURES
-- ───────────────────────────────────────────────────────────
CREATE SEQUENCE facture_seq START 2401001;

CREATE TABLE factures (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  numero          text    NOT NULL UNIQUE DEFAULT ('FA-' || to_char(now(),'YYYY') || '-' || lpad(nextval('facture_seq')::text, 4, '0')),
  client_id       uuid    NOT NULL REFERENCES clients(id),
  ot_id           uuid    REFERENCES ordres_transport(id),
  -- Dates
  date_emission   date    NOT NULL DEFAULT CURRENT_DATE,
  date_echeance   date,
  -- Montants
  montant_ht      numeric(10,2) NOT NULL DEFAULT 0,
  taux_tva        numeric(5,2)  NOT NULL DEFAULT 20.00,
  montant_tva     numeric(10,2) GENERATED ALWAYS AS (montant_ht * taux_tva / 100) STORED,
  montant_ttc     numeric(10,2) GENERATED ALWAYS AS (montant_ht * (1 + taux_tva / 100)) STORED,
  -- Statut
  statut          text    NOT NULL DEFAULT 'brouillon'
                  CHECK (statut IN ('brouillon','envoyee','payee','en_retard','litige','annulee')),
  date_paiement   date,
  mode_paiement   text,
  -- Meta
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
SELECT add_updated_at_trigger('factures');

-- FK retour OT → facture
ALTER TABLE ordres_transport
  ADD CONSTRAINT fk_ot_facture FOREIGN KEY (facturation_id) REFERENCES factures(id);

-- ───────────────────────────────────────────────────────────
-- ENTRETIENS VÉHICULES (maintenance)
-- ───────────────────────────────────────────────────────────
CREATE TABLE entretiens (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id     uuid    NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
  type_entretien  text    NOT NULL,
  date_entretien  date    NOT NULL,
  km_au_moment    int,
  cout_ht         numeric(10,2),
  prestataire     text,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────────────────────
-- TACHYGRAPHE
-- ───────────────────────────────────────────────────────────
CREATE TABLE tachygraphe_entrees (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  conducteur_id   uuid    NOT NULL REFERENCES conducteurs(id) ON DELETE CASCADE,
  vehicule_id     uuid    REFERENCES vehicules(id),
  ot_id           uuid    REFERENCES ordres_transport(id),
  date_debut      timestamptz NOT NULL,
  date_fin        timestamptz,
  type_activite   text    NOT NULL
                  CHECK (type_activite IN ('conduite','repos','disponibilite','travail_autre')),
  duree_minutes   int GENERATED ALWAYS AS (
    CASE WHEN date_fin IS NOT NULL
    THEN EXTRACT(EPOCH FROM (date_fin - date_debut))::int / 60
    ELSE NULL END
  ) STORED,
  source          text    DEFAULT 'manuel'
                  CHECK (source IN ('manuel','webfleet','dtco')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────────────────────
-- INDEX
-- ───────────────────────────────────────────────────────────
CREATE INDEX idx_ot_client        ON ordres_transport(client_id);
CREATE INDEX idx_ot_conducteur    ON ordres_transport(conducteur_id);
CREATE INDEX idx_ot_vehicule      ON ordres_transport(vehicule_id);
CREATE INDEX idx_ot_statut        ON ordres_transport(statut);
CREATE INDEX idx_ot_dates         ON ordres_transport(date_chargement_prevue, date_livraison_prevue);
CREATE INDEX idx_etapes_ot        ON etapes_mission(ot_id, ordre);
CREATE INDEX idx_histo_ot         ON historique_statuts(ot_id);
CREATE INDEX idx_factures_client  ON factures(client_id);
CREATE INDEX idx_factures_statut  ON factures(statut);
CREATE INDEX idx_couts_ot         ON couts_mission(ot_id);
CREATE INDEX idx_docs_ot          ON documents(ot_id);
CREATE INDEX idx_contacts_client  ON contacts(client_id);
CREATE INDEX idx_adresses_client  ON adresses(client_id);

-- ───────────────────────────────────────────────────────────
-- RLS (permissif pour l'instant — à sécuriser avec l'auth)
-- ───────────────────────────────────────────────────────────
DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'clients','contacts','adresses','conducteurs','vehicules','remorques',
    'ordres_transport','etapes_mission','historique_statuts','documents',
    'couts_mission','factures','entretiens','tachygraphe_entrees'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY allow_all_%s ON %I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END;
$$;
;
