# Backlog Comptabilite Transport v1

Date: 2026-04-02
Dependance: docs/cadrage-comptabilite-transport-v1.md

## Epic A - Conformite legale minimale

### A1. Plan comptable et journaux
- User story: En tant que comptable, je veux parametrer les comptes et journaux pour saisir des ecritures conformes PCG.
- Done quand:
  - tables plan comptable + journaux creees
  - codes journaux AC/VT/BQ/CA/OD disponibles
  - validation unicite code compte active

### A2. Ecritures en partie double
- User story: En tant que comptable, je veux enregistrer des ecritures dont debit et credit sont equilibres.
- Done quand:
  - table ecritures + lignes en place
  - controle debit=credit bloque la validation sinon
  - statut brouillon/validee disponible

### A3. Integration factures -> ecritures
- User story: En tant qu utilisateur facturation, je veux que la validation d une facture cree l ecriture de vente automatiquement.
- Done quand:
  - facture client validee cree mouvement VT
  - facture fournisseur cree mouvement AC
  - lien piece/source conserve

### A4. TVA collectee/deductible multi-taux
- User story: En tant que comptable, je veux suivre TVA collectee et deductible par periode et par taux.
- Done quand:
  - regles TVA stockees (0, 2.1, 5.5, 8.5, 10, 20 + regimes)
  - calculs par periode disponibles
  - extraction CA3/CA12 pre-remplie

### A5. Etats comptables de base
- User story: En tant que dirigeant/comptable, je veux consulter balance et grand livre.
- Done quand:
  - balance generale filtree par periode
  - grand livre par compte
  - export CSV des deux etats

### A6. Archivage legal et FEC
- User story: En tant que responsable, je veux exporter le FEC et prouver l inalterabilite des ecritures.
- Done quand:
  - export FEC exercice disponible
  - checksum SHA256 stocke
  - update/delete interdit sur ecritures validees
  - corrections faites uniquement via contre-ecriture

## Epic B - Rapprochement bancaire

### B1. Import releves CSV
- Done quand:
  - import CSV robuste (doublons evites par hash)
  - mouvements visibles et filtrables

### B2. Lettrage auto + manuel
- Done quand:
  - proposition auto (montant/date/reference)
  - validation manuelle possible ligne a ligne
  - ecarts restants identifies

## Epic C - Analytique transport

### C1. Axes analytiques obligatoires
- Done quand:
  - axes camion/chauffeur/tournee/client/misson disponibles
  - controles de presence selon type d ecriture

### C2. Marges et couts
- Done quand:
  - marge par mission/tournee/client
  - cout/km par camion
  - couts carburant/peage/entretien/sous-traitance consolides

## Epic D - Sous-traitance et recouvrement

### D1. Sous-traitance
- Done quand:
  - factures transporteurs externes liees aux missions
  - marge nette mission (vente - sous-traitance - couts directs)

### D2. Relances impayes
- Done quand:
  - scenarios de relance parametrables
  - historique relances trace
  - statut risque client calcule

## Epic E - Automatisation

### E1. OCR fournisseurs v1
- Done quand:
  - extraction champs clefs (date, montant, TVA, fournisseur)
  - proposition d ecriture d achat

### E2. Rapprochement intelligent
- Done quand:
  - scoring de match
  - seuil auto-validation configurable

## Ordre de livraison recommande

1. Epic A
2. Epic B
3. Epic C
4. Epic D
5. Epic E

## Definition of Done transverse

- Tests unitaires sur regles debit/credit + TVA
- Tests integration sur creation facture -> ecriture
- Journal d audit renseigne sur chaque operation comptable
- Build/lint/tests passes
