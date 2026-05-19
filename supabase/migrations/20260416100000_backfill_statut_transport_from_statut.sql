-- Backfill statut_transport pour les OT dont la valeur est restée 'en_attente_validation'
-- alors que le champ statut (legacy) indique un stade plus avancé.
-- Cela corrige les OT créés par le seed ou des insertions sans statut_transport explicite.

update public.ordres_transport
set statut_transport = case
  when statut = 'confirme'   then 'valide'
  when statut = 'planifie'   then 'planifie'
  when statut = 'en_cours'   then 'en_transit'
  when statut = 'livre'      then 'termine'
  when statut = 'facture'    then 'termine'
  when statut = 'annule'     then 'annule'
  else statut_transport  -- ne pas toucher au reste
end
where statut_transport = 'en_attente_validation'
  and statut in ('confirme', 'planifie', 'en_cours', 'livre', 'facture', 'annule');
