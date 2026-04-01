-- Synchronisation de visibilite: core -> public
-- Objectif: alimenter les tables legacy du front avec les donnees deja injectees dans core

-- 1) Clients
insert into public.clients (
  id,
  nom,
  siret,
  email,
  telephone,
  type_client,
  actif,
  created_at,
  updated_at
)
select
  p.id,
  p.nom,
  p.siret,
  p.email,
  p.telephone,
  'chargeur',
  true,
  p.created_at,
  p.updated_at
from core.partenaires p
on conflict (id) do update
set
  nom = excluded.nom,
  siret = excluded.siret,
  email = excluded.email,
  telephone = excluded.telephone,
  type_client = excluded.type_client,
  actif = excluded.actif,
  updated_at = now();

-- 2) Adresses
insert into public.adresses (
  id,
  client_id,
  nom_lieu,
  type_lieu,
  adresse,
  code_postal,
  ville,
  pays,
  contact_nom,
  contact_tel,
  horaires,
  instructions,
  latitude,
  longitude,
  actif,
  created_at,
  updated_at
)
select
  a.id,
  a.partenaire_id,
  a.nom_entreprise,
  'livraison',
  concat_ws(', ', a.adresse_ligne1, a.adresse_ligne2),
  a.code_postal,
  a.ville,
  coalesce(a.pays, 'France'),
  null,
  a.telephone,
  coalesce(to_char(a.horaire_ouverture, 'HH24:MI'), '08:00') || '-' || coalesce(to_char(a.horaire_fermeture, 'HH24:MI'), '18:00') || ' (' || coalesce(a.jours_ouverture, 'lun,mar,mer,jeu,ven') || ')',
  a.notes,
  null,
  null,
  true,
  a.created_at,
  a.updated_at
from core.adresses a
on conflict (id) do update
set
  client_id = excluded.client_id,
  nom_lieu = excluded.nom_lieu,
  type_lieu = excluded.type_lieu,
  adresse = excluded.adresse,
  code_postal = excluded.code_postal,
  ville = excluded.ville,
  pays = excluded.pays,
  contact_tel = excluded.contact_tel,
  horaires = excluded.horaires,
  instructions = excluded.instructions,
  actif = excluded.actif,
  updated_at = now();

-- 3) Conducteurs
insert into public.conducteurs (
  id,
  nom,
  prenom,
  telephone,
  statut,
  notes,
  created_at,
  updated_at
)
select
  c.id,
  coalesce(c.nom, 'Conducteur'),
  coalesce(c.prenom, 'Sans prenom'),
  c.telephone,
  'actif',
  'Synchronise depuis core.conducteurs',
  c.created_at,
  c.updated_at
from core.conducteurs c
on conflict (id) do update
set
  nom = excluded.nom,
  prenom = excluded.prenom,
  telephone = excluded.telephone,
  statut = excluded.statut,
  notes = excluded.notes,
  updated_at = now();

-- 4) Vehicules
insert into public.vehicules (
  id,
  immatriculation,
  marque,
  modele,
  km_actuel,
  notes,
  created_at,
  updated_at
)
select
  v.id,
  v.immatriculation,
  split_part(coalesce(v.libelle, ''), ' ', 1),
  nullif(trim(replace(coalesce(v.libelle, ''), split_part(coalesce(v.libelle, ''), ' ', 1), '')), ''),
  null,
  'Synchronise depuis core.vehicules',
  v.created_at,
  v.updated_at
from core.vehicules v
on conflict (id) do update
set
  immatriculation = excluded.immatriculation,
  marque = excluded.marque,
  modele = excluded.modele,
  notes = excluded.notes,
  updated_at = now();

-- 5) Remorques
insert into public.remorques (
  id,
  immatriculation,
  marque,
  charge_utile_kg,
  notes,
  created_at,
  updated_at
)
select
  r.id,
  r.immatriculation,
  r.marque,
  r.charge_utile_kg,
  'Synchronise depuis core.remorques',
  r.created_at,
  r.updated_at
from core.remorques r
on conflict (id) do update
set
  immatriculation = excluded.immatriculation,
  marque = excluded.marque,
  charge_utile_kg = excluded.charge_utile_kg,
  notes = excluded.notes,
  updated_at = now();

-- 6) Ordres de transport
insert into public.ordres_transport (
  id,
  reference,
  client_id,
  conducteur_id,
  vehicule_id,
  remorque_id,
  type_transport,
  statut,
  statut_transport,
  date_chargement_prevue,
  date_livraison_prevue,
  distance_km,
  notes_internes,
  source_course,
  est_affretee,
  created_at,
  updated_at
)
select
  ot.id,
  ot.reference,
  ot.partenaire_id,
  p.conducteur_id,
  p.vehicule_id,
  p.remorque_id,
  'complet',
  case
    when ot.statut_transport in ('termine', 'livre') then 'livre'
    when ot.statut_transport in ('en_livraison', 'en_transit', 'en_cours') then 'en_cours'
    when ot.statut_transport = 'annule' then 'annule'
    else 'confirme'
  end,
  ot.statut_transport,
  ot.date_chargement_prevue,
  ot.date_livraison_prevue,
  p."km_planifiés",
  'Synchronise depuis core.ordres_transport',
  'manuel',
  false,
  ot.created_at,
  ot.updated_at
from core.ordres_transport ot
left join core.planning_ot p on p.ordre_transport_id = ot.id
on conflict (id) do update
set
  reference = excluded.reference,
  client_id = excluded.client_id,
  conducteur_id = excluded.conducteur_id,
  vehicule_id = excluded.vehicule_id,
  remorque_id = excluded.remorque_id,
  type_transport = excluded.type_transport,
  statut = excluded.statut,
  statut_transport = excluded.statut_transport,
  date_chargement_prevue = excluded.date_chargement_prevue,
  date_livraison_prevue = excluded.date_livraison_prevue,
  distance_km = excluded.distance_km,
  notes_internes = excluded.notes_internes,
  updated_at = now();

-- 7) Tachygraphe (core -> public)
insert into public.tachygraphe_entrees (
  conducteur_id,
  vehicule_id,
  ot_id,
  type_activite,
  date_debut,
  date_fin,
  notes,
  created_at
)
select
  t.conducteur_id,
  t.vehicule_id,
  t.ordre_transport_id,
  'conduite',
  (t.date_entree::text || ' ' || t.heure_debut::text)::timestamptz,
  (t.date_entree::text || ' ' || t.heure_fin::text)::timestamptz,
  coalesce(t.notes, 'Synchronise depuis core.tachygraphe_entries'),
  t.created_at
from core.tachygraphe_entries t
where not exists (
  select 1
  from public.tachygraphe_entrees te
  where te.conducteur_id = t.conducteur_id
    and te.date_debut = (t.date_entree::text || ' ' || t.heure_debut::text)::timestamptz
);
