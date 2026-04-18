# Cockpit KPI V2.1 - implementation progressive

Date: 2026-04-18

## 1. Analyse de l existant

Points constates dans le dashboard actuel:
- Surcharge visuelle sur certaines vues (plusieurs blocs avec priorites melangees).
- Hierarchie decisionnelle inegale selon le role.
- Widgets utiles mais parfois repetitifs entre metiers.
- Graphiques heterogenes (lisibilite non uniforme role par role).
- Lecture finance melangeant parfois operationnel et analytique sans priorisation cash.

## 2. Simplification appliquee en V2.1

Principes UX conservateurs (sans casser l existant):
- Un cockpit prioritaire V2.1 place en tete du dashboard.
- Un bouton mode historique maintient le cockpit precedent accessible.
- Pour chaque role non finance: structure limitee a 4-5 widgets utiles max.
- Pour finance: structure analytique enrichie orientee cash et marge.
- Filtres communs: periode, agence, service, client, activite.

## 3. Structure par role implementee

- Exploitant:
  - KPI OT realisees / prevues
  - Line performance journaliere
  - Bar occupation camions
  - Donut type transport
  - Alertes retards / anomalies

- Conducteur (mobile first):
  - KPI livraisons
  - Gauge score performance
  - Line temps tournee
  - Alertes simples

- Dirigeant:
  - KPI CA / marge
  - Bar CA vs couts
  - Bar rentabilite client
  - Donut utilisation flotte
  - Gauge score global

- Mecanicien / Parc:
  - Donut etat flotte
  - Bar cout maintenance
  - Line kilometrage
  - Alertes vehicules

- Commercial:
  - Funnel pipeline
  - Bar CA client
  - Line evolution CA
  - Gauge conversion

- RH:
  - Donut presence / absence
  - Bar performance employes
  - KPI entretiens realises
  - Line turnover

- Comptable / Finance:
  - KPI encaisse / a facturer / impayes / marge
  - Finance Summary (facture, encaisse, a facturer, charges fixes/variables)
  - Bar CA+marge client
  - Bar evolution CA/charges
  - Donut repartition charges
  - Gauge taux encaissement
  - Widget retards paiements
  - Alertes tresorerie prioritaires

## 4. Design system applique

- Couleurs de statut:
  - Vert = bon
  - Orange = attention
  - Rouge = critique
  - Bleu = information
- Limitation palette par graphe a 2-3 couleurs dominantes.
- Cartes arrondies (20px), ombres legeres, spacing coherent.
- Respect contraste clair/sombre via variables theme existantes.

## 5. Technique et performance

- React 19 + TypeScript + Tailwind.
- Recharts introduit pour les graphiques.
- Composants reutilisables crees:
  - KpiCard
  - ChartContainer
  - AlertBox
  - FinanceSummaryCard
  - LatePaymentWidget
- Charts charges en lazy via Suspense.
- Skeleton de chargement pour eviter le layout shift.
- Calculs memoises pour limiter les re-renders.

## 6. Non regression

- Le dashboard historique n est pas supprime.
- Le cockpit V2.1 est progressif et reversible par un bouton.
- Les widgets legacy restent actifs sous le cockpit prioritaire.
