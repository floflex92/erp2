# Sprint Epic A - Comptabilite (12 avril 2026)

Objectif: terminer Epic A (A1 a A6) en ordre strict de conformite, sans demarrer Epic B avant validation complete.

Reference backlog: docs/backlog-comptabilite-transport-v1.md

## Regle de pilotage

- Gate 1: A1 et A2 valides avant A3.
- Gate 2: A3 et A4 valides avant A5.
- Gate 3: A5 valide avant A6.
- Gate 4: A6 valide => autorisation d ouvrir Epic B.

## Etat de depart (constate dans le repo)

- Socle SQL Lot A deja present: journaux, plan comptable, ecritures/lignes, TVA, audit, FEC.
- UI comptabilite deja presente: saisie, plan comptable, balance, grand livre, bilan, resultat, export FEC.
- Fonctions clefs deja presentes: validation ecriture et export FEC.

Conclusion: sprint oriente finalisation, hardening et validation de conformite (pas de refonte).

## Sprint plan (7 jours ouvrables)

## Jour 1 - A1 Plan comptable et journaux

### Ticket A1.1 - Durcir referentiels comptables
- Type: SQL + tests
- Portee:
  - Verifier coherence codes journaux AC/VT/BQ/CA/OD en seed et contraintes.
  - Completer plan de comptes minimum exploitation transport (comptes manquants critiques).
  - Verifier unicite et format des comptes en lecture/ecriture UI.
- Definition of done:
  - Insert/update invalides rejetes en DB.
  - Import/edition UI sans compte duplique.
  - Jeu de tests SQL vert.

### Ticket A1.2 - Verrou role/permissions referentiels
- Type: RLS + role mapping
- Portee:
  - Autoriser edition plan/journaux uniquement roles admin/dirigeant/comptable/facturation.
  - Forcer lecture authentifiee.
- Definition of done:
  - Tentative ecriture role non autorise => refusee.
  - Lecture role autorise => OK.

## Jour 2 - A2 Ecritures en partie double

### Ticket A2.1 - Hardening validation comptable
- Type: SQL function + tests
- Portee:
  - Renforcer controle debit=credit (arrondis, zeros, minimum 2 lignes).
  - Verifier blocage update/delete sur ecritures validees et leurs lignes.
- Definition of done:
  - Cas non equilibres rejetes.
  - Cas equilibres valides.
  - Aucune mutation possible sur ecriture validee.

### Ticket A2.2 - UX de saisie et erreurs metier
- Type: Front
- Portee:
  - Messages explicites sur erreurs de validation.
  - Pre-check local avant appel RPC (somme debit/credit, minimum lignes).
- Definition of done:
  - L utilisateur comprend la cause du rejet sans lire logs DB.
  - Flux de validation stable (pas de double soumission).

## Jour 3 - A3 Factures vers ecritures

### Ticket A3.1 - Flux facture client vers VT
- Type: Integration front/back
- Portee:
  - Verifier creation piece + ecriture + lignes VT a validation facture client.
  - Garantir idempotence (pas de doublon si re-validation ou retry).
- Definition of done:
  - Une facture client validee => un seul mouvement VT relie a la source.
  - Rejouer action => aucun doublon.

### Ticket A3.2 - Flux facture fournisseur vers AC
- Type: Integration SQL
- Portee:
  - Verifier generation AC + TVA deductible selon statuts valides.
  - Verifier mapping comptes charge/TVA/fournisseur par defaut et surcharge.
- Definition of done:
  - Facture fournisseur validee/payee => ecriture AC correcte et equilibree.
  - Lien piece/source present.

## Jour 4 - A4 TVA declarative multi-taux

### Ticket A4.1 - Couverture taux/regimes requis
- Type: SQL + tests
- Portee:
  - Verifier taux 0/2.1/5.5/8.5/10/20 + regimes.
  - Completer taux manquants et mappings comptes si besoin.
- Definition of done:
  - Tous les taux backlog disponibles.
  - Calculs de base HT et montant TVA corrects sur jeux de tests.

### Ticket A4.2 - Preparation CA3/CA12
- Type: Vues + export
- Portee:
  - Stabiliser extraction par periode et code case.
  - Ajouter controle des periodes cloturees/declarees.
- Definition of done:
  - Extraction exploitable sans retraitement manuel lourd.
  - Periode declaree non modifiable sans action explicite.

## Jour 5 - A5 Etats comptables de base

### Ticket A5.1 - Balance et grand livre fiabilises
- Type: SQL views + front
- Portee:
  - Verifier exactitude des vues et tris.
  - Ajouter verifs de coherence entre soldes GL et balance.
- Definition of done:
  - Soldes cohérents entre ecrans et exports CSV.
  - Pas d ecart de total sur meme exercice.

### Ticket A5.2 - Exports CSV robustes
- Type: Front
- Portee:
  - Uniformiser formats dates/nombres.
  - Verifier encodage UTF-8 BOM pour ouverture tableur.
- Definition of done:
  - CSV lisibles sous Excel/LibreOffice sans correction manuelle.

## Jour 6 - A6 FEC et inalterabilite

### Ticket A6.1 - Export FEC bout en bout
- Type: SQL RPC + validation fonctionnelle
- Portee:
  - Verifier format export FEC v1 sur exercice complet.
  - Verifier enregistrement checksum SHA256 et metadonnees export.
- Definition of done:
  - Export genere sur un exercice cible.
  - Trace export presente en base avec checksum.

### Ticket A6.2 - Inalterabilite et contre-ecriture
- Type: SQL + processus
- Portee:
  - Interdire update/delete de toute ecriture validee.
  - Formaliser le correctif via contre-ecriture uniquement.
- Definition of done:
  - Tentative de modification directe rejetee.
  - Procedure de correction documentee et testee.

## Jour 7 - Stabilisation et gate final Epic A

### Ticket A-GATE.1 - Campagne tests transverse
- Type: tests unitaires + integration
- Cas minimaux:
  - debit/credit: 6 cas (3 OK, 3 KO)
  - TVA: 6 taux + regimes
  - facture client -> VT
  - facture fournisseur -> AC
  - export FEC + checksum
  - blocage mutation ecriture validee
- Definition of done:
  - Tous tests verts.
  - Aucun bug bloquant ouvert.

### Ticket A-GATE.2 - Revue exploitation/compta
- Type: recette metier
- Portee:
  - Validation conjointe comptable + exploitation sur un jeu realiste.
  - Signature gate autorisant ouverture Epic B.
- Definition of done:
  - PV de recette interne valide.
  - Epic B autorise.

## Backlog de risques a suivre pendant sprint

- Risque R1: doublon de generation d ecriture sur replays d evenements facture.
- Risque R2: divergence arrondis TVA entre UI et DB.
- Risque R3: ecarts entre vues comptables et export FEC.
- Risque R4: permissivite RLS sur tables comptables annexes.

## Checklist quotidienne (15 min)

- Aucune tache Epic B/C ouverte tant que gate Epic A non valide.
- Aucun contournement manuel de validation comptable.
- Journal d audit alimente pour chaque operation comptable critique.
- Build/lint/tests executes avant cloture de journee.

## Commandes de verification recommandees

- npm run test
- npm run build

Si une migration SQL est ajoutee pendant le sprint:
- supabase migration list
- supabase db push --dry-run
- puis push effectif seulement apres validation dry-run
