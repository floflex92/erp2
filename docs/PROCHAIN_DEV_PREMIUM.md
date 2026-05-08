# Prochain developpement - Passage niveau premium

Date: 2026-05-08
Contexte: base solide, mais il reste des chantiers critiques pour atteindre un niveau premium.

## Priorite P0 (a faire en premier)

### 1) Performance mobile (home + login + dashboard)
Objectif:
- Lighthouse Performance >= 90
- LCP < 2.5 s
- FCP < 1.8 s
- INP < 200 ms

Constat actuel (dernier audit):
- Performance ~66
- FCP ~4.2-4.3 s
- LCP ~6.7-6.9 s

Actions:
- Reduire JS initial (split des routes/page lourdes restantes)
- Optimiser hero + images critiques (taille, preload utile)
- Verifier les ressources bloquees au demarrage
- Stabiliser budget de bundle dans CI

Done criteria:
- 3 runs Lighthouse consecutifs >= 90 sur home/login
- Capture des scores stockee dans repo (json)

### 2) CI/CD avec quality gates
Objectif:
- Plus de merge/deploy sans garde-fous automatiques

Actions:
- Ajouter pipeline CI (lint, typecheck, tests, build)
- Ajouter gate E2E smoke (login + navigation principale)
- Ajouter gate perf budget (echec si regression forte)

Done criteria:
- Pipeline obligatoire sur PR
- Echec automatique si lint/typecheck/test/build KO

## Priorite P1

### 3) Observabilite production
Objectif:
- Voir les erreurs et degradations avant les users

Actions:
- Brancher monitoring erreurs front (Sentry ou equivalent)
- Ajouter alertes sur erreurs critiques
- Dashboard release health (version -> incidents)

Done criteria:
- Erreur test capturee dans l'outil
- Alerte verifiee de bout en bout

### 4) Securite enterprise
Objectif:
- Durcissement progressif sans casser la prod

Actions:
- CSP: reduire/eliminer unsafe-inline quand possible
- Scanner dependances et secrets en CI
- Tests automatises de non-regression RLS/grants Supabase

Done criteria:
- Rapport securite CI vert
- Test RLS critique passe sur migration recente

## Priorite P2

### 5) Fiabilite operations
Objectif:
- Etre serein en incident

Actions:
- Runbook incident
- Procedure rollback
- Test restore backup

Done criteria:
- Exercice rollback realise et documente

### 6) UX premium
Objectif:
- Time-to-value rapide pour un nouveau user

Actions:
- Onboarding guide
- Etats vides utiles
- Feedback et aides contextuelles

Done criteria:
- Nouveau user complete un parcours cle en < 10 min

## Plan demain (suggestion practical)
1. Mettre en place CI minimale (lint/typecheck/tests/build)
2. Faire 1 passe perf sur home/login (quick wins)
3. Relancer Lighthouse et comparer aux baselines
4. Ouvrir tickets P1 (observabilite + securite)

## Notes
- Conserver l'approche actuelle: tests critiques avant build/deploy.
- Garder un changelog court mais visible pour chaque release.