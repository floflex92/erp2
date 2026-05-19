-- Seed réaliste : ~25 courses/jour du 6 avril au 31 août 2026
-- Lundi-Vendredi : 28-32, Samedi : 8-12, Dimanche : 2-4
-- company_id = 1 (tenant test)

DO $$
DECLARE
  v_day         DATE;
  v_day_end     DATE := '2026-08-31';
  v_dow         INT;          -- 0=dimanche, 1=lundi...6=samedi
  v_nb_courses  INT;
  v_i           INT;
  v_ref_year    TEXT;
  v_ref_month   TEXT;
  v_seq         INT := 0;
  v_month_track INT := 0;

  -- Chargement/livraison
  v_charg_date  TIMESTAMPTZ;
  v_livr_date   TIMESTAMPTZ;
  v_duree_jours INT;

  -- Ressources
  v_client_ids  UUID[] := ARRAY[
    '11111111-4444-1111-4444-111111111111',
    '391f7443-3b25-4a83-b1af-2b6762dc8c16',
    'c838cf3c-e250-4147-be00-0ca04de3df3e',
    'f6f4c2aa-a6be-4b27-93a0-bd4201a6f30d',
    'a2c83d6c-c425-4975-a5c0-c436e8c9a02a',
    'c191e009-b487-419b-b827-5834a3446c87',
    '7ee297cf-8463-4ebc-905b-75da4d9e5c09',
    '82ac67a5-18ce-428c-8dd3-7268326a8a17',
    '9b677882-f0b3-4b93-9904-4102e2a76f2d',
    '958c3136-c1da-4856-9490-42544f2e91c3',
    '53aa1281-f371-47e2-81c3-2a4405d8bf0c',
    '6bfc965b-98c8-4027-a50e-771a20b9c35b',
    '11111111-5555-1111-5555-111111111111'
  ];

  v_conducteur_ids UUID[] := ARRAY[
    'fd19348e-9ac5-4bb3-9f92-b89416bebc95',
    '11111111-7777-1111-7777-111111111111',
    'd511f627-67c4-4585-b4d2-7bcc78742cf9',
    '70ac8bf3-14b1-43d6-a90a-9b8421b834f7',
    '37cc132a-c196-41e9-a9bc-e974bb063808',
    '87cd29ea-0377-4e27-b62e-479230b3af1f',
    '4af9d12f-32c0-4e0d-b62e-e8c60344ee0a',
    '15aa606a-5f5d-4bc6-bfb6-e58f53efed87',
    'd4a7b2a0-10dd-4f83-87ea-1a0c9b30ee45',
    '8793e6c1-8e10-444d-a357-678a2b0c7880',
    '87d96cf9-420e-441a-853f-bab8aa3ebb5b',
    '11111111-6666-1111-6666-111111111111',
    '9b3ecfec-a280-4166-857b-41eb4f922d78',
    '6d24b51a-e1e0-4ff6-9681-d305425eb39f',
    '0e90296f-e99e-4c37-beff-0e316b68b830',
    '3b9b4c52-d04a-4917-b624-d1c4be64f1e2',
    '620fc7ab-ffcc-4783-9b2b-7c7d9d64581c',
    '488effa1-299e-49da-841d-aebad18f26aa',
    '63b15762-3f24-4075-b913-ee09cf9db05b',
    'faf6aeb1-3308-4663-b674-5f6157789dcc',
    'eb592256-5421-4292-ada6-6adf2dc3c632',
    'c8cf1bde-4729-4bd1-b642-a9b98b9b72fb'
  ];

  v_vehicule_ids UUID[] := ARRAY[
    'b985127f-560e-4742-8383-299b2906255e',
    '47e31119-4863-4378-94a7-79bc168a5d0d',
    'b870d9e7-fa16-4e0b-a97f-250b6db3a75e',
    '4ec261fd-2acf-4ee5-b278-e3f821726511',
    'f137d4da-668b-4736-8973-a9b584b598ed',
    'b6e007bf-ebd4-41e0-951a-0eff0240980c',
    '901f3717-11d8-47f1-a756-fbdadaab4259',
    'da163c9b-05b4-4bfc-b2c6-2d25b1b72407',
    '29463b21-f590-4e4c-99c8-8a6f04cc6829',
    '8781684d-1c41-4a7c-9964-9823f907c9fa',
    '9c4ce5ed-540e-404e-b23b-faafb9e85a06',
    'e724fa8f-48ed-4935-9839-333877d2b9fd',
    '22adb949-637e-4929-9a99-2278d7c788ac',
    '2f76ea07-7ebe-4966-91cd-9b2b87b04d35',
    'bc756a3f-f54d-4395-9a7e-2b95dcb45e6b',
    'e468432a-9a2b-45d9-9061-65d55bdfaa4a',
    '9baae9be-557f-4d5e-a82c-5c0931761baa',
    'a0d66ead-64b1-4016-9614-ef9dbf92ad94'
  ];

  v_remorque_ids UUID[] := ARRAY[
    'bf30771f-22e1-4e81-8f07-89ce96ec938b',
    'ac5b6017-8189-45a2-96eb-71d3cd3e1241',
    'ba8f0b48-14e1-430f-acb1-802caa10fe49',
    '294c25a1-0e50-4dff-9ab3-dc3ea3be205c',
    '72663c5d-d48d-4cbf-a787-175c728cb331',
    '3d482c78-9c58-4248-af14-788a0583d4c5',
    'b01654c7-2673-42ff-854e-ff33ae54cf25',
    '550ee8d7-2811-404e-b010-3478294445f0',
    '961da656-70a2-4481-ac9a-053c5e6bfa06',
    '5a77dc11-f309-4d90-ae03-3e33e4225bde',
    'dbb094f7-8b0f-4f99-afed-c77000b52a08',
    'dca6c338-6dcc-4641-bb7d-438b2561ece0',
    '37287b5c-5ebd-433f-929f-59a539cbf6ec',
    '2feefae9-593a-44e2-bde3-9d9815d13d7a',
    '51fbb974-d266-4f9b-b6ec-06a51b207ecc',
    'bcd46c28-6549-446b-b395-2225dc5a4eff',
    '2f20517a-7eda-4966-b3ab-a62260cf2392',
    'fa41ce45-f78e-4001-801f-a2fa130a5d69'
  ];

  v_site_ids UUID[] := ARRAY[
    '1e8bdd62-d717-472e-a4a4-26a68efda97b',
    '9bdcb28c-d32f-493c-ad7f-b9fcffd987e2',
    '3f4d36b6-d149-40db-a1bc-7aac1f39b7ba',
    '1298fd10-6793-4c68-afcf-726cbc816c15',
    '044d4534-5df5-4db2-a008-748f9a82c9a7',
    '7249944e-5c60-445b-a533-7142e2a85991',
    '6b7f9386-eae0-4f97-b136-c99bd981d750',
    'befcd0f5-a93c-4ab9-854f-00525b7d1823',
    '0194f9cd-c241-41e6-97f3-0ee708aa9441',
    'b8c697d7-5228-469d-9210-e29bc43e4fdb',
    'de373709-e851-4308-bb98-4894c1ff4e4f',
    '276ba2a8-c317-41f3-b554-dc4bd4347ae6',
    'bc3c663d-9667-4bd4-950d-228a28e93ec0',
    '0602f9b8-1633-4aaf-b99a-868d70d0e484',
    '76aae38c-8dc9-4c05-b2a4-23232964202a',
    '1d0dcd73-80f4-4cf5-8aef-abe0486dd7d6',
    'cd2647d4-adb8-4bef-a1b6-5a27bdda1f1a',
    '0720b5ab-0a30-47bf-a046-9477a8984511',
    '5226dd5f-b987-47b5-bfac-db4650730e31',
    '73a8418d-fbf2-4edb-b4bf-0f335ae66e5c'
  ];

  v_types        TEXT[] := ARRAY['complet','complet','complet','complet','groupage','groupage','partiel','express'];
  v_marchandises TEXT[] := ARRAY[
    'Palettes alimentaires','Matériaux de construction','Produits chimiques conditionnés',
    'Pièces automobiles','Mobilier et équipements','Produits surgelés',
    'Boissons et liquides','Vêtements et textiles','Électronique grand public',
    'Matières premières plastique','Outillage industriel','Papier et carton',
    'Produits pharmaceutiques','Céréales et grains','Matériaux isolants'
  ];

  v_statut      TEXT;
  v_cond_id     UUID;
  v_veh_id      UUID;
  v_rem_id      UUID;
  v_charg_site  UUID;
  v_livr_site   UUID;
  v_charg_idx   INT;
  v_livr_idx    INT;
  v_distance    INT;
  v_prix        NUMERIC;
  v_poids       NUMERIC;
  v_today       DATE := CURRENT_DATE;

BEGIN
  v_day := '2026-04-06';

  WHILE v_day <= v_day_end LOOP
    -- Nombre de courses selon le jour de la semaine
    v_dow := EXTRACT(DOW FROM v_day);
    CASE
      WHEN v_dow = 0 THEN v_nb_courses := 2 + floor(random() * 3)::INT;  -- dimanche: 2-4
      WHEN v_dow = 6 THEN v_nb_courses := 8 + floor(random() * 5)::INT;  -- samedi: 8-12
      ELSE v_nb_courses := 27 + floor(random() * 7)::INT - 3;             -- lun-ven: 24-33
    END CASE;

    -- Rénitialiser seq par mois
    v_ref_year  := TO_CHAR(v_day, 'YYYY');
    v_ref_month := TO_CHAR(v_day, 'MM');

    FOR v_i IN 1..v_nb_courses LOOP
      v_seq := v_seq + 1;

      -- Durée du transport : messagerie=1j, groupage=1-2j, complet=1-4j, frigo=1-2j, vrac=1-3j
      v_duree_jours := CASE floor(random() * 5)::INT
        WHEN 0 THEN 1
        WHEN 1 THEN 1
        WHEN 2 THEN 2
        WHEN 3 THEN 2
        ELSE 3
      END;

      -- Heure de chargement réaliste : 06h-10h
      v_charg_date := (v_day::TIMESTAMP + INTERVAL '6 hours' + (floor(random() * 4) || ' hours')::INTERVAL) AT TIME ZONE 'Europe/Paris';
      v_livr_date  := (v_day::TIMESTAMP + (v_duree_jours || ' days')::INTERVAL + INTERVAL '7 hours' + (floor(random() * 6) || ' hours')::INTERVAL) AT TIME ZONE 'Europe/Paris';

      -- Distance et prix
      v_distance := 80 + floor(random() * 1100)::INT;
      v_prix     := ROUND((v_distance * (0.8 + random() * 1.2))::NUMERIC, 2);
      v_poids    := ROUND((500 + random() * 23500)::NUMERIC, 0);

      -- Statut selon la date par rapport à aujourd'hui
      IF v_day < v_today - INTERVAL '7 days' THEN
        -- Passé lointain : livré ou facturé
        v_statut := CASE floor(random() * 3)::INT
          WHEN 0 THEN 'livre'
          WHEN 1 THEN 'livre'
          ELSE 'facture'
        END;
      ELSIF v_day < v_today THEN
        -- Passé récent : en_cours ou livré
        v_statut := CASE floor(random() * 2)::INT
          WHEN 0 THEN 'en_cours'
          ELSE 'livre'
        END;
      ELSIF v_day = v_today OR v_day <= v_today + INTERVAL '2 days' THEN
        -- Aujourd'hui et 2 jours : planifié ou en cours
        v_statut := CASE floor(random() * 3)::INT
          WHEN 0 THEN 'planifie'
          WHEN 1 THEN 'planifie'
          ELSE 'confirme'
        END;
      ELSIF v_day <= v_today + INTERVAL '21 days' THEN
        -- 3 à 21 jours : confirme ou planifié
        v_statut := CASE floor(random() * 2)::INT
          WHEN 0 THEN 'confirme'
          ELSE 'planifie'
        END;
      ELSE
        -- Plus de 3 semaines : brouillon ou confirme
        v_statut := CASE floor(random() * 3)::INT
          WHEN 0 THEN 'brouillon'
          WHEN 1 THEN 'brouillon'
          ELSE 'confirme'
        END;
      END IF;

      -- Conducteur/véhicule/remorque selon statut
      IF v_statut IN ('livre', 'facture', 'en_cours', 'planifie') THEN
        v_cond_id := v_conducteur_ids[1 + floor(random() * array_length(v_conducteur_ids, 1))::INT];
        v_veh_id  := v_vehicule_ids[1 + floor(random() * array_length(v_vehicule_ids, 1))::INT];
        v_rem_id  := CASE WHEN random() > 0.25 THEN v_remorque_ids[1 + floor(random() * array_length(v_remorque_ids, 1))::INT] ELSE NULL END;
      ELSIF v_statut = 'confirme' THEN
        -- Confirme : parfois ressources pré-assignées
        IF random() > 0.4 THEN
          v_cond_id := v_conducteur_ids[1 + floor(random() * array_length(v_conducteur_ids, 1))::INT];
          v_veh_id  := v_vehicule_ids[1 + floor(random() * array_length(v_vehicule_ids, 1))::INT];
          v_rem_id  := CASE WHEN random() > 0.3 THEN v_remorque_ids[1 + floor(random() * array_length(v_remorque_ids, 1))::INT] ELSE NULL END;
        ELSE
          v_cond_id := NULL;
          v_veh_id  := NULL;
          v_rem_id  := NULL;
        END IF;
      ELSE
        -- Brouillon : pas de ressources
        v_cond_id := NULL;
        v_veh_id  := NULL;
        v_rem_id  := NULL;
      END IF;

      -- Sites chargement et livraison (différents)
      v_charg_idx := 1 + floor(random() * array_length(v_site_ids, 1))::INT;
      LOOP
        v_livr_idx := 1 + floor(random() * array_length(v_site_ids, 1))::INT;
        EXIT WHEN v_livr_idx <> v_charg_idx;
      END LOOP;
      v_charg_site := v_site_ids[v_charg_idx];
      v_livr_site  := v_site_ids[v_livr_idx];

      INSERT INTO ordres_transport (
        id,
        reference,
        client_id,
        type_transport,
        nature_marchandise,
        poids_kg,
        prix_ht,
        taux_tva,
        distance_km,
        statut,
        conducteur_id,
        vehicule_id,
        remorque_id,
        date_chargement_prevue,
        date_livraison_prevue,
        chargement_site_id,
        livraison_site_id,
        est_affretee,
        groupage_fige,
        company_id,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        'OT-CF-' || v_ref_year || v_ref_month || '-' || LPAD(v_seq::TEXT, 4, '0'),
        v_client_ids[1 + floor(random() * array_length(v_client_ids, 1))::INT],
        v_types[1 + floor(random() * array_length(v_types, 1))::INT],
        v_marchandises[1 + floor(random() * array_length(v_marchandises, 1))::INT],
        v_poids,
        v_prix,
        20,
        v_distance,
        v_statut,
        v_cond_id,
        v_veh_id,
        v_rem_id,
        v_charg_date,
        v_livr_date,
        v_charg_site,
        v_livr_site,
        false,
        false,
        1,
        NOW(),
        NOW()
      );
    END LOOP;

    v_day := v_day + INTERVAL '1 day';
  END LOOP;

  RAISE NOTICE 'Seed terminé : % courses insérées', v_seq;
END;
$$;
