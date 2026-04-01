
CREATE TABLE affectations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conducteur_id uuid NOT NULL REFERENCES conducteurs(id) ON DELETE CASCADE,
  vehicule_id uuid REFERENCES vehicules(id) ON DELETE SET NULL,
  remorque_id uuid REFERENCES remorques(id) ON DELETE SET NULL,
  type_affectation text NOT NULL DEFAULT 'fixe' CHECK (type_affectation IN ('fixe', 'temporaire')),
  date_debut date NULL,
  date_fin date NULL,
  actif boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON affectations(conducteur_id);
CREATE INDEX ON affectations(actif);

SELECT add_updated_at_trigger('affectations');
;
