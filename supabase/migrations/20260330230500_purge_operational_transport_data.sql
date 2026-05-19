-- Purge operationnelle des donnees transport restantes.
-- Objectif: repartir avec un environnement vide pour conducteurs/camions/remorques/OT.

DO $$
BEGIN
  IF to_regclass('public.historique_statuts') IS NOT NULL THEN
    DELETE FROM public.historique_statuts;
  END IF;

  IF to_regclass('public.etapes_mission') IS NOT NULL THEN
    DELETE FROM public.etapes_mission;
  END IF;

  IF to_regclass('public.factures') IS NOT NULL THEN
    DELETE FROM public.factures;
  END IF;

  IF to_regclass('public.conducteur_evenements_rh') IS NOT NULL THEN
    DELETE FROM public.conducteur_evenements_rh;
  END IF;

  IF to_regclass('public.vehicule_releves_km') IS NOT NULL THEN
    DELETE FROM public.vehicule_releves_km;
  END IF;

  IF to_regclass('public.flotte_entretiens') IS NOT NULL THEN
    DELETE FROM public.flotte_entretiens;
  END IF;

  IF to_regclass('public.flotte_equipements') IS NOT NULL THEN
    DELETE FROM public.flotte_equipements;
  END IF;

  IF to_regclass('public.affectations') IS NOT NULL THEN
    DELETE FROM public.affectations;
  END IF;

  IF to_regclass('public.ordres_transport') IS NOT NULL THEN
    DELETE FROM public.ordres_transport;
  END IF;

  IF to_regclass('public.contacts') IS NOT NULL THEN
    DELETE FROM public.contacts;
  END IF;

  IF to_regclass('public.adresses') IS NOT NULL THEN
    DELETE FROM public.adresses;
  END IF;

  IF to_regclass('public.conducteurs') IS NOT NULL THEN
    DELETE FROM public.conducteurs;
  END IF;

  IF to_regclass('public.vehicules') IS NOT NULL THEN
    DELETE FROM public.vehicules;
  END IF;

  IF to_regclass('public.remorques') IS NOT NULL THEN
    DELETE FROM public.remorques;
  END IF;

END $$;
