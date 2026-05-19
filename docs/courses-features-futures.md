# Features futures / Roadmap - Module Courses

Ce document prepare les evolutions avancees sans les implementer maintenant.
Priorite actuelle maintenue: stabilite immediate sur le terrain.

## 1) Detection automatique des demandes transport dans les emails
- But: identifier les emails contenant une intention de demande de transport.
- Preparation technique:
  - Table tampon `inbox_transport_candidates` (email_id, score, extrait, statut_validation).
  - Pipeline asynchrone Netlify Function non bloquant (batch).
  - Journal d audit pour chaque decision automate.
- Non implemente a ce stade.

## 2) Parsing intelligent des emails
- But: extraire donneur d ordre, adresse chargement/livraison, dates, references.
- Preparation technique:
  - Definition d un schema de sortie strict JSON.
  - Gestion d ambiguite (champs incomplets ou contradictoires).
  - Score de confiance par champ.
- Non implemente a ce stade.

## 3) Creation de course depuis email avec popup de validation
- But: proposer une pre-creation de course a valider par exploitation.
- Preparation technique:
  - Ecran de revue avec diff avant/apres.
  - Brouillon en statut `en_attente_validation`.
  - Validation obligatoire humaine avant insertion finale.
- Non implemente a ce stade.

## 4) Integration API bourse de fret
- But: synchroniser opportunites de fret externes.
- Preparation technique:
  - Connecteurs provider via `erp_v11_providers`.
  - Mapping unifie vers `ordres_transport` + `source_course = bourse_fret`.
  - Quotas, retries, logs API et mode degrade.
- Non implemente a ce stade.

## 5) Multi-ERP communication via reference transport
- But: partager la reference transport inter-systemes.
- Preparation technique:
  - Contrat d echange autour de `reference_transport` (idempotence).
  - Webhook sortant avec signature HMAC.
  - Table de correlation externe (`reference_transport`, `systeme_cible`, `id_externe`).
- Non implemente a ce stade.

## 6) Tracking temps reel via API externes
- But: enrichir les statuts transport avec positions et ETA externes.
- Preparation technique:
  - Ingestion evenementielle dans `erp_v11_vehicle_positions` et `erp_v11_eta_predictions`.
  - Regles anti-surcharge (cache + fenetre temporelle).
  - Reconciliation avec statut transport interne prioritaire.
- Non implemente a ce stade.

## 7) Bibliotheque de connecteurs ERP/WMS/EDI prets a l'emploi
- But: reduire fortement le temps d'integration client.
- Preparation technique:
  - Catalogue de connecteurs standards (ERP, WMS, EDI) versionnes.
  - Mapping canonique interne + transformateurs d'entree/sortie.
  - Outil d'activation par tenant avec tests de connectivite.
- Non implemente a ce stade.

## 8) Bibliotheque connecteurs telematique multi-fournisseurs
- But: brancher rapidement boitiers, OEM et applications conducteur.
- Preparation technique:
  - Normalisation vers objets internes `VehiclePosition`, `DriverStatus`, `DrivingTimeStatus`.
  - Connecteurs plugin-based (auth, polling/webhook, mapping, retry).
  - Console de supervision qualite flux par fournisseur.
- Non implemente a ce stade.

## 9) eCMR / POD complet
- But: disposer d'une preuve de livraison terrain complete et exploitable.
- Preparation technique:
  - Capture signature, photos, scans et horodatage geolocalise.
  - Coffre documentaire par mission avec retention et traçabilite.
  - Statuts POD normalises et exportables vers client/facturation.
- Non implemente a ce stade.

## 10) Gestion litiges et ecarts de livraison
- But: traiter les anomalies de livraison dans un workflow clair.
- Preparation technique:
  - Creation ticket litige depuis POD, transport ou message client.
  - Workflow d'instruction (ouvert, analyse, action, resolu, cloture).
  - Pieces jointes, responsabilite, impact financier et SLA de traitement.
- Non implemente a ce stade.

## 11) Tendering, contrats et grilles tarifaires
- But: industrialiser l'achat transport et la selection transporteur.
- Preparation technique:
  - Module appels d'offres (lots, transporteurs invites, comparatif offres).
  - Gestion contrats et annexes avec periodes de validite.
  - Grilles tarifaires multi-criteres (zone, poids, km, surcharge, carburant).
- Non implemente a ce stade.

## 12) Cotation automatique avancee
- But: calculer rapidement un prix fiable et une marge cible.
- Preparation technique:
  - Moteur de pricing configurable (regles, priorites, exceptions).
  - Simulation cout previsionnel: peages, carburant, temps conducteur, risques.
  - Comparaison marge theorique vs marge realisee apres execution.
- Non implemente a ce stade.

## 13) Control tower et gestion des exceptions
- But: piloter les incidents en temps reel avec procedures standardisees.
- Preparation technique:
  - Detection automatique d'evenements critiques (retard, rupture, deviation).
  - Playbooks d'actions avec escalades par severite.
  - Journal des decisions et timeline incident unifiee.
- Non implemente a ce stade.

## 14) Alerting predictif ETA et risque de service
- But: prevenir les risques avant impact client.
- Preparation technique:
  - Score de confiance ETA et prediction de retard multi-facteurs.
  - Alertes proactives exploitant/client avec proposition d'action.
  - Boucle d'apprentissage sur historique prediction vs reel.
- Non implemente a ce stade.

## 15) BI transport avancee et pilotage marge
- But: fournir une vision decisionnelle exploitable en quelques secondes.
- Preparation technique:
  - P&L par trajet, client, axe, conducteur et periode.
  - Vues ecart prevu/reel, rentabilite, taux de service, retard structurel.
  - Exports et tableaux de bord direction avec filtres multi-entites.
- Non implemente a ce stade.

## 16) Reseau transporteurs partenaire (effet reseau)
- But: accelerer la capacite de placement des missions.
- Preparation technique:
  - Annuaire transporteurs qualifies avec capacites et zones.
  - Matching semi-automatique mission <-> transporteur.
  - Scoring partenaire (fiabilite, cout, qualite de service).
- Non implemente a ce stade.
