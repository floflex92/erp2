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

## Axe transversal - Direction artistique (inspiration AKANEA, signature NEXORA)

Objectif:
- Monter en maturite visuelle B2B (lisibilite, densite utile, sensation de robustesse)
- Garder une identite NEXORA immediate (couleurs, rythme, ton, details d'interface)

Principe directeur:
- 70% ergonomie metier universelle (grille claire, hierarchie, densite controlee)
- 20% inspirations concurrentielles (navigation, structure des ecrans, sobriete)
- 10% signature NEXORA exclusive (couleur de marque, accents, formes, micro-interactions)

### 7) Charte visuelle cible (v1)
Objectif:
- Definir des regles stables pour tous les modules ERP

Actions:
- Verrouiller les tokens existants comme socle: background/surface/text/border/primary/accent
- Limiter les variantes composant a 3 niveaux max (default/hover/active)
- Uniformiser les ombres et rayons (ex: card, panel, modal) sur tous les themes
- Imposer 1 couleur d'accent operationnelle (pas de dispersion par page)
- Garder un contraste lisible dans les 3 themes (light/dark/night)

Done criteria:
- Mini style guide validee avec exemples reel sur 3 ecrans (login, home, dashboard)
- Aucune derive de palette hors tokens sur les nouveaux composants

### 8) Signature NEXORA visible
Objectif:
- Eviter un rendu generic enterprise

Actions:
- Definir 3 marqueurs de marque obligatoires:
	1. fond d'application (gradient/page atmosphere)
	2. traitement des zones de pilotage (cards KPI, bandeaux, highlights)
	3. style d'icones et badges statut
- Standardiser la typo d'interface (titres + corps) sans multiplier les familles
- Formaliser un "tone of UI" (sobre, precis, orientee exploitation transport)

Done criteria:
- Revue visuelle: un utilisateur interne reconnait NEXORA sans voir le logo

### 9) Plan de deploiement ecran par ecran
Objectif:
- Refaire la DA sans casser le delivery fonctionnel

Ordre recommande:
1. Login (image de marque immediate)
2. Home cockpit (hierarchie KPI + actions rapides)
3. Dashboard exploitation (table + filtres + timeline)
4. Pages de flux metier secondaires

Regle d'execution par ecran:
1. Audit UI rapide (lisibilite, densite, priorites)
2. Application charte v1 (tokens + layout + composants)
3. Validation responsive desktop/mobile
4. Verification accessibilite (focus, contraste, navigation clavier)
5. Snapshot visuel avant/apres

Done criteria:
- 3 ecrans coeur migres sans regression fonctionnelle
- Checklist UX + A11y validee a chaque migration

### 10) KPIs de succes DA
Objectif:
- Mesurer la qualite visuelle autrement que "ressenti"

Mesures:
- Taux de completion des parcours critiques
- Temps de prise en main nouveau user
- Reduction des erreurs de saisie sur formulaires cle
- Feedback qualite percue (interne + clients pilotes)

Done criteria:
- Baseline avant refonte + mesure 2 semaines apres migration des 3 ecrans coeur

Livrables de reference:
- Playbook implementation Login + Cockpit: docs/da-playbook-login-cockpit-v1.md
- Checklist review visuelle reutilisable: docs/checklist-review-visuelle-da.md

## Plan demain (suggestion practical)
1. Mettre en place CI minimale (lint/typecheck/tests/build)
2. Faire 1 passe perf sur home/login (quick wins)
3. Relancer Lighthouse et comparer aux baselines
4. Ouvrir tickets P1 (observabilite + securite)

## Notes
- Conserver l'approche actuelle: tests critiques avant build/deploy.
- Garder un changelog court mais visible pour chaque release.