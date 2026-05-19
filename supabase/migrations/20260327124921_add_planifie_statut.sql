
ALTER TABLE ordres_transport DROP CONSTRAINT IF EXISTS ordres_transport_statut_check;
ALTER TABLE ordres_transport ADD CONSTRAINT ordres_transport_statut_check
  CHECK (statut IN ('brouillon','confirme','planifie','en_cours','livre','facture','annule'));
;
