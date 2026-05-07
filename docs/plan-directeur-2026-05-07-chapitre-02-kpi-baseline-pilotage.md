# Chapitre 2 - KPI, baseline et pilotage

Date: 2026-05-07
Statut: Pret a execution
Dependance: Chapitre 1 valide

## 1) Finalite du chapitre
Transformer le plan en pilotage chiffre avec:
- baseline verifiable,
- cibles 90 jours,
- cadence de mesure,
- seuils d'alerte,
- gate de passage au chapitre 3.

---

## 2) Baseline confirmee (source Lighthouse)

### 2.1 Home (rapport final)
Source:
- erp2/lh-final-home.json

Valeurs:
- Performance score: 0.66
- FCP: 4.2 s (4222.97 ms)
- LCP: 6.7 s (6723.47 ms)
- Speed Index: 4.2 s
- TBT: 50 ms
- CLS: 0

References:
- erp2/lh-final-home.json:34
- erp2/lh-final-home.json:149
- erp2/lh-final-home.json:5151

### 2.2 Home + Login
Source:
- erp2/lh-final-homelogin.json

Valeurs:
- Performance score: 0.66
- FCP: 4.3 s (4329.38 ms)
- LCP: 6.9 s (6873.41 ms)
- Speed Index: 4.3 s
- TBT: 50 ms
- CLS: 0

References:
- erp2/lh-final-homelogin.json:34
- erp2/lh-final-homelogin.json:149
- erp2/lh-final-homelogin.json:4878

### 2.3 Login (rapport final)
Source:
- erp2/lh-login-final-3.json

Valeurs:
- Performance score: 0.66
- FCP: 4.3 s (4338.04 ms)
- LCP: 6.8 s (6825.64 ms)
- Speed Index: 4.3 s
- TBT: 80 ms
- CLS: 0

References:
- erp2/lh-login-final-3.json:34
- erp2/lh-login-final-3.json:149
- erp2/lh-login-final-3.json:4853

Conclusion baseline:
- Le frein principal est le rendu initial (FCP/LCP).
- L'interactivite est deja bonne (TBT bas).
- La stabilite visuelle est bonne (CLS a 0).

---

## 3) KPI cibles a 90 jours

## 3.1 KPI performance
1. Home performance score >= 0.85
2. Home LCP <= 2.8 s
3. Home FCP <= 2.2 s
4. Home+Login performance score >= 0.85
5. Home+Login LCP <= 3.0 s
6. Login LCP <= 3.0 s

## 3.2 KPI conversion
1. CTR CTA principal Home +30%
2. Abandon avant login -20%
3. Taux de passage Home -> Demo/Contact +20%

## 3.3 KPI UX ERP
1. Temps d'acces action critique par role -25%
2. Taux d'utilisation quick actions +20%

## 3.4 KPI qualite
1. 0 regression majeure sur 2 releases consecutives
2. 100% des releases respectent les budgets perf

---

## 4) Cadence de mesure et protocole

## 4.1 Frequence
1. Lighthouse: 2 fois/semaine (mardi, vendredi)
2. Conversion funnel: hebdomadaire
3. UX ERP role-based: toutes les 2 semaines
4. Revue globale KPI: hebdomadaire (30 min)

## 4.2 Conditions de mesure
1. Mesure mobile prioritaire
2. Conditions reseau stables (meme preset)
3. 3 runs par scenario, moyenne retenue
4. Conservation des rapports JSON dans erp2

## 4.3 Scenarios obligatoires
1. Home
2. Home puis login
3. Login direct
4. Parcours CTA Home -> Formulaire

---

## 5) Seuils d'alerte

Alerte rouge (action immediate):
1. LCP > 4.0 s sur Home ou Login
2. Performance score < 0.70
3. Regression > 15% sur CTR CTA principal

Alerte orange (action planifiee sprint courant):
1. LCP entre 3.2 s et 4.0 s
2. Performance score entre 0.70 et 0.80
3. Regression CTR entre 5% et 15%

---

## 6) Tableau de pilotage (modele)

| KPI | Baseline | Cible 90j | Valeur Semaine N | Ecart | Statut |
|---|---:|---:|---:|---:|---|
| Home Performance | 0.66 | 0.85 |  |  |  |
| Home FCP (s) | 4.2 | 2.2 |  |  |  |
| Home LCP (s) | 6.7 | 2.8 |  |  |  |
| Home+Login Performance | 0.66 | 0.85 |  |  |  |
| Home+Login LCP (s) | 6.9 | 3.0 |  |  |  |
| Login LCP (s) | 6.8 | 3.0 |  |  |  |
| CTR CTA principal | a mesurer S1 | +30% |  |  |  |
| Abandon avant login | a mesurer S1 | -20% |  |  |  |
| Temps action critique ERP | a mesurer S2 | -25% |  |  |  |

Statut:
- Vert: trajectoire conforme
- Orange: derivee moderee
- Rouge: hors trajectoire

---

## 7) Backlog minimum de mesure (Semaine 1)

1. Poser les evenements analytics minimum:
   - vue_home
   - clic_cta_principal
   - clic_cta_secondaire
   - ouverture_login
   - soumission_form_demo/contact
2. Definir le funnel:
   - Home -> CTA -> Login/Demo/Contact -> Soumission
3. Standardiser la commande de test Lighthouse (runbook interne)
4. Centraliser les resultats hebdomadaires dans un fichier unique

---

## 8) Roles et responsabilites

1. Owner performance:
   - execution des mesures Lighthouse
   - suivi budgets perf
2. Owner conversion:
   - tracking funnel
   - lecture CTR et abandons
3. Owner UX ERP:
   - mesure temps d'acces action critique par role
4. Owner qualite:
   - verification gate release

---

## 9) Gate Chapitre 2 -> Chapitre 3

Passage autorise uniquement si:

- [ ] Baseline consolidee et partagee
- [ ] Cibles KPI validees
- [ ] Cadence de mesure active
- [ ] Seuils d'alerte approuves
- [ ] Owners assignes
- [ ] Premier tableau hebdo initialise

Decision go/no-go:
- Statut:
- Date:
- Decisionnaire:
- Commentaire:

---

## 10) Definition de termine (DoD Chapitre 2)

Le chapitre 2 est termine si:

1. La baseline est documentee avec references de source.
2. Les KPI cibles 90 jours sont valides.
3. La cadence de mesure est operationnelle.
4. Les seuils d'alerte sont adoptes.
5. Le gate de passage est complete.
