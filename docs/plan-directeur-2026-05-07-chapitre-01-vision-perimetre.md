# Chapitre 1 - Vision produit et perimetre

Date: 2026-05-07
Statut: Pret a execution
Owner propose: Product + Tech Lead + Design Lead
Reference index: erp2/docs/plan-directeur-2026-05-07-index-13-chapitres.md

## 1) Finalite du chapitre
Aligner toute l'equipe sur la cible des 90 prochains jours avant de lancer l'execution technique.

Resultat attendu a la fin de ce chapitre:
- Une vision produit unique et comprise par tous.
- Un perimetre inclus/exclu explicite pour eviter la dispersion.
- Des principes d'arbitrage utilises dans chaque decision sprint.
- Une validation formelle des parties prenantes (go/no-go chapitre 2).

---

## 2) Vision cible a 90 jours
NEXORA Truck doit offrir un parcours clair, rapide et orienté action:

- Cote marketing: comprendre la promesse en moins de 10 secondes et atteindre l'action principale sans hesitation.
- Cote login: acces fluide et rassurant, sans friction inutile.
- Cote ERP: chaque role atteint ses 3 actions critiques en un minimum de clics et de charge mentale.
- Cote execution: qualite stable, sans regression majeure a chaque release.

### Definition de succes (niveau business)
- Le produit convertit mieux (plus de prises de contact/de demandes de demo qualifiees).
- Le produit est percu comme plus rapide des le premier ecran.
- Les equipes metier vont plus vite dans les operations quotidiennes.

---

## 3) Perimetre du programme (90 jours)

### 3.1 Inclus
1. Site marketing public:
   - Hero, CTA principaux, ordre des sections, preuves produit.
   - Parcours demonstration et contact.
2. Ecrans d'entree:
   - Home, home+login, login.
3. Shell ERP:
   - Navigation, quick actions, recherche globale, priorisation par role.
4. Cohesion UI:
   - Harmonisation des tokens et de la hierarchie visuelle.
5. Qualite operationnelle:
   - Budgets perf, controles de non-regression, checks de release.

### 3.2 Exclus
1. Nouvelles fonctionnalites metier lourdes hors parcours critiques.
2. Refonte profonde du modele de donnees non necessaire aux objectifs du trimestre.
3. Chantiers non relies a la performance, conversion ou productivite role.

### 3.3 Regle de scope
- Toute demande non alignee avec les KPI du programme est placee en file P2/backlog hors sprint en cours.

---

## 4) Principes directeurs (regles d'arbitrage)

1. Rapidite percue avant complexite visuelle.
2. Conversion mesurable avant discours long.
3. Productivite par role avant exhaustivite de navigation.
4. Cohesion cross-pages avant optimisation locale isolee.
5. Evidence (mesure) avant opinion (ressenti).
6. Zero regression critique en prod.

Usage attendu:
- Chaque ticket important mentionne le principe qu'il sert.
- Chaque arbitrage de sprint cite le KPI impacte.

---

## 5) Personas prioritaires du chapitre 1

1. Prospect operationnel transport:
   - Objectif: comprendre vite la valeur, demander une demo.
2. Exploitant transport (utilisateur ERP prioritaire):
   - Objectif: agir immediatement sur planning/missions/alertes.
3. Dirigeant:
   - Objectif: lire la situation et decider sans friction.

Remarque: la priorite d'optimisation initiale est donnee au prospect operationnel + exploitant.

---

## 6) Hypotheses de travail (a valider en chapitre 2)

1. Le principal frein actuel est le temps d'affichage initial (LCP/FCP trop eleves).
2. Le principal frein conversion est la densite du message avant action.
3. Le principal frein ERP est la charge cognitive de navigation multi-role.

Decision attendue:
- Confirmer/infirmer chaque hypothese avec mesures et funnels en chapitre 2.

---

## 7) Livrables obligatoires de fin de chapitre

1. Vision 1 page signee (ce document + section 2 verifiee).
2. Perimetre inclus/exclu valide (section 3 figee).
3. Principes d'arbitrage valides (section 4 adoptee).
4. Compte-rendu de validation (go/no-go vers chapitre 2).

---

## 8) Checklist de validation (gate Chapitre 1 -> Chapitre 2)

Cocher uniquement si valide en revue:

- [ ] La vision 90 jours est comprise par Product, Tech, Design.
- [ ] Le perimetre inclus/exclu est accepte sans ambiguite.
- [ ] Les principes directeurs sont adoptes comme regles d'arbitrage.
- [ ] Les personas prioritaires sont confirmes.
- [ ] Les hypotheses de travail sont listees et tracees.
- [ ] Le go de passage au chapitre 2 est prononce.

Gate:
- Si un item est non valide, correction immediate avant lancement chapitre 2.

---

## 9) Mode operatoire (session de cadrage recommande)

Duree: 60 minutes
Participants: Product owner, Tech lead, Design lead, representant operationnel

Ordre du jour:
1. 10 min - Rappel du contexte et des objectifs business.
2. 20 min - Validation vision et perimetre.
3. 20 min - Validation principes et hypotheses.
4. 10 min - Decision go/no-go chapitre 2.

Sorties obligatoires:
- Decisions ecrites dans ce fichier.
- Actions assignees (owner + date) pour les points ouverts.

---

## 10) Journal des decisions

### Decision D1 - Vision 90 jours
Statut: A valider
Decisionnaire:
Date:
Commentaire:

### Decision D2 - Perimetre inclus/exclu
Statut: A valider
Decisionnaire:
Date:
Commentaire:

### Decision D3 - Principes directeurs
Statut: A valider
Decisionnaire:
Date:
Commentaire:

### Decision D4 - Go Chapitre 2
Statut: A valider
Decisionnaire:
Date:
Commentaire:

---

## 11) Definition de termine (DoD Chapitre 1)
Le chapitre 1 est termine uniquement si:

1. Les sections 2, 3, 4, 5 sont validees.
2. Le gate de la section 8 est complet.
3. Le journal des decisions (section 10) est renseigne.
4. Le go explicite vers chapitre 2 est enregistre.

---

## 12) Redemarrage 1/13 - Action immediate

Pour repartir proprement depuis le chapitre 1:

1. Revue atelier de 60 minutes sur les sections 2 a 6.
2. Renseignement des decisions D1, D2, D3.
3. Validation du go/no-go D4.
4. Si go: passage direct a la validation chapitre 2.

Sortie obligatoire:
- Un statut explicite: GO Chapitre 2 ou NO-GO Chapitre 2.
