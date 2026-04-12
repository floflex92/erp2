# Cockpit KPI transport par role - diagnostic et cible

Date: 2026-04-12

## 1. Diagnostic de l existant

### Ecrans et briques deja presentes

- Dashboard principal avec widgets filtrables par role.
- Ops Center / War Room pour les impr evus, retards et OT non affectees.
- Dashboard conducteur centre sur missions, documents et suivi individuel.
- Sources metier utiles deja branchees:
  - vue_marge_ot
  - vue_conducteur_alertes
  - vue_alertes_flotte
  - v_war_room_ot_retard
  - v_war_room_ot_non_affectes
  - imprevu_exploitation

### Defauts UX/UI constates

- Le dashboard historique etait une juxtaposition de widgets, pas un cockpit.
- Les priorites n etaient pas visibles avant l analyse detaillee.
- La lecture critique, vigilance, action et analyse n etait pas separee.
- Les roles utilisaient surtout une variation de widgets, pas une logique d ecran adaptee a leurs vraies responsabilites.
- Les alertes existaient mais sans orchestration transverse ni notion claire d impact.
- Le haut de page ne guidait pas suffisamment la decision immediate.

### Defauts metier constates

- Exploitation: la war room etait riche mais deconnectee du dashboard quotidien.
- Direction: vision marge / derive / ponctualite trop plate et trop courte.
- Flotte: alertes disponibles mais peu integrees dans la lecture de capacite immediate.
- Facturation / administratif: le backlog de dossiers terminables et les blocages documentaires n etaient pas mis en scene comme des priorites cash.
- Commercial: manque de lecture directe portefeuille rentable vs portefeuille a risque.

### KPI manquants ou mal exposes

- Taux d affretement remis dans une lecture decisionnelle.
- OT non affectees hors delai de traitement.
- Dossiers a marge fragile ou negative avant arbitrage.
- Retard de facturation sur dossiers termines.
- Disponibilite flotte vs charge execution.
- Concentration de CA sur un top client.
- Objectifs par role, optionnels et motivants.

### Alertes manquantes ou mal structurees

- Absence de regroupement anti-spam par famille de risque.
- Peu de distinction nette entre critique, action urgente, alerte, recommandation et info.
- Peu d action recommandee explicite dans le dashboard.
- Peu de lien direct entre alerte et ecran de resolution.

### Cockpits manquants

- Cockpit direction complet.
- Cockpit exploitation priorise.
- Cockpit flotte / maintenance avec lecture capacitaire.
- Cockpit finance / facturation avec logique cash.
- Cockpit commercial relie a la rentabilite reelle.

## 2. Ce qu il faut conserver, ameliorer, supprimer, creer

### Conserver

- Widgets existants et leur personnalisation par role.
- Ops Center / War Room comme outil de traitement detaille.
- Dashboard conducteur deja tres oriente usage terrain.
- Les vues SQL metier deja presentes et exploitables.

### Ameliorer

- Le dashboard principal doit devenir un cockpit de lecture priorisee.
- Les roles doivent avoir une logique de pilotage differente, pas seulement des widgets differents.
- Les alertes doivent etre contextualisees, groupees et actionnables.
- Les KPI doivent repondre a une question de decision reelle.

### Supprimer

- La logique de mur d indicateurs sans hierarchie.
- Les signaux faibles melanges aux urgences.
- Les cartes purement decoratives sans impact metier clair.

### Creer

- Un panneau cockpit metier place au-dessus des widgets historiques.
- Des graphiques visuels couleur par role.
- Un suivi d objectifs optionnel, parametrable et motive pour les equipes qui le souhaitent.
- Une structure stable de garde-fous UX pour les prochaines evolutions.

## 3. Structure cible recommandee

### Niveau 1 - Maintenant

- 4 cartes de synthese maximum.
- 5 notifications intelligentes maximum.
- Une lecture immediate de ce qui bloque, derive ou demande arbitrage.

### Niveau 2 - Sous surveillance

- KPI secondaires a surveiller sans surcharger.
- Graphiques de repartition, saturation, portefeuille ou conformite.
- Jauges rapides sur ponctualite, charge, marge, transformation facture.

### Niveau 3 - Analyse et pilotage

- Focus top client / flop client.
- Capacite restante.
- Tension portefeuille.
- Arbitrages a mener aujourd hui.

### Niveau 4 - Detail operable

- Liens directs vers Ops Center, Planning, Facturation, Vehicules, Analytique, Prospection.
- Widgets historiques conserves comme profondeur d analyse.

## 4. Cockpit ideal par role

### Direction

- CA du mois
- marge reelle
- ponctualite
- alertes critiques consolidees
- top clients marge
- clients sous tension
- taux d affretement
- capacite flotte propre restante

### Responsable exploitation / exploitant

- flux actif
- a traiter maintenant
- missions du jour
- charge flotte
- retards majeurs
- OT non affectees hors delai
- incidents ouverts
- conducteurs a risque

### Flotte / maintenance

- vehicules disponibles
- immobilises
- echeances flotte < 7j
- documents conducteurs critiques
- buffer capacitaire
- actifs les plus exposes

### Administratif / facturation

- a facturer
- dossiers bloques documents
- dossiers hors delai de facturation
- prix manquants
- dossiers marge negative
- potentiel cash en attente

### Commercial

- CA portefeuille
- marge moyenne
- clients a defendre
- concentration du CA
- retard visible cote client
- portefeuille rentable vs a redresser

## 5. Notifications intelligentes - logique cible

### Types

- info
- recommandation
- alerte
- action urgente
- critique

### Regles de declenchement

- critique: rupture d execution, retard majeur, impr evu critique, risque de sortie de parc.
- action urgente: OT non affectee hors delai, dossier facture bloque sur preuve, charge immediate a traiter.
- alerte: marge fragile, conformite proche echeance, derive portefeuille.
- recommandation: taux d affretement trop haut, portefeuille trop concentre, tension capacitaire a anticiper.
- info: signaux utiles sans urgence immediate.

### Anti-spam

- groupement par famille de risque
- plafond visuel a 5 priorites simultanees dans le cockpit
- pas de duplication multi-widget / multi-page
- chaque notification doit avoir un impact et une action

### Affichage

- niveau visible par code couleur
- motif clair
- impact estime
- action recommandee
- lien direct vers l ecran utile

## 6. Recommandations UI/UX precises

- Toujours separer Maintenant, Sous surveillance, Analyse, Detail.
- Limiter le haut de page a 4 cartes de synthese.
- Utiliser la couleur pour la priorite, pas pour decorer.
- Conserver des surfaces larges, peu de bruit, beaucoup de respiration.
- Preferer des graphiques simples lisibles en 2 secondes: barres, repartitions, jauges.
- Ne jamais afficher un graphique sans libelle, valeur et interpretation.
- Les objectifs doivent etre optionnels et parametrables localement tant qu il n existe pas encore de modele RH/KPI central.

## 7. Ameliorations concretes implementees dans cette iteration

- Nouveau cockpit priorise par role en tete du dashboard.
- Notifications intelligentes consolidees avec impact et action.
- Blocs Sous surveillance et Actions rapides.
- Bloc Analyse et pilotage oriente decision.
- Graphiques visuels natifs:
  - repartition coloree
  - classements en barres
  - jauges circulaires
- Suivi d objectifs optionnel:
  - activable a la demande
  - parametrable par role
  - persistant localement
- Widgets historiques conserves sous le cockpit pour la profondeur d analyse.

## 8. Plan d implementation recommande pour la suite

### Phase 1 - fait

- Cockpit priorise par role
- notifications intelligentes consolidees
- graphiques visuels natifs
- objectifs optionnels locaux

### Phase 2

- Rattacher les objectifs a des referentiels equipes / utilisateurs / services.
- Ajouter des objectifs individuels et primes estimees quand le cadre RH est valide.
- Brancher l historisation des notifications lues / ignorees / traitees.

### Phase 3

- Ajouter des filtres de perimetre: service, exploitant, client, ressource, priorite.
- Ajouter une memoire de personnalisation plus fine par utilisateur.
- Ajouter des vues comparatives semaine / mois / N-1.

## 9. Garde-fous pour garder une bonne lisibilite

- Un nouvel indicateur doit repondre a une decision concrete.
- Une nouvelle alerte doit avoir un impact, une action, un proprietaire.
- Pas plus de 4 cartes en haut du cockpit.
- Pas plus de 5 notifications prioritaires visibles sans interaction.
- Pas de graphique si la meme information peut se lire plus vite en texte simple.
- Tout objectif doit etre desactivable et contextualise par role.
- Les widgets detail ne doivent jamais concurrencer le cockpit prioritaire.
