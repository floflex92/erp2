
-- 1. clients.type_client : chargeur/transitaire/commissionnaire/autre
ALTER TABLE clients DROP CONSTRAINT clients_type_client_check;
ALTER TABLE clients ADD CONSTRAINT clients_type_client_check
  CHECK (type_client = ANY (ARRAY['chargeur','transitaire','commissionnaire','autre']));

-- 2. ordres_transport.statut : brouillon/confirme/en_cours/livre/facture/annule
ALTER TABLE ordres_transport DROP CONSTRAINT ordres_transport_statut_check;
ALTER TABLE ordres_transport ADD CONSTRAINT ordres_transport_statut_check
  CHECK (statut = ANY (ARRAY['brouillon','confirme','en_cours','livre','facture','annule']));

-- 3. ordres_transport.type_transport : complet/partiel/express/groupage
ALTER TABLE ordres_transport DROP CONSTRAINT ordres_transport_type_transport_check;
ALTER TABLE ordres_transport ADD CONSTRAINT ordres_transport_type_transport_check
  CHECK (type_transport = ANY (ARRAY['complet','partiel','express','groupage']));
;
