-- Jeu de donnees de demonstration pour l'ERP transport.
-- Pre requis recommande :
-- 1. schema principal deja present
-- 2. migrations 20260327_0001_chauffeurs_rh.sql et 20260327_0002_flotte.sql appliquees
--
-- Le script est rejouable : il utilise des UUID stables et des UPSERT.

insert into public.clients (
  id, nom, type_client, telephone, email, adresse, code_postal, ville, pays,
  siret, tva_intra, conditions_paiement, encours_max, taux_tva_defaut, notes, actif
) values
  ('20000000-0000-0000-0000-000000000001', 'Transfrais Nord', 'chargeur', '03 20 10 10 10', 'logistique@transfrais-nord.fr', '12 rue du Port', '59000', 'Lille', 'France', '51234567800011', 'FR16512345678', 30, 45000, 20, 'Client historique frais.', true),
  ('20000000-0000-0000-0000-000000000002', 'Batilog Est', 'chargeur', '03 83 40 20 20', 'exploitation@batilog-est.fr', '88 avenue de Metz', '54000', 'Nancy', 'France', '52345678900012', 'FR24523456789', 45, 60000, 20, 'Activite palette et messagerie lourde.', true),
  ('20000000-0000-0000-0000-000000000003', 'Ocean Forwarding', 'transitaire', '02 35 11 22 33', 'ops@ocean-forwarding.eu', '6 quai Colbert', '76600', 'Le Havre', 'France', '53456789000013', 'FR33534567890', 60, 90000, 20, 'Flux import/export portuaire.', true),
  ('20000000-0000-0000-0000-000000000004', 'Agro Centre', 'chargeur', '02 47 55 77 88', 'transport@agro-centre.fr', '4 zone de la Gare', '37000', 'Tours', 'France', '54567890100014', 'FR42545678901', 30, 55000, 20, 'Fret sec et temperature dirigee.', true),
  ('20000000-0000-0000-0000-000000000005', 'Express Rhone', 'commissionnaire', '04 72 12 34 56', 'planning@express-rhone.fr', '18 rue de Lyon', '69000', 'Lyon', 'France', '55678901200015', 'FR51556789012', 30, 35000, 20, 'Missions express regionales.', true),
  ('20000000-0000-0000-0000-000000000006', 'Metal Ouest', 'chargeur', '02 99 66 44 22', 'shipping@metal-ouest.fr', '32 route Industrielle', '35000', 'Rennes', 'France', '56789012300016', 'FR60567890123', 45, 70000, 20, 'Chargements acier et profils longs.', true)
on conflict (id) do update set
  nom = excluded.nom,
  type_client = excluded.type_client,
  telephone = excluded.telephone,
  email = excluded.email,
  adresse = excluded.adresse,
  code_postal = excluded.code_postal,
  ville = excluded.ville,
  pays = excluded.pays,
  siret = excluded.siret,
  tva_intra = excluded.tva_intra,
  conditions_paiement = excluded.conditions_paiement,
  encours_max = excluded.encours_max,
  taux_tva_defaut = excluded.taux_tva_defaut,
  notes = excluded.notes,
  actif = excluded.actif;

insert into public.contacts (id, client_id, nom, prenom, poste, telephone, email, principal) values
  ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Lambert', 'Julie', 'Approvisionnement', '06 11 11 11 11', 'julie.lambert@transfrais-nord.fr', true),
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Petit', 'Marc', 'Magasin', '06 22 22 22 22', 'marc.petit@batilog-est.fr', true),
  ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'Meyer', 'Nina', 'Operations', '06 33 33 33 33', 'n.meyer@ocean-forwarding.eu', true),
  ('21000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'Roux', 'Damien', 'Affretement', '06 44 44 44 44', 'd.roux@agro-centre.fr', true),
  ('21000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'Bonnet', 'Elise', 'Planning', '06 55 55 55 55', 'elise.bonnet@express-rhone.fr', true),
  ('21000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', 'Garnier', 'Loic', 'Expedition', '06 66 66 66 66', 'loic.garnier@metal-ouest.fr', true)
on conflict (id) do update set
  client_id = excluded.client_id,
  nom = excluded.nom,
  prenom = excluded.prenom,
  poste = excluded.poste,
  telephone = excluded.telephone,
  email = excluded.email,
  principal = excluded.principal;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'adresse_facturation'
  ) then
    update public.clients
    set
      code_client = case id
        when '20000000-0000-0000-0000-000000000001' then 'CLI-001'
        when '20000000-0000-0000-0000-000000000002' then 'CLI-002'
        when '20000000-0000-0000-0000-000000000003' then 'CLI-003'
        when '20000000-0000-0000-0000-000000000004' then 'CLI-004'
        when '20000000-0000-0000-0000-000000000005' then 'CLI-005'
        when '20000000-0000-0000-0000-000000000006' then 'CLI-006'
        else code_client
      end,
      adresse_facturation = coalesce(adresse_facturation, adresse),
      code_postal_facturation = coalesce(code_postal_facturation, code_postal),
      ville_facturation = coalesce(ville_facturation, ville),
      pays_facturation = coalesce(pays_facturation, pays),
      contact_facturation_nom = case id
        when '20000000-0000-0000-0000-000000000001' then 'Julie Lambert'
        when '20000000-0000-0000-0000-000000000002' then 'Marc Petit'
        when '20000000-0000-0000-0000-000000000003' then 'Nina Meyer'
        when '20000000-0000-0000-0000-000000000004' then 'Damien Roux'
        when '20000000-0000-0000-0000-000000000005' then 'Elise Bonnet'
        when '20000000-0000-0000-0000-000000000006' then 'Loic Garnier'
        else contact_facturation_nom
      end,
      contact_facturation_email = case id
        when '20000000-0000-0000-0000-000000000001' then 'compta@transfrais-nord.fr'
        when '20000000-0000-0000-0000-000000000002' then 'factures@batilog-est.fr'
        when '20000000-0000-0000-0000-000000000003' then 'billing@ocean-forwarding.eu'
        when '20000000-0000-0000-0000-000000000004' then 'facturation@agro-centre.fr'
        when '20000000-0000-0000-0000-000000000005' then 'compta@express-rhone.fr'
        when '20000000-0000-0000-0000-000000000006' then 'factures@metal-ouest.fr'
        else contact_facturation_email
      end,
      contact_facturation_telephone = case id
        when '20000000-0000-0000-0000-000000000001' then '03 20 10 10 19'
        when '20000000-0000-0000-0000-000000000002' then '03 83 40 20 29'
        when '20000000-0000-0000-0000-000000000003' then '02 35 11 22 39'
        when '20000000-0000-0000-0000-000000000004' then '02 47 55 77 98'
        when '20000000-0000-0000-0000-000000000005' then '04 72 12 34 59'
        when '20000000-0000-0000-0000-000000000006' then '02 99 66 44 29'
        else contact_facturation_telephone
      end,
      mode_paiement_defaut = case id
        when '20000000-0000-0000-0000-000000000001' then 'virement'
        when '20000000-0000-0000-0000-000000000002' then 'virement'
        when '20000000-0000-0000-0000-000000000003' then 'traite'
        when '20000000-0000-0000-0000-000000000004' then 'prelevement'
        when '20000000-0000-0000-0000-000000000005' then 'virement'
        when '20000000-0000-0000-0000-000000000006' then 'cheque'
        else mode_paiement_defaut
      end,
      type_echeance = case id
        when '20000000-0000-0000-0000-000000000003' then 'fin_de_mois'
        when '20000000-0000-0000-0000-000000000004' then 'jour_fixe'
        when '20000000-0000-0000-0000-000000000006' then 'fin_de_mois_le_10'
        else 'date_facture_plus_delai'
      end,
      jour_echeance = case id
        when '20000000-0000-0000-0000-000000000004' then 15
        else null
      end,
      iban = case id
        when '20000000-0000-0000-0000-000000000001' then 'FR7611119000601234567890185'
        when '20000000-0000-0000-0000-000000000002' then 'FR7630004000031234567890143'
        when '20000000-0000-0000-0000-000000000003' then 'FR7610244000201234567890197'
        when '20000000-0000-0000-0000-000000000004' then 'FR7610278000101234567890184'
        when '20000000-0000-0000-0000-000000000005' then 'FR7630066000111234567890189'
        when '20000000-0000-0000-0000-000000000006' then 'FR7613897000101234567890116'
        else iban
      end,
      bic = case id
        when '20000000-0000-0000-0000-000000000001' then 'PSSTFRPPLIL'
        when '20000000-0000-0000-0000-000000000002' then 'BNPAFRPPNAN'
        when '20000000-0000-0000-0000-000000000003' then 'CEPAFRPP024'
        when '20000000-0000-0000-0000-000000000004' then 'CMCIFR2ATOU'
        when '20000000-0000-0000-0000-000000000005' then 'AGRIFRPP869'
        when '20000000-0000-0000-0000-000000000006' then 'SOGEFRPPREN'
        else bic
      end,
      banque = case id
        when '20000000-0000-0000-0000-000000000001' then 'La Banque Postale'
        when '20000000-0000-0000-0000-000000000002' then 'BNP Paribas'
        when '20000000-0000-0000-0000-000000000003' then 'Caisse d Epargne'
        when '20000000-0000-0000-0000-000000000004' then 'Credit Mutuel'
        when '20000000-0000-0000-0000-000000000005' then 'Credit Agricole'
        when '20000000-0000-0000-0000-000000000006' then 'Societe Generale'
        else banque
      end,
      titulaire_compte = nom
    where id::text like '20000000-0000-0000-0000-%';
  end if;
end $$;

insert into public.adresses (
  id, client_id, nom_lieu, type_lieu, adresse, code_postal, ville, pays, contact_nom, contact_tel, horaires, instructions, actif
) values
  ('22000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Entrepot Lille Froid', 'enlevement', '18 rue des Glacieres', '59000', 'Lille', 'France', 'Julie Lambert', '06 11 11 11 11', '06:00-14:00', 'Acces quai 4 a 8', true),
  ('22000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Plateforme Rungis', 'livraison', '7 avenue de la Logistique', '94150', 'Rungis', 'France', 'Equipe reception', '01 45 60 20 20', '05:00-12:00', 'Respect temperature dirigee', true),
  ('22000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Depot Nancy BTP', 'enlevement', '12 rue des Materiaux', '54000', 'Nancy', 'France', 'Marc Petit', '06 22 22 22 22', '07:00-15:00', 'Chargement chariot embarque', true),
  ('22000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'Chantier Metz Sud', 'livraison', '31 route de Jouy', '57070', 'Metz', 'France', 'Chef chantier', '06 22 22 22 29', '08:00-16:00', 'Prevenir 30 min avant', true),
  ('22000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', 'Terminal Havre 7', 'enlevement', 'Quai Atlantique 7', '76600', 'Le Havre', 'France', 'Nina Meyer', '06 33 33 33 33', '24h/24', 'Badge portuaire obligatoire', true),
  ('22000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000003', 'Zone Douane Gennevilliers', 'livraison', '21 boulevard du Port', '92230', 'Gennevilliers', 'France', 'Service transit', '06 33 33 33 39', '08:00-18:00', 'Documents export originaux', true),
  ('22000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000004', 'Usine Tours Agro', 'enlevement', '4 zone de la Gare', '37000', 'Tours', 'France', 'Damien Roux', '06 44 44 44 44', '05:00-13:00', 'Quai froid 2', true),
  ('22000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000004', 'Plateforme Orleans', 'livraison', '15 avenue du Fret', '45000', 'Orleans', 'France', 'Reception agro', '06 44 44 44 48', '06:00-12:00', 'Palettes filmees', true),
  ('22000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000005', 'Hub Lyon Centre', 'enlevement', '18 rue de Lyon', '69000', 'Lyon', 'France', 'Elise Bonnet', '06 55 55 55 55', '09:00-17:00', 'Express prioritaire', true),
  ('22000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000005', 'Agence Grenoble', 'livraison', '9 rue de l Industrie', '38100', 'Grenoble', 'France', 'Reception express', '06 55 55 55 59', '08:00-15:00', 'Remise contre signature', true),
  ('22000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000006', 'Metal Ouest Rennes', 'enlevement', '32 route Industrielle', '35000', 'Rennes', 'France', 'Loic Garnier', '06 66 66 66 66', '07:00-14:00', 'Chargement pont roulant', true),
  ('22000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000006', 'Site Saint-Nazaire', 'livraison', '2 route du Chantier Naval', '44600', 'Saint-Nazaire', 'France', 'Controle reception', '06 66 66 66 69', '08:00-12:00', 'Port des EPI obligatoire', true)
on conflict (id) do update set
  client_id = excluded.client_id,
  nom_lieu = excluded.nom_lieu,
  type_lieu = excluded.type_lieu,
  adresse = excluded.adresse,
  code_postal = excluded.code_postal,
  ville = excluded.ville,
  pays = excluded.pays,
  contact_nom = excluded.contact_nom,
  contact_tel = excluded.contact_tel,
  horaires = excluded.horaires,
  instructions = excluded.instructions,
  actif = excluded.actif;

insert into public.conducteurs (
  id, nom, prenom, telephone, email, adresse, matricule, poste, type_contrat, date_entree,
  date_naissance, numero_permis, permis_categories, permis_expiration, fimo_date, fco_date,
  fco_expiration, visite_medicale_date, visite_medicale_expiration, recyclage_date, recyclage_expiration,
  carte_tachy_numero, carte_tachy_expiration, statut, notes, preferences, contact_urgence_nom, contact_urgence_telephone
) values
  ('30000000-0000-0000-0000-000000000001', 'Martin', 'Cedric', '06 71 10 00 01', 'cedric.martin@erp-demo.fr', 'Lille', 'CH001', 'Conducteur SPL', 'CDI', current_date - 820, '1986-04-18', 'CEMART001', array['C','CE'], current_date + 420, current_date - 1820, current_date - 210, current_date + 1540, current_date - 250, current_date + 90, current_date - 90, current_date + 275, 'TACHY001', current_date + 320, 'actif', 'ADR de base.', 'Frigo et longue distance', 'Claire Martin', '06 90 10 10 10'),
  ('30000000-0000-0000-0000-000000000002', 'Bernard', 'Yann', '06 71 10 00 02', 'yann.bernard@erp-demo.fr', 'Arras', 'CH002', 'Conducteur PL', 'CDI', current_date - 620, '1989-08-03', 'CEBERN002', array['C','CE'], current_date + 180, current_date - 1460, current_date - 120, current_date + 1630, current_date - 220, current_date + 45, current_date - 60, current_date + 305, 'TACHY002', current_date + 210, 'actif', 'Tres bon relationnel quai.', 'Regional et palette', 'Lucie Bernard', '06 90 10 10 11'),
  ('30000000-0000-0000-0000-000000000003', 'Dubois', 'Antoine', '06 71 10 00 03', 'antoine.dubois@erp-demo.fr', 'Lens', 'CH003', 'Conducteur SPL', 'CDI', current_date - 500, '1991-11-12', 'CEDUBO003', array['B','C','CE'], current_date + 510, current_date - 1300, current_date - 300, current_date + 1460, current_date - 300, current_date + 120, current_date - 30, current_date + 330, 'TACHY003', current_date + 250, 'actif', null, 'Decouchages OK', 'Sophie Dubois', '06 90 10 10 12'),
  ('30000000-0000-0000-0000-000000000004', 'Petit', 'Mathieu', '06 71 10 00 04', 'mathieu.petit@erp-demo.fr', 'Valenciennes', 'CH004', 'Conducteur frigo', 'CDI', current_date - 960, '1984-07-22', 'CEPETI004', array['C','CE'], current_date + 300, current_date - 2100, current_date - 60, current_date + 1760, current_date - 180, current_date + 20, current_date - 120, current_date + 240, 'TACHY004', current_date + 140, 'actif', 'Formation froid recente.', 'Frigorifique prioritaire', 'Julie Petit', '06 90 10 10 13'),
  ('30000000-0000-0000-0000-000000000005', 'Robert', 'Nicolas', '06 71 10 00 05', 'nicolas.robert@erp-demo.fr', 'Reims', 'CH005', 'Conducteur PL', 'CDD', current_date - 120, '1995-01-14', 'CEROBE005', array['C'], current_date + 260, current_date - 980, current_date - 50, current_date + 1780, current_date - 170, current_date + 60, current_date - 20, current_date + 340, 'TACHY005', current_date + 365, 'actif', 'Renfort saisonnier.', 'Messagerie jour', 'Emma Robert', '06 90 10 10 14'),
  ('30000000-0000-0000-0000-000000000006', 'Richard', 'Loic', '06 71 10 00 06', 'loic.richard@erp-demo.fr', 'Lyon', 'CH006', 'Conducteur SPL', 'CDI', current_date - 430, '1990-02-28', 'CERICH006', array['C','CE'], current_date + 130, current_date - 1500, current_date - 170, current_date + 1580, current_date - 190, current_date + 15, current_date - 70, current_date + 210, 'TACHY006', current_date + 85, 'actif', 'Conduite soignee.', 'National', 'Laura Richard', '06 90 10 10 15'),
  ('30000000-0000-0000-0000-000000000007', 'Simon', 'Kevin', '06 71 10 00 07', 'kevin.simon@erp-demo.fr', 'Tours', 'CH007', 'Conducteur PL', 'Interim', current_date - 35, '1998-06-19', 'CESIMO007', array['C'], current_date + 700, current_date - 700, current_date - 45, current_date + 1780, current_date - 120, current_date + 180, null, null, 'TACHY007', current_date + 420, 'actif', 'Interim agence Centre.', 'Zone Centre', 'Lina Simon', '06 90 10 10 16'),
  ('30000000-0000-0000-0000-000000000008', 'Moreau', 'David', '06 71 10 00 08', 'david.moreau@erp-demo.fr', 'Rennes', 'CH008', 'Conducteur SPL', 'CDI', current_date - 1280, '1983-09-07', 'CEMORE008', array['C','CE'], current_date + 210, current_date - 2300, current_date - 40, current_date + 1790, current_date - 160, current_date - 10, current_date - 40, current_date + 310, 'TACHY008', current_date + 175, 'arret_maladie', 'Retour prevu semaine prochaine.', 'Benne et industrie', 'Morgane Moreau', '06 90 10 10 17')
on conflict (id) do update set
  nom = excluded.nom,
  prenom = excluded.prenom,
  telephone = excluded.telephone,
  email = excluded.email,
  adresse = excluded.adresse,
  matricule = excluded.matricule,
  poste = excluded.poste,
  type_contrat = excluded.type_contrat,
  date_entree = excluded.date_entree,
  date_naissance = excluded.date_naissance,
  numero_permis = excluded.numero_permis,
  permis_categories = excluded.permis_categories,
  permis_expiration = excluded.permis_expiration,
  fimo_date = excluded.fimo_date,
  fco_date = excluded.fco_date,
  fco_expiration = excluded.fco_expiration,
  visite_medicale_date = excluded.visite_medicale_date,
  visite_medicale_expiration = excluded.visite_medicale_expiration,
  recyclage_date = excluded.recyclage_date,
  recyclage_expiration = excluded.recyclage_expiration,
  carte_tachy_numero = excluded.carte_tachy_numero,
  carte_tachy_expiration = excluded.carte_tachy_expiration,
  statut = excluded.statut,
  notes = excluded.notes,
  preferences = excluded.preferences,
  contact_urgence_nom = excluded.contact_urgence_nom,
  contact_urgence_telephone = excluded.contact_urgence_telephone;

insert into public.vehicules (
  id, immatriculation, marque, modele, annee, type_vehicule, ptac_kg, numero_carte_grise, vin,
  date_mise_en_circulation, date_achat, cout_achat_ht, type_propriete, garantie_expiration,
  ct_expiration, assurance_expiration, vignette_expiration, tachy_serie, tachy_etalonnage_prochain,
  contrat_entretien, prestataire_entretien, garage_entretien, km_actuel, statut, notes, preferences
) values
  ('40000000-0000-0000-0000-000000000001', 'FR-201-AA', 'Volvo', 'FH 500', 2021, 'tracteur', 44000, 'CG-TR-001', 'VINTR001', current_date - 1500, current_date - 1400, 86500, 'achat', current_date + 220, current_date + 30, current_date + 120, current_date + 180, 'TGH-001', current_date + 60, true, 'Volvo Services', 'Garage Nord Truck', 412350, 'disponible', 'Tracteur national', 'National longue distance'),
  ('40000000-0000-0000-0000-000000000002', 'FR-202-AA', 'DAF', 'XF 480', 2020, 'tracteur', 44000, 'CG-TR-002', 'VINTR002', current_date - 1700, current_date - 1600, 78200, 'credit_bail', current_date + 120, current_date + 15, current_date + 95, current_date + 150, 'TGH-002', current_date + 35, true, 'DAF Contrat', 'Garage Est Poids Lourds', 505120, 'disponible', null, 'Regional Est'),
  ('40000000-0000-0000-0000-000000000003', 'FR-203-AA', 'Mercedes', 'Actros 1845', 2019, 'tracteur', 44000, 'CG-TR-003', 'VINTR003', current_date - 2100, current_date - 2000, 72800, 'achat', current_date - 10, current_date + 140, current_date + 90, current_date + 95, 'TGH-003', current_date + 80, false, null, 'Garage Route 57', 612800, 'en_service', 'Vehicule fiable', 'General'),
  ('40000000-0000-0000-0000-000000000004', 'FR-204-AA', 'Renault', 'T 480', 2022, 'tracteur', 44000, 'CG-TR-004', 'VINTR004', current_date - 980, current_date - 900, 90100, 'leasing', current_date + 330, current_date + 210, current_date + 180, current_date + 240, 'TGH-004', current_date + 120, true, 'Renault Trucks Care', 'Garage Centre Truck', 280450, 'disponible', 'Affecte agro', 'Frigo'),
  ('40000000-0000-0000-0000-000000000005', 'FR-205-AA', 'Iveco', 'S-Way', 2021, 'tracteur', 44000, 'CG-TR-005', 'VINTR005', current_date - 1200, current_date - 1100, 84400, 'achat', current_date + 200, current_date - 5, current_date + 30, current_date + 120, 'TGH-005', current_date + 25, false, null, 'Garage Grand Ouest', 365900, 'maintenance', 'CT en retard pour tests alertes', 'A verifier'),
  ('40000000-0000-0000-0000-000000000006', 'FR-206-AA', 'MAN', 'TGX 18.470', 2018, 'tracteur', 44000, 'CG-TR-006', 'VINTR006', current_date - 2500, current_date - 2400, 61800, 'achat', current_date - 300, current_date + 70, current_date + 40, current_date + 100, 'TGH-006', current_date + 15, false, null, 'Garage Rhone Alpes', 689500, 'en_service', null, 'Express'),
  ('40000000-0000-0000-0000-000000000007', 'FR-207-AA', 'Mercedes', 'Atego', 2020, 'porteur', 19000, 'CG-PT-007', 'VINPT007', current_date - 1600, current_date - 1500, 64500, 'achat', current_date + 90, current_date + 20, current_date + 60, current_date + 110, 'TGH-007', current_date + 45, true, 'MB Service', 'Garage Centre Truck', 242300, 'disponible', 'Porteur distribution', 'Regional jour'),
  ('40000000-0000-0000-0000-000000000008', 'FR-208-AA', 'Renault', 'D Wide', 2019, 'porteur', 26000, 'CG-PT-008', 'VINPT008', current_date - 2200, current_date - 2100, 58900, 'location', current_date + 30, current_date + 55, current_date + 25, current_date + 75, 'TGH-008', current_date + 20, false, 'LocaFleet', 'Garage Ouest PL', 318700, 'disponible', null, 'Messagerie lourde')
on conflict (id) do update set
  immatriculation = excluded.immatriculation,
  marque = excluded.marque,
  modele = excluded.modele,
  annee = excluded.annee,
  type_vehicule = excluded.type_vehicule,
  ptac_kg = excluded.ptac_kg,
  numero_carte_grise = excluded.numero_carte_grise,
  vin = excluded.vin,
  date_mise_en_circulation = excluded.date_mise_en_circulation,
  date_achat = excluded.date_achat,
  cout_achat_ht = excluded.cout_achat_ht,
  type_propriete = excluded.type_propriete,
  garantie_expiration = excluded.garantie_expiration,
  ct_expiration = excluded.ct_expiration,
  assurance_expiration = excluded.assurance_expiration,
  vignette_expiration = excluded.vignette_expiration,
  tachy_serie = excluded.tachy_serie,
  tachy_etalonnage_prochain = excluded.tachy_etalonnage_prochain,
  contrat_entretien = excluded.contrat_entretien,
  prestataire_entretien = excluded.prestataire_entretien,
  garage_entretien = excluded.garage_entretien,
  km_actuel = excluded.km_actuel,
  statut = excluded.statut,
  notes = excluded.notes,
  preferences = excluded.preferences;

insert into public.remorques (
  id, immatriculation, type_remorque, marque, charge_utile_kg, longueur_m, numero_carte_grise, vin,
  date_mise_en_circulation, date_achat, cout_achat_ht, type_propriete, garantie_expiration,
  ct_expiration, assurance_expiration, contrat_entretien, prestataire_entretien, garage_entretien,
  statut, notes, preferences
) values
  ('50000000-0000-0000-0000-000000000001', 'RM-301-BB', 'frigo', 'Lamberet', 28000, 13.6, 'CG-RM-001', 'VINRM001', current_date - 1800, current_date - 1700, 42500, 'achat', current_date + 90, current_date + 40, current_date + 120, true, 'Frigo Service', 'Garage Nord Truck', 'disponible', 'Remorque frigo principale', 'Temperature dirigee'),
  ('50000000-0000-0000-0000-000000000002', 'RM-302-BB', 'tautliner', 'Schmitz', 29000, 13.6, 'CG-RM-002', 'VINRM002', current_date - 2100, current_date - 2000, 39800, 'achat', current_date + 30, current_date + 55, current_date + 95, false, null, 'Garage Est Poids Lourds', 'disponible', null, 'Bache'),
  ('50000000-0000-0000-0000-000000000003', 'RM-303-BB', 'plateau', 'Krone', 30500, 13.6, 'CG-RM-003', 'VINRM003', current_date - 2500, current_date - 2450, 36200, 'achat', current_date - 180, current_date + 15, current_date + 45, false, null, 'Garage Route 57', 'en_service', 'Plateau acier', 'Industrie'),
  ('50000000-0000-0000-0000-000000000004', 'RM-304-BB', 'frigo', 'Chereau', 27500, 13.6, 'CG-RM-004', 'VINRM004', current_date - 1200, current_date - 1100, 46800, 'leasing', current_date + 240, current_date + 110, current_date + 150, true, 'Cold Fleet', 'Garage Centre Truck', 'disponible', null, 'Agro'),
  ('50000000-0000-0000-0000-000000000005', 'RM-305-BB', 'fourgon', 'Trouillet', 26000, 13.6, 'CG-RM-005', 'VINRM005', current_date - 1600, current_date - 1550, 33100, 'location', current_date + 60, current_date - 10, current_date + 20, false, 'LocaFleet', 'Garage Ouest PL', 'maintenance', 'Assurance et CT a surveiller', 'Distribution'),
  ('50000000-0000-0000-0000-000000000006', 'RM-306-BB', 'porte_conteneur', 'Schwarzmuller', 30000, 12.5, 'CG-RM-006', 'VINRM006', current_date - 1900, current_date - 1880, 35500, 'achat', current_date + 110, current_date + 85, current_date + 75, false, null, 'Garage Havre Service', 'disponible', 'Port et maritime', 'Conteneur')
on conflict (id) do update set
  immatriculation = excluded.immatriculation,
  type_remorque = excluded.type_remorque,
  marque = excluded.marque,
  charge_utile_kg = excluded.charge_utile_kg,
  longueur_m = excluded.longueur_m,
  numero_carte_grise = excluded.numero_carte_grise,
  vin = excluded.vin,
  date_mise_en_circulation = excluded.date_mise_en_circulation,
  date_achat = excluded.date_achat,
  cout_achat_ht = excluded.cout_achat_ht,
  type_propriete = excluded.type_propriete,
  garantie_expiration = excluded.garantie_expiration,
  ct_expiration = excluded.ct_expiration,
  assurance_expiration = excluded.assurance_expiration,
  contrat_entretien = excluded.contrat_entretien,
  prestataire_entretien = excluded.prestataire_entretien,
  garage_entretien = excluded.garage_entretien,
  statut = excluded.statut,
  notes = excluded.notes,
  preferences = excluded.preferences;

insert into public.affectations (
  id, conducteur_id, vehicule_id, remorque_id, type_affectation, date_debut, date_fin, actif, notes
) values
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'fixe', current_date - 120, null, true, 'Equipe frais nord'),
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'fixe', current_date - 60, null, true, 'Regional Est'),
  ('60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 'fixe', current_date - 210, null, true, 'Acier'),
  ('60000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', 'fixe', current_date - 90, null, true, 'Agro'),
  ('60000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000007', null, 'temporaire', current_date - 8, current_date + 15, true, 'Renfort distribution'),
  ('60000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000006', 'fixe', current_date - 25, null, true, 'Portuaire')
on conflict (id) do update set
  conducteur_id = excluded.conducteur_id,
  vehicule_id = excluded.vehicule_id,
  remorque_id = excluded.remorque_id,
  type_affectation = excluded.type_affectation,
  date_debut = excluded.date_debut,
  date_fin = excluded.date_fin,
  actif = excluded.actif,
  notes = excluded.notes;

insert into public.ordres_transport (
  id, client_id, conducteur_id, vehicule_id, remorque_id, reference, type_transport, statut,
  date_chargement_prevue, date_livraison_prevue, distance_km, nature_marchandise, poids_kg,
  volume_m3, nombre_colis, prix_ht, taux_tva, numero_cmr, numero_bl, instructions, notes_internes
) values
  ('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'OT-260301', 'complet', 'en_cours', current_date - 1, current_date + 1, 540, 'Produits frais', 18600, 82, 24, 1480, 20, 'CMR-301', 'BL-301', 'Maintenir 4C', 'Priorite client'),
  ('70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'OT-260302', 'partiel', 'confirme', current_date + 1, current_date + 2, 280, 'Materiaux BTP', 12100, 54, 18, 920, 20, 'CMR-302', 'BL-302', 'Respect RDV 8h', null),
  ('70000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000006', 'OT-260303', 'express', 'en_cours', current_date, current_date + 1, 710, 'Conteneur export', 21000, 67, 12, 1760, 20, 'CMR-303', 'BL-303', 'Passage port avant 16h', 'Coordination maritime'),
  ('70000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', 'OT-260304', 'complet', 'livre', current_date - 4, current_date - 2, 460, 'Produits laitiers', 19500, 84, 22, 1560, 20, 'CMR-304', 'BL-304', 'Quai froid', null),
  ('70000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000007', null, 'OT-260305', 'express', 'brouillon', current_date + 2, current_date + 2, 120, 'Colis express', 2400, 18, 42, 420, 20, 'CMR-305', 'BL-305', 'Mise a quai rapide', 'A valider'),
  ('70000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 'OT-260306', 'complet', 'facture', current_date - 8, current_date - 6, 690, 'Bobines acier', 22300, 60, 10, 1980, 20, 'CMR-306', 'BL-306', 'Sangles obligatoires', 'Bonne marge'),
  ('70000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'OT-260307', 'groupage', 'confirme', current_date + 3, current_date + 4, 410, 'Produits frais mixtes', 10200, 44, 30, 980, 20, 'CMR-307', 'BL-307', 'Deux points livraison', null),
  ('70000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000005', 'OT-260308', 'partiel', 'en_cours', current_date - 1, current_date + 1, 230, 'Sec agro', 8600, 40, 14, 790, 20, 'CMR-308', 'BL-308', 'Priorite avant 14h', null)
on conflict (id) do update set
  client_id = excluded.client_id,
  conducteur_id = excluded.conducteur_id,
  vehicule_id = excluded.vehicule_id,
  remorque_id = excluded.remorque_id,
  reference = excluded.reference,
  type_transport = excluded.type_transport,
  statut = excluded.statut,
  date_chargement_prevue = excluded.date_chargement_prevue,
  date_livraison_prevue = excluded.date_livraison_prevue,
  distance_km = excluded.distance_km,
  nature_marchandise = excluded.nature_marchandise,
  poids_kg = excluded.poids_kg,
  volume_m3 = excluded.volume_m3,
  nombre_colis = excluded.nombre_colis,
  prix_ht = excluded.prix_ht,
  taux_tva = excluded.taux_tva,
  numero_cmr = excluded.numero_cmr,
  numero_bl = excluded.numero_bl,
  instructions = excluded.instructions,
  notes_internes = excluded.notes_internes;

insert into public.etapes_mission (
  id, ot_id, ordre, type_etape, adresse_id, adresse_libre, ville, code_postal, pays,
  contact_nom, contact_tel, date_prevue, instructions, statut, poids_kg, nombre_colis, notes
) values
  ('74000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 1, 'chargement', '22000000-0000-0000-0000-000000000001', null, 'Lille', '59000', 'France', 'Julie Lambert', '06 11 11 11 11', current_date - 1, 'Mise en temperature avant depart', 'realise', 18600, 24, 'Depart a 05h30'),
  ('74000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 2, 'livraison', '22000000-0000-0000-0000-000000000002', null, 'Rungis', '94150', 'France', 'Equipe reception', '01 45 60 20 20', current_date + 1, 'Priorite quai 2', 'en_cours', 18600, 24, null),
  ('74000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002', 1, 'chargement', '22000000-0000-0000-0000-000000000003', null, 'Nancy', '54000', 'France', 'Marc Petit', '06 22 22 22 22', current_date + 1, 'Chariot embarque present', 'en_attente', 12100, 18, null),
  ('74000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000002', 2, 'livraison', '22000000-0000-0000-0000-000000000004', null, 'Metz', '57070', 'France', 'Chef chantier', '06 22 22 22 29', current_date + 2, 'Appeler 30 min avant', 'en_attente', 12100, 18, null),
  ('74000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000003', 1, 'chargement', '22000000-0000-0000-0000-000000000005', null, 'Le Havre', '76600', 'France', 'Nina Meyer', '06 33 33 33 33', current_date, 'Acces terminal 7', 'realise', 21000, 12, null),
  ('74000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000003', 2, 'livraison', '22000000-0000-0000-0000-000000000006', null, 'Gennevilliers', '92230', 'France', 'Service transit', '06 33 33 33 39', current_date + 1, 'Documents export originaux', 'en_cours', 21000, 12, null),
  ('74000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000004', 1, 'chargement', '22000000-0000-0000-0000-000000000007', null, 'Tours', '37000', 'France', 'Damien Roux', '06 44 44 44 44', current_date - 4, 'Quai froid 2', 'realise', 19500, 22, null),
  ('74000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000004', 2, 'livraison', '22000000-0000-0000-0000-000000000008', null, 'Orleans', '45000', 'France', 'Reception agro', '06 44 44 44 48', current_date - 2, 'Palettes filmees', 'realise', 19500, 22, null),
  ('74000000-0000-0000-0000-000000000009', '70000000-0000-0000-0000-000000000006', 1, 'chargement', '22000000-0000-0000-0000-000000000011', null, 'Rennes', '35000', 'France', 'Loic Garnier', '06 66 66 66 66', current_date - 8, 'Pont roulant requis', 'realise', 22300, 10, null),
  ('74000000-0000-0000-0000-000000000010', '70000000-0000-0000-0000-000000000006', 2, 'livraison', '22000000-0000-0000-0000-000000000012', null, 'Saint-Nazaire', '44600', 'France', 'Controle reception', '06 66 66 66 69', current_date - 6, 'EPI obligatoires', 'realise', 22300, 10, null),
  ('74000000-0000-0000-0000-000000000011', '70000000-0000-0000-0000-000000000007', 1, 'chargement', '22000000-0000-0000-0000-000000000001', null, 'Lille', '59000', 'France', 'Julie Lambert', '06 11 11 11 11', current_date + 3, 'Groupage multi palettes', 'en_attente', 10200, 30, null),
  ('74000000-0000-0000-0000-000000000012', '70000000-0000-0000-0000-000000000008', 1, 'chargement', '22000000-0000-0000-0000-000000000007', null, 'Tours', '37000', 'France', 'Equipe quai', '02 47 55 77 88', current_date - 1, 'Chargement sec agro', 'realise', 8600, 14, null)
on conflict (id) do update set
  ot_id = excluded.ot_id,
  ordre = excluded.ordre,
  type_etape = excluded.type_etape,
  adresse_id = excluded.adresse_id,
  adresse_libre = excluded.adresse_libre,
  ville = excluded.ville,
  code_postal = excluded.code_postal,
  pays = excluded.pays,
  contact_nom = excluded.contact_nom,
  contact_tel = excluded.contact_tel,
  date_prevue = excluded.date_prevue,
  instructions = excluded.instructions,
  statut = excluded.statut,
  poids_kg = excluded.poids_kg,
  nombre_colis = excluded.nombre_colis,
  notes = excluded.notes;

insert into public.factures (
  id, client_id, ot_id, numero, date_emission, date_echeance, date_paiement, mode_paiement,
  montant_ht, montant_tva, montant_ttc, taux_tva, statut, notes
) values
  ('75000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000004', 'FAC-260304', current_date - 1, current_date + 29, null, 'prelevement', 1560, 312, 1872, 20, 'envoyee', 'Facture prestation agro livree.'),
  ('75000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000006', 'FAC-260306', current_date - 4, current_date + 41, null, 'cheque', 1980, 396, 2376, 20, 'envoyee', 'Acier facture apres livraison.'),
  ('75000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'FAC-260301', current_date - 12, current_date - 2, null, 'virement', 1480, 296, 1776, 20, 'en_retard', 'Relance a envoyer.'),
  ('75000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', 'FAC-260303', current_date - 18, current_date - 3, current_date - 1, 'traite', 1760, 352, 2112, 20, 'payee', 'Reglement recu.'),
  ('75000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', null, 'FAC-260250', current_date - 40, current_date - 10, current_date - 5, 'virement', 620, 124, 744, 20, 'payee', 'Ancienne facture express.'),
  ('75000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', null, 'FAC-260255', current_date - 28, current_date + 17, null, 'virement', 890, 178, 1068, 20, 'brouillon', 'A valider par comptabilite.')
on conflict (id) do update set
  client_id = excluded.client_id,
  ot_id = excluded.ot_id,
  numero = excluded.numero,
  date_emission = excluded.date_emission,
  date_echeance = excluded.date_echeance,
  date_paiement = excluded.date_paiement,
  mode_paiement = excluded.mode_paiement,
  montant_ht = excluded.montant_ht,
  montant_tva = excluded.montant_tva,
  montant_ttc = excluded.montant_ttc,
  taux_tva = excluded.taux_tva,
  statut = excluded.statut,
  notes = excluded.notes;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'conducteur_evenements_rh') then
    insert into public.conducteur_evenements_rh (id, conducteur_id, event_type, title, description, severity, start_date, end_date, reminder_at) values
      ('71000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'visite_medicale', 'Visite medicale a renouveler', 'Echeance proche pour suivi RH.', 'warning', current_date - 30, null, current_date + 10),
      ('71000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000008', 'arret_maladie', 'Arret maladie en cours', 'Retour estime en fin de semaine prochaine.', 'warning', current_date - 8, current_date + 7, current_date + 5),
      ('71000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000005', 'entretien', 'Point integration fin de periode', 'Prevoir entretien RH avec exploitation.', 'info', current_date + 12, null, current_date + 10)
    on conflict (id) do update set
      conducteur_id = excluded.conducteur_id,
      event_type = excluded.event_type,
      title = excluded.title,
      description = excluded.description,
      severity = excluded.severity,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      reminder_at = excluded.reminder_at;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'vehicule_releves_km') then
    insert into public.vehicule_releves_km (id, vehicule_id, reading_date, km_compteur, source, notes) values
      ('72000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', date_trunc('month', current_date)::date - 60, 399800, 'atelier', 'Point depart historique'),
      ('72000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', date_trunc('month', current_date)::date - 30, 406200, 'atelier', null),
      ('72000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', current_date - 1, 412350, 'atelier', null),
      ('72000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', date_trunc('month', current_date)::date - 60, 492000, 'atelier', null),
      ('72000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002', date_trunc('month', current_date)::date - 30, 498500, 'atelier', null),
      ('72000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000002', current_date - 1, 505120, 'atelier', null),
      ('72000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000004', date_trunc('month', current_date)::date - 60, 269400, 'atelier', null),
      ('72000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000004', date_trunc('month', current_date)::date - 30, 275200, 'atelier', null),
      ('72000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000004', current_date - 1, 280450, 'atelier', null)
    on conflict (id) do update set
      vehicule_id = excluded.vehicule_id,
      reading_date = excluded.reading_date,
      km_compteur = excluded.km_compteur,
      source = excluded.source,
      notes = excluded.notes;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'flotte_entretiens') then
    insert into public.flotte_entretiens (
      id, vehicule_id, remorque_id, maintenance_type, service_date, km_compteur, cout_ht, cout_ttc,
      covered_by_contract, prestataire, garage, next_due_date, next_due_km, notes
    ) values
      ('73000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', null, 'revision', current_date - 55, 400500, 980, 1176, true, 'Volvo Services', 'Garage Nord Truck', current_date + 35, 420000, 'Revision complete'),
      ('73000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', null, 'pneus', current_date - 18, 409200, 1240, 1488, false, 'Euromaster', 'Garage Nord Truck', current_date + 180, null, 'Train avant'),
      ('73000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', null, 'reparation', current_date - 40, 496800, 760, 912, false, 'DAF Atelier', 'Garage Est Poids Lourds', current_date + 60, null, 'Capteur ABS'),
      ('73000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', null, 'controle_technique', current_date - 5, 504900, 210, 252, false, 'Autovision PL', 'Garage Est Poids Lourds', current_date + 360, null, 'Controle valide'),
      ('73000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000004', null, 'vidange', current_date - 22, 278200, 540, 648, true, 'Renault Trucks Care', 'Garage Centre Truck', current_date + 75, 295000, 'Entretien courant'),
      ('73000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000005', null, 'controle_technique', current_date - 12, 365200, 240, 288, false, 'Autovision PL', 'Garage Grand Ouest', current_date + 365, null, 'CT non repasse a temps'),
      ('73000000-0000-0000-0000-000000000007', null, '50000000-0000-0000-0000-000000000001', 'groupe_froid', current_date - 26, null, 690, 828, true, 'Frigo Service', 'Garage Nord Truck', current_date + 120, null, 'Controle froid'),
      ('73000000-0000-0000-0000-000000000008', null, '50000000-0000-0000-0000-000000000002', 'pneus', current_date - 70, null, 840, 1008, false, 'Euromaster', 'Garage Est Poids Lourds', current_date + 210, null, 'Train remorque'),
      ('73000000-0000-0000-0000-000000000009', null, '50000000-0000-0000-0000-000000000005', 'controle_technique', current_date - 20, null, 230, 276, false, 'Autovision PL', 'Garage Ouest PL', current_date + 340, null, 'Remorque a surveiller')
    on conflict (id) do update set
      vehicule_id = excluded.vehicule_id,
      remorque_id = excluded.remorque_id,
      maintenance_type = excluded.maintenance_type,
      service_date = excluded.service_date,
      km_compteur = excluded.km_compteur,
      cout_ht = excluded.cout_ht,
      cout_ttc = excluded.cout_ttc,
      covered_by_contract = excluded.covered_by_contract,
      prestataire = excluded.prestataire,
      garage = excluded.garage,
      next_due_date = excluded.next_due_date,
      next_due_km = excluded.next_due_km,
      notes = excluded.notes;
  end if;
end $$;
