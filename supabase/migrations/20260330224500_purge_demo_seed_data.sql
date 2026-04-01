-- Purge ciblee des donnees seed demo injectees par src/lib/demoSeed.ts.
-- Le filtre repose sur les UUID artificiels du seed (prefixes 2x..7x + variantes 21/22/71..77).

DO $$
DECLARE
  demo_id_pattern constant text := '^(20000000|30000000|40000000|50000000|60000000|70000000|210000000|220000000|710000000|720000000|730000000|740000000|750000000|760000000|770000000)-0000-0000-0000-[0-9]{12}$';
BEGIN
  -- Dependances OT
  IF to_regclass('public.historique_statuts') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.historique_statuts WHERE ot_id::text ~ %L OR id::text ~ %L', demo_id_pattern, demo_id_pattern);
  END IF;

  IF to_regclass('public.etapes_mission') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.etapes_mission WHERE ot_id::text ~ %L OR id::text ~ %L', demo_id_pattern, demo_id_pattern);
  END IF;

  IF to_regclass('public.factures') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.factures WHERE ot_id::text ~ %L OR id::text ~ %L', demo_id_pattern, demo_id_pattern);
  END IF;

  -- Dependances RH / flotte
  IF to_regclass('public.conducteur_evenements_rh') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.conducteur_evenements_rh WHERE conducteur_id::text ~ %L OR id::text ~ %L', demo_id_pattern, demo_id_pattern);
  END IF;

  IF to_regclass('public.vehicule_releves_km') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.vehicule_releves_km WHERE vehicule_id::text ~ %L OR id::text ~ %L', demo_id_pattern, demo_id_pattern);
  END IF;

  IF to_regclass('public.flotte_entretiens') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.flotte_entretiens WHERE (vehicule_id IS NOT NULL AND vehicule_id::text ~ %L) OR (remorque_id IS NOT NULL AND remorque_id::text ~ %L) OR id::text ~ %L', demo_id_pattern, demo_id_pattern, demo_id_pattern);
  END IF;

  IF to_regclass('public.flotte_equipements') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.flotte_equipements WHERE (vehicule_id IS NOT NULL AND vehicule_id::text ~ %L) OR (remorque_id IS NOT NULL AND remorque_id::text ~ %L) OR id::text ~ %L', demo_id_pattern, demo_id_pattern, demo_id_pattern);
  END IF;

  -- Tables coeur
  IF to_regclass('public.ordres_transport') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.ordres_transport WHERE id::text ~ %L', demo_id_pattern);
  END IF;

  IF to_regclass('public.affectations') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.affectations WHERE id::text ~ %L OR conducteur_id::text ~ %L OR (vehicule_id IS NOT NULL AND vehicule_id::text ~ %L) OR (remorque_id IS NOT NULL AND remorque_id::text ~ %L)', demo_id_pattern, demo_id_pattern, demo_id_pattern, demo_id_pattern);
  END IF;

  IF to_regclass('public.contacts') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.contacts WHERE id::text ~ %L OR client_id::text ~ %L', demo_id_pattern, demo_id_pattern);
  END IF;

  IF to_regclass('public.adresses') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.adresses WHERE id::text ~ %L OR (client_id IS NOT NULL AND client_id::text ~ %L)', demo_id_pattern, demo_id_pattern);
  END IF;

  IF to_regclass('public.conducteurs') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.conducteurs WHERE id::text ~ %L', demo_id_pattern);
  END IF;

  IF to_regclass('public.vehicules') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.vehicules WHERE id::text ~ %L', demo_id_pattern);
  END IF;

  IF to_regclass('public.remorques') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.remorques WHERE id::text ~ %L', demo_id_pattern);
  END IF;

  IF to_regclass('public.clients') IS NOT NULL THEN
    EXECUTE format('DELETE FROM public.clients WHERE id::text ~ %L', demo_id_pattern);
  END IF;
END $$;
