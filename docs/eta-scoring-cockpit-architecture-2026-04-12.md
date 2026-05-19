# Module ETA Predictif + Scoring Demandes + Cockpit Decisionnel

## 1. Architecture ETA

Le moteur ETA est centralise dans [src/lib/transportDecisionEngine.ts](src/lib/transportDecisionEngine.ts). Il produit un ETA explique et non opaque, compose de cinq couches:

1. Temps de base: distance reelle / vitesse estimee selon mix autoroute, secondaire, urbain et densite.
2. Perturbations temps reel: trafic, meteo, incidents, travaux, avec fallback heuristique si aucune API n est branchee.
3. Contraintes operationnelles: chargement, dechargement, fenetres clients, multi-stop, fiabilite des rendez-vous.
4. Contraintes reglementaires et ressources: risque CE 561, pauses, repos, disponibilite vehicule, experience conducteur.
5. Buffer intelligent: marge adaptative selon incertitude et donnees manquantes.

Sorties:

- ETA estime
- ETA optimiste
- ETA pessimiste
- duree predite
- confiance en pourcentage
- traces de calcul par contrainte
- raisons explicites et fallback utilises

## 2. Architecture scoring

Le scoring de demande calcule un score global sur 100 via cinq axes ponderes:

- Rentabilite
- Faisabilite
- Impact operationnel
- Qualite client
- Complexite

Chaque axe retourne:

- score
- poids applique
- detail explicatif

Le score global retourne en plus:

- recommandation: accepter, a optimiser, risque, a refuser
- couleur de lecture cockpit
- marge estimee, cout estime, revenu estime
- niveau de difficulte et d impact

## 3. Modeles DB

Migration ajoutee: [supabase/migrations/20260413100000_eta_scoring_decision_cockpit.sql](supabase/migrations/20260413100000_eta_scoring_decision_cockpit.sql)

Tables:

- eta_predictions: prediction courante par course, etape ou demande
- eta_history: historique des derives ETA et snapshots
- job_scores: score global de la demande / mission
- scoring_details: detail des sous-scores par axe
- constraint_logs: journal explicable des contraintes appliquees

Vues:

- vue_latest_eta_predictions
- vue_latest_job_scores

Principes schema:

- multi-tenant par company_id
- RLS pour lecture cockpit et ecriture exploitation/admin
- jsonb pour traces explicables et evolution future sans casser le schema

## 4. Pseudo-code ETA

```text
input mission
  recuperer distance, vitesse vehicule, route profile
  base_time = distance / vitesse_estimee

  traffic_adj = base_time * coeff_trafic
  weather_adj = base_time * coeff_meteo
  incident_adj = base_time * coeff_incident

  ops_adj = temps_chargement + temps_dechargement + multi_stop + time_window
  legal_adj = pauses_obligatoires + repos + risque_chrono
  resource_adj = indisponibilite + manque_experience
  history_adj = retard_moyen + temps_site_client + tendance couloir

  uncertainty_buffer = fonction(data_completeness, variabilite, fallback_count)

  predicted_duration = base_time + traffic_adj + weather_adj + incident_adj
                     + ops_adj + legal_adj + resource_adj + history_adj
                     + uncertainty_buffer

  confidence = fonction(completude, couverture temps reel, profondeur historique, perturbations)

  optimistic_eta = depart + predicted_duration - buffer_reduit
  predicted_eta = depart + predicted_duration
  pessimistic_eta = depart + predicted_duration + buffer_majore

  retourner prediction + traces + explications
```

## 5. Pseudo-code scoring

```text
input demande
  rentabilite = f(marge estimee, revenu/km, prix/coût)
  faisabilite = f(vehicules compatibles, conducteurs, conflits planning, risque legal)
  impact_operationnel = f(charge exploitant, charge service, collisions planning)
  qualite_client = f(importance client, score paiement, SLA, penalites)
  complexite = 100 - f(multi-stop, zones difficiles, creneaux serres)

  score_global = somme(score_axe * poids_axe)

  si score_global >= 76 et faisabilite >= 58 => accepter
  sinon si score_global >= 58 => a optimiser
  sinon si score_global >= 42 => risque
  sinon => a refuser

  retourner score_global + sous-scores + recommendation + explication
```

## 6. Regles metier detaillees

- Ne jamais afficher un ETA sans niveau de confiance.
- Toute prediction doit inclure au moins une trace explicable par contrainte.
- Un fallback doit etre visible dans missing_data et dans la trace associee.
- Une demande rentable mais infaisable ne doit jamais etre recommandee en accepter.
- Une surcharge exploitation > 88% cree une alerte cockpit immediate.
- Une demande en etude avec recommandation risque ou a refuser cree une alerte validation risquee.
- Les fenetres serrees degradent simultanement ETA, faisabilite et risque penalite.
- Les derive ETA critiques passent prioritairement devant les simples KPI de volume.

## 7. Design widget cockpit

Implementation UI:

- [src/components/dashboard/WidgetEtaDecisionCockpit.tsx](src/components/dashboard/WidgetEtaDecisionCockpit.tsx)
- [src/pages/DemandesClients.tsx](src/pages/DemandesClients.tsx)

Composition du widget:

- Bloc ETA missions actives: barre de progression, ecart, confiance, ETA optimiste/pessimiste, statut couleur.
- Bloc demandes priorisees: badge score, recommandation, marge estimee, distance, faisabilite, difficulte.
- Bloc alertes intelligentes: derive ETA, surcharge exploitation, opportunite rentable, validation risquee.

Principe UX:

- lecture en moins de 3 secondes
- priorite visuelle par couleur et densite d information
- une decision possible depuis chaque bloc

## 8. Plan d implementation

1. Stabiliser le moteur pur et ses contrats d entree/sortie.
2. Brancher le scoring dans les demandes client avant validation exploitation.
3. Brancher le widget cockpit sur OT actifs + demandes ouvertes.
4. Persister les snapshots ETA / score / contraintes via les nouvelles tables.
5. Connecter des sources externes reelles trafic/meteo/incidents.
6. Ajouter un recalcul automatique a chaque affectation et derive terrain.
7. Exposer les derive ETA dans les notifications et l Ops center.
8. Ajouter des tests metier sur les cas critiques et les fallbacks.

## 9. Points de vigilance

- Le repo ne dispose pas encore d un backend dedie pour calculs server-side; la logique est centralisee hors composants, mais devra idealement migrer vers Edge Functions / worker pour isolation totale.
- Les demandes client sont aujourd hui locales; pour une persistance complete du scoring il faudra stocker les demandes en base ou enregistrer leur request_payload dans job_scores.
- Les ETA actuels restent heuristiques tant que les APIs trafic/meteo/incidents ne sont pas branchees.
- Les types Supabase generes n ont pas ete regeneres automatiquement dans ce cycle.
- Les calculs doivent etre observes en production avant tout usage contractuel client.

## 10. Evolutions futures

- apprentissage supervise par couloir, client, conducteur, vehicule, horaire et meteo
- calibration automatique des buffers par segment de mission
- scoring dynamique d arbitrage multi-demandes sur une meme fenetre capacitaire
- recommandation d affectation optimale par exploitant/service
- prediction de derive avant qu elle n apparaisse dans le statut operationnel
- jumeau numerique de planning avec simulation what-if multi-contraintes