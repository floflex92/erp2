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
