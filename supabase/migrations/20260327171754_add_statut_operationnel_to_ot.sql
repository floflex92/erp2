
ALTER TABLE ordres_transport
  ADD COLUMN IF NOT EXISTS statut_operationnel text
  CHECK (statut_operationnel IN ('en_attente','prise_en_charge','a_l_heure','retard_mineur','retard_majeur','termine'));
;
