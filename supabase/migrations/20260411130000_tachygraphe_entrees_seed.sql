-- Seed tachygraphe_entrees : 6 conducteurs, semaine courante + mois precedent
-- IDs dynamiques : lookup sur public.conducteurs / public.vehicules existants.
-- Idempotent : supprime les entrees webfleet precedentes pour ces conducteurs.

DO $$
DECLARE
  monday         date;
  prev_mon_start date;
  prev_mon_end   date;

  v_c1 uuid; v_c2 uuid; v_c3 uuid; v_c4 uuid; v_c5 uuid; v_c6 uuid;
  v_v1 uuid; v_v2 uuid; v_v3 uuid; v_v4 uuid; v_v5 uuid; v_v6 uuid;

  cond_ids uuid[];
  vhc_ids  uuid[];
  d        date;
BEGIN
  monday         := date_trunc('week', current_date)::date;
  prev_mon_start := date_trunc('month', current_date - interval '1 month')::date;
  prev_mon_end   := (date_trunc('month', current_date) - interval '1 day')::date;

  SELECT ARRAY(
    SELECT id FROM public.conducteurs
    WHERE statut = 'actif'
    ORDER BY created_at, id
    LIMIT 6
  ) INTO cond_ids;

  IF cond_ids IS NULL OR array_length(cond_ids, 1) < 2 THEN
    RAISE NOTICE 'Pas assez de conducteurs actifs - seed tachygraphe ignore.';
    RETURN;
  END IF;

  v_c1 := cond_ids[1];
  v_c2 := cond_ids[2];
  v_c3 := CASE WHEN array_length(cond_ids,1) >= 3 THEN cond_ids[3] ELSE NULL END;
  v_c4 := CASE WHEN array_length(cond_ids,1) >= 4 THEN cond_ids[4] ELSE NULL END;
  v_c5 := CASE WHEN array_length(cond_ids,1) >= 5 THEN cond_ids[5] ELSE NULL END;
  v_c6 := CASE WHEN array_length(cond_ids,1) >= 6 THEN cond_ids[6] ELSE NULL END;

  SELECT ARRAY(
    SELECT id FROM public.vehicules ORDER BY immatriculation, id LIMIT 6
  ) INTO vhc_ids;

  v_v1 := CASE WHEN vhc_ids IS NOT NULL AND array_length(vhc_ids,1) >= 1 THEN vhc_ids[1] ELSE NULL END;
  v_v2 := CASE WHEN vhc_ids IS NOT NULL AND array_length(vhc_ids,1) >= 2 THEN vhc_ids[2] ELSE NULL END;
  v_v3 := CASE WHEN vhc_ids IS NOT NULL AND array_length(vhc_ids,1) >= 3 THEN vhc_ids[3] ELSE NULL END;
  v_v4 := CASE WHEN vhc_ids IS NOT NULL AND array_length(vhc_ids,1) >= 4 THEN vhc_ids[4] ELSE NULL END;
  v_v5 := CASE WHEN vhc_ids IS NOT NULL AND array_length(vhc_ids,1) >= 5 THEN vhc_ids[5] ELSE NULL END;
  v_v6 := CASE WHEN vhc_ids IS NOT NULL AND array_length(vhc_ids,1) >= 6 THEN vhc_ids[6] ELSE NULL END;

  DELETE FROM public.tachygraphe_entrees
  WHERE conducteur_id = ANY(cond_ids) AND source = 'webfleet';

  -- C1 : semaine normale, vendredi 8h45 -> attention
  INSERT INTO public.tachygraphe_entrees
    (conducteur_id, vehicule_id, type_activite, date_debut, date_fin, source) VALUES
    (v_c1,v_v1,'conduite',(monday+0)+'06:00'::time,(monday+0)+'10:30'::time,'webfleet'),
    (v_c1,v_v1,'repos',   (monday+0)+'10:30'::time,(monday+0)+'11:15'::time,'webfleet'),
    (v_c1,v_v1,'conduite',(monday+0)+'11:15'::time,(monday+0)+'15:00'::time,'webfleet'),
    (v_c1,v_v1,'conduite',(monday+1)+'06:15'::time,(monday+1)+'10:45'::time,'webfleet'),
    (v_c1,v_v1,'repos',   (monday+1)+'10:45'::time,(monday+1)+'11:30'::time,'webfleet'),
    (v_c1,v_v1,'conduite',(monday+1)+'11:30'::time,(monday+1)+'15:15'::time,'webfleet'),
    (v_c1,v_v1,'conduite',(monday+2)+'06:00'::time,(monday+2)+'10:30'::time,'webfleet'),
    (v_c1,v_v1,'repos',   (monday+2)+'10:30'::time,(monday+2)+'11:15'::time,'webfleet'),
    (v_c1,v_v1,'conduite',(monday+2)+'11:15'::time,(monday+2)+'14:45'::time,'webfleet'),
    (v_c1,v_v1,'conduite',(monday+3)+'06:30'::time,(monday+3)+'11:00'::time,'webfleet'),
    (v_c1,v_v1,'repos',   (monday+3)+'11:00'::time,(monday+3)+'11:45'::time,'webfleet'),
    (v_c1,v_v1,'conduite',(monday+3)+'11:45'::time,(monday+3)+'15:30'::time,'webfleet'),
    (v_c1,v_v1,'conduite',current_date+'05:45'::time,current_date+'10:15'::time,'webfleet'),
    (v_c1,v_v1,'repos',   current_date+'10:15'::time,current_date+'11:00'::time,'webfleet'),
    (v_c1,v_v1,'conduite',current_date+'11:00'::time,current_date+'15:30'::time,'webfleet');

  -- C2 : vendredi 10h conduite sans pause -> INFRACTION CRITIQUE
  INSERT INTO public.tachygraphe_entrees
    (conducteur_id, vehicule_id, type_activite, date_debut, date_fin, source) VALUES
    (v_c2,v_v2,'conduite',(monday+0)+'05:30'::time,(monday+0)+'10:00'::time,'webfleet'),
    (v_c2,v_v2,'repos',   (monday+0)+'10:00'::time,(monday+0)+'10:45'::time,'webfleet'),
    (v_c2,v_v2,'conduite',(monday+0)+'10:45'::time,(monday+0)+'14:30'::time,'webfleet'),
    (v_c2,v_v2,'conduite',(monday+1)+'05:45'::time,(monday+1)+'10:15'::time,'webfleet'),
    (v_c2,v_v2,'repos',   (monday+1)+'10:15'::time,(monday+1)+'11:00'::time,'webfleet'),
    (v_c2,v_v2,'conduite',(monday+1)+'11:00'::time,(monday+1)+'14:45'::time,'webfleet'),
    (v_c2,v_v2,'conduite',(monday+2)+'06:00'::time,(monday+2)+'10:30'::time,'webfleet'),
    (v_c2,v_v2,'repos',   (monday+2)+'10:30'::time,(monday+2)+'11:15'::time,'webfleet'),
    (v_c2,v_v2,'conduite',(monday+2)+'11:15'::time,(monday+2)+'15:00'::time,'webfleet'),
    (v_c2,v_v2,'conduite',(monday+3)+'06:15'::time,(monday+3)+'10:45'::time,'webfleet'),
    (v_c2,v_v2,'repos',   (monday+3)+'10:45'::time,(monday+3)+'11:30'::time,'webfleet'),
    (v_c2,v_v2,'conduite',(monday+3)+'11:30'::time,(monday+3)+'15:15'::time,'webfleet'),
    (v_c2,v_v2,'conduite',current_date+'04:00'::time,current_date+'14:00'::time,'webfleet');

  -- C3 : semaine normale, conforme
  IF v_c3 IS NOT NULL THEN
    INSERT INTO public.tachygraphe_entrees
      (conducteur_id, vehicule_id, type_activite, date_debut, date_fin, source) VALUES
      (v_c3,v_v3,'conduite',(monday+0)+'06:00'::time,(monday+0)+'10:30'::time,'webfleet'),
      (v_c3,v_v3,'repos',   (monday+0)+'10:30'::time,(monday+0)+'11:15'::time,'webfleet'),
      (v_c3,v_v3,'conduite',(monday+0)+'11:15'::time,(monday+0)+'15:00'::time,'webfleet'),
      (v_c3,v_v3,'conduite',(monday+1)+'06:30'::time,(monday+1)+'10:30'::time,'webfleet'),
      (v_c3,v_v3,'repos',   (monday+1)+'10:30'::time,(monday+1)+'11:15'::time,'webfleet'),
      (v_c3,v_v3,'conduite',(monday+1)+'11:15'::time,(monday+1)+'14:45'::time,'webfleet'),
      (v_c3,v_v3,'conduite',(monday+2)+'06:15'::time,(monday+2)+'10:45'::time,'webfleet'),
      (v_c3,v_v3,'repos',   (monday+2)+'10:45'::time,(monday+2)+'11:30'::time,'webfleet'),
      (v_c3,v_v3,'conduite',(monday+2)+'11:30'::time,(monday+2)+'15:15'::time,'webfleet'),
      (v_c3,v_v3,'conduite',(monday+3)+'06:00'::time,(monday+3)+'10:30'::time,'webfleet'),
      (v_c3,v_v3,'repos',   (monday+3)+'10:30'::time,(monday+3)+'11:15'::time,'webfleet'),
      (v_c3,v_v3,'conduite',(monday+3)+'11:15'::time,(monday+3)+'15:00'::time,'webfleet'),
      (v_c3,v_v3,'conduite',current_date+'06:00'::time,current_date+'10:30'::time,'webfleet'),
      (v_c3,v_v3,'repos',   current_date+'10:30'::time,current_date+'11:15'::time,'webfleet'),
      (v_c3,v_v3,'conduite',current_date+'11:15'::time,current_date+'14:45'::time,'webfleet');
  END IF;

  -- C4 : vendredi pause 30 min -> PAUSE MANQUANTE (<45 min)
  IF v_c4 IS NOT NULL THEN
    INSERT INTO public.tachygraphe_entrees
      (conducteur_id, vehicule_id, type_activite, date_debut, date_fin, source) VALUES
      (v_c4,v_v4,'conduite',(monday+0)+'06:00'::time,(monday+0)+'10:30'::time,'webfleet'),
      (v_c4,v_v4,'repos',   (monday+0)+'10:30'::time,(monday+0)+'11:15'::time,'webfleet'),
      (v_c4,v_v4,'conduite',(monday+0)+'11:15'::time,(monday+0)+'15:00'::time,'webfleet'),
      (v_c4,v_v4,'conduite',(monday+1)+'06:15'::time,(monday+1)+'10:45'::time,'webfleet'),
      (v_c4,v_v4,'repos',   (monday+1)+'10:45'::time,(monday+1)+'11:30'::time,'webfleet'),
      (v_c4,v_v4,'conduite',(monday+1)+'11:30'::time,(monday+1)+'15:15'::time,'webfleet'),
      (v_c4,v_v4,'conduite',(monday+2)+'06:00'::time,(monday+2)+'10:30'::time,'webfleet'),
      (v_c4,v_v4,'repos',   (monday+2)+'10:30'::time,(monday+2)+'11:15'::time,'webfleet'),
      (v_c4,v_v4,'conduite',(monday+2)+'11:15'::time,(monday+2)+'14:45'::time,'webfleet'),
      (v_c4,v_v4,'conduite',(monday+3)+'06:30'::time,(monday+3)+'11:00'::time,'webfleet'),
      (v_c4,v_v4,'repos',   (monday+3)+'11:00'::time,(monday+3)+'11:45'::time,'webfleet'),
      (v_c4,v_v4,'conduite',(monday+3)+'11:45'::time,(monday+3)+'15:30'::time,'webfleet'),
      (v_c4,v_v4,'conduite',current_date+'06:00'::time,current_date+'10:30'::time,'webfleet'),
      (v_c4,v_v4,'repos',   current_date+'10:30'::time,current_date+'11:00'::time,'webfleet'),
      (v_c4,v_v4,'conduite',current_date+'11:00'::time,current_date+'14:00'::time,'webfleet');
  END IF;

  -- C5 : vendredi 5h15 continue sans pause -> CONDUITE CONTINUE
  IF v_c5 IS NOT NULL THEN
    INSERT INTO public.tachygraphe_entrees
      (conducteur_id, vehicule_id, type_activite, date_debut, date_fin, source) VALUES
      (v_c5,v_v5,'conduite',(monday+0)+'06:00'::time,(monday+0)+'10:30'::time,'webfleet'),
      (v_c5,v_v5,'repos',   (monday+0)+'10:30'::time,(monday+0)+'11:15'::time,'webfleet'),
      (v_c5,v_v5,'conduite',(monday+0)+'11:15'::time,(monday+0)+'14:45'::time,'webfleet'),
      (v_c5,v_v5,'conduite',(monday+1)+'06:15'::time,(monday+1)+'10:45'::time,'webfleet'),
      (v_c5,v_v5,'repos',   (monday+1)+'10:45'::time,(monday+1)+'11:30'::time,'webfleet'),
      (v_c5,v_v5,'conduite',(monday+1)+'11:30'::time,(monday+1)+'15:00'::time,'webfleet'),
      (v_c5,v_v5,'conduite',(monday+2)+'06:00'::time,(monday+2)+'10:30'::time,'webfleet'),
      (v_c5,v_v5,'repos',   (monday+2)+'10:30'::time,(monday+2)+'11:15'::time,'webfleet'),
      (v_c5,v_v5,'conduite',(monday+2)+'11:15'::time,(monday+2)+'15:30'::time,'webfleet'),
      (v_c5,v_v5,'conduite',(monday+3)+'06:30'::time,(monday+3)+'11:00'::time,'webfleet'),
      (v_c5,v_v5,'repos',   (monday+3)+'11:00'::time,(monday+3)+'11:45'::time,'webfleet'),
      (v_c5,v_v5,'conduite',(monday+3)+'11:45'::time,(monday+3)+'15:15'::time,'webfleet'),
      (v_c5,v_v5,'conduite',current_date+'06:00'::time,current_date+'11:15'::time,'webfleet');
  END IF;

  -- C6 : semaine normale, conforme
  IF v_c6 IS NOT NULL THEN
    INSERT INTO public.tachygraphe_entrees
      (conducteur_id, vehicule_id, type_activite, date_debut, date_fin, source) VALUES
      (v_c6,v_v6,'conduite',(monday+0)+'06:00'::time,(monday+0)+'10:15'::time,'webfleet'),
      (v_c6,v_v6,'repos',   (monday+0)+'10:15'::time,(monday+0)+'11:00'::time,'webfleet'),
      (v_c6,v_v6,'conduite',(monday+0)+'11:00'::time,(monday+0)+'14:45'::time,'webfleet'),
      (v_c6,v_v6,'conduite',(monday+1)+'06:00'::time,(monday+1)+'10:30'::time,'webfleet'),
      (v_c6,v_v6,'repos',   (monday+1)+'10:30'::time,(monday+1)+'11:15'::time,'webfleet'),
      (v_c6,v_v6,'conduite',(monday+1)+'11:15'::time,(monday+1)+'15:00'::time,'webfleet'),
      (v_c6,v_v6,'conduite',(monday+2)+'06:15'::time,(monday+2)+'10:45'::time,'webfleet'),
      (v_c6,v_v6,'repos',   (monday+2)+'10:45'::time,(monday+2)+'11:30'::time,'webfleet'),
      (v_c6,v_v6,'conduite',(monday+2)+'11:30'::time,(monday+2)+'14:45'::time,'webfleet'),
      (v_c6,v_v6,'conduite',(monday+3)+'06:00'::time,(monday+3)+'10:30'::time,'webfleet'),
      (v_c6,v_v6,'repos',   (monday+3)+'10:30'::time,(monday+3)+'11:15'::time,'webfleet'),
      (v_c6,v_v6,'conduite',(monday+3)+'11:15'::time,(monday+3)+'15:00'::time,'webfleet'),
      (v_c6,v_v6,'conduite',current_date+'06:00'::time,current_date+'10:30'::time,'webfleet'),
      (v_c6,v_v6,'repos',   current_date+'10:30'::time,current_date+'11:15'::time,'webfleet'),
      (v_c6,v_v6,'conduite',current_date+'11:15'::time,current_date+'14:30'::time,'webfleet');
  END IF;

  -- Mois precedent : 3 entrees/jour ouvre pour c1..c4 (attestations)
  FOR d IN
    SELECT gs::date
    FROM generate_series(prev_mon_start, prev_mon_end, '1 day'::interval) gs
    WHERE EXTRACT(DOW FROM gs) BETWEEN 1 AND 5
  LOOP
    INSERT INTO public.tachygraphe_entrees
      (conducteur_id, vehicule_id, type_activite, date_debut, date_fin, source) VALUES
      (v_c1,v_v1,'conduite',d+'06:00'::time,d+'10:30'::time,'webfleet'),
      (v_c1,v_v1,'repos',   d+'10:30'::time,d+'11:15'::time,'webfleet'),
      (v_c1,v_v1,'conduite',d+'11:15'::time,d+'15:00'::time,'webfleet'),
      (v_c2,v_v2,'conduite',d+'05:45'::time,d+'10:15'::time,'webfleet'),
      (v_c2,v_v2,'repos',   d+'10:15'::time,d+'11:00'::time,'webfleet'),
      (v_c2,v_v2,'conduite',d+'11:00'::time,d+'14:45'::time,'webfleet');

    IF v_c3 IS NOT NULL THEN
      INSERT INTO public.tachygraphe_entrees
        (conducteur_id, vehicule_id, type_activite, date_debut, date_fin, source) VALUES
        (v_c3,v_v3,'conduite',d+'06:15'::time,d+'10:45'::time,'webfleet'),
        (v_c3,v_v3,'repos',   d+'10:45'::time,d+'11:30'::time,'webfleet'),
        (v_c3,v_v3,'conduite',d+'11:30'::time,d+'15:15'::time,'webfleet');
    END IF;

    IF v_c4 IS NOT NULL THEN
      INSERT INTO public.tachygraphe_entrees
        (conducteur_id, vehicule_id, type_activite, date_debut, date_fin, source) VALUES
        (v_c4,v_v4,'conduite',d+'06:30'::time,d+'11:00'::time,'webfleet'),
        (v_c4,v_v4,'repos',   d+'11:00'::time,d+'11:45'::time,'webfleet'),
        (v_c4,v_v4,'conduite',d+'11:45'::time,d+'15:30'::time,'webfleet');
    END IF;
  END LOOP;

  RAISE NOTICE 'Seed tachygraphe_entrees termine pour % conducteurs.', array_length(cond_ids, 1);
END $$;