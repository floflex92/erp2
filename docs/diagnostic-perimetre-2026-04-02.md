# Diagnostic perimetre - 2026-04-02

## Contexte

Avant de continuer la partie comptable, un tri des changements en cours a ete fait pour separer:
- les changements deja presents dans le repo (hors demande comptable)
- les nouveaux changements a produire pour le Lot A comptable

## Etat git observe

Repartition approximative des changements deja presents:
- src: 31
- netlify: 13
- supabase: 7
- docs: 2
- autres fichiers racine: 5

## Fichiers comptables crees dans cette demande

- docs/cadrage-comptabilite-transport-v1.md
- docs/backlog-comptabilite-transport-v1.md

## Decision de perimetre

Pour eviter toute collision avec les chantiers en cours:
- ne pas modifier les fichiers applicatifs deja touches par d autres evolutions
- ajouter un lot Supabase comptable autonome via une nouvelle migration dediee
- ne toucher qu aux objets comptables nouveaux (prefixe compta_ + vues comptables)

## Suite immediate

Demarrer le Lot A avec:
- schema comptable coeur (journaux, plan, ecritures, lignes)
- controles debit/credit et verrouillage des ecritures validees
- journal d audit append-only
- prefiguration TVA declarative
- vue FEC v1
- generation automatique d ecriture a partir des factures clients
