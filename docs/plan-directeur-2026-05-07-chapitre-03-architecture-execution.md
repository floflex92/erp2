# Plan directeur NEXORA – Chapitre 3 / 13
## Architecture d'exécution : streams, capacité, gouvernance sprint

> Version : 1.0 – 7 mai 2026  
> Statut : **ACTIF** – implémentation en cours

---

## 3.1 Vue d'ensemble : les 5 streams d'exécution

L'amélioration produit est organisée en 5 streams parallèles, chacun avec un propriétaire, des tickets backlogs distincts et un budget capacité dédié.

| Stream | Domaine | Propriétaire | Priorité |
|--------|---------|--------------|----------|
| **A – Perf** | Core Web Vitals, FCP, LCP, TBT | Lead Tech | P0 |
| **B – Conversion** | Entonnoir marketing, landing, démo | Lead Produit | P0 |
| **C – UX ERP** | Ergonomie app authentifiée, accessibilité | Lead Design | P1 |
| **D – Design System** | Tokens, composants partagés, dark/night modes | Lead Design | P1 |
| **E – Qualité** | Tests E2E, couverture, régression | Lead QA | P2 |

---

## 3.2 Allocation capacité par sprint (12 semaines)

Chaque sprint = 2 semaines. Capacité normalisée à 10 points/sprint (relative).

```
Sprint 1–2  : A=40%  B=40%  C=10%  D=5%  E=5%
Sprint 3–4  : A=30%  B=30%  C=20%  D=15% E=5%
Sprint 5–6  : A=20%  B=25%  C=25%  D=20% E=10%
Sprint 7–8  : A=15%  B=20%  C=30%  D=25% E=10%
Sprint 9–10 : A=10%  B=15%  C=30%  D=30% E=15%
Sprint 11–12: A=10%  B=10%  C=25%  D=35% E=20%
```

**Principe** : P0 (Perf + Conversion) consomme 80% de la capacité sur les 4 premiers sprints, puis cède progressivement la place à P1 (UX ERP + Design System) à mesure que les Quick Wins Perf sont épuisés.

---

## 3.3 Séquence sprint par sprint

### Sprint 1 (S1–S2, semaines 1-2)
**Stream A – Perf (P0)**
- [A-01] ✅ Déférer JSON-LD scripts via `scheduleIdleWork` (HomePage.tsx) — *fait*
- [A-02] ✅ Dynamic import `articleIndex` → idle time (HomePage.tsx) — *fait*
- [A-03] ✅ Remplacer MutationObserver par CustomEvent `nexora:lazy-section-mounted` — *fait*
- [A-04] 🔄 `SiteFallback` : skeleton marketing léger remplace le RouteFallback ERP pendant Suspense (publicRoutes.tsx) — **en cours**
- [A-05] 🔄 Attributs `width`/`height` sur l'image hero LCP pour éviter CLS — **en cours**

**Stream B – Conversion (P0)**
- [B-01] Audit entonnoir CTA hero → démo (ancre, scroll, mobile)
- [B-02] Vérifier l'A/B texte CTA principal (« Voir la démo » vs « Essayer gratuitement »)

---

### Sprint 2 (S3–S4, semaines 3-4)
**Stream A – Perf**
- [A-06] Analyser bundle entry avec `vite-bundle-visualizer` → identifier chunks sur-chargés
- [A-07] Évaluer lazy-init de `AuthProvider` pour les routes publiques (ne pas appeler Supabase getSession sur homepage)
- [A-08] Audit critical CSS : identifier déclarations inutilisées dans `index.css` above-the-fold
- [A-09] Test `font-display: swap` effectif sur DM Sans + Montserrat

**Stream B – Conversion**
- [B-03] Hero section : améliorer score lisibilité mobile (contraste CTA)
- [B-04] Ajouter trust signal (nombre d'entreprises, note Capterra) au-dessus de la ligne de flottaison

---

### Sprint 3 (S5–S6, semaines 5-6)
**Stream A – Perf**
- [A-10] Mesurer gain FCP/LCP après sprints 1–2 (nouveau run Lighthouse)
- [A-11] Évaluer SSR partiel / hydration deferral pour SiteLayout + HomePage

**Stream C – UX ERP**
- [C-01] Audit accessibilité clavier : pages Dashboard, Planning, Chauffeurs
- [C-02] États de chargement : cohérence des skeletons dans les pages ERP

**Stream D – Design System**
- [D-01] Inventaire tokens CSS actuels (`index.css`) vs. usage effectif dans composants
- [D-02] Créer token `--color-brand-primary` unique remplaçant les `#2563EB` en dur

---

### Sprints 4–6 (semaines 7–12)
Détaillés dans les Chapitres 4 (Stream B Conversion) et 5 (Stream C UX ERP).

---

## 3.4 Backlogs par stream (référence tickets)

### Stream A – Perf
| ID | Titre | Effort | Impact FCP | Statut |
|----|-------|--------|------------|--------|
| A-01 | Déférer JSON-LD via scheduleIdleWork | XS | Moyen | ✅ |
| A-02 | Dynamic import articleIndex | XS | Moyen | ✅ |
| A-03 | CustomEvent vs MutationObserver | XS | Faible | ✅ |
| A-04 | SiteFallback skeleton marketing | S | Fort | 🔄 |
| A-05 | Width/height hero image LCP | XS | Fort (CLS) | 🔄 |
| A-06 | Bundle analysis + chunking | M | Fort | ⏳ |
| A-07 | Lazy-init AuthProvider public routes | L | Très fort | ⏳ |
| A-08 | Critical CSS audit | M | Moyen | ⏳ |
| A-09 | font-display:swap validation | XS | Moyen | ⏳ |
| A-10 | Nouveau run Lighthouse baseline | XS | — | ⏳ |

### Stream B – Conversion
| ID | Titre | Effort | Impact Conv. | Statut |
|----|-------|--------|--------------|--------|
| B-01 | Audit entonnoir CTA hero | S | Fort | ⏳ |
| B-02 | A/B texte CTA | M | Fort | ⏳ |
| B-03 | CTA mobile contraste | S | Moyen | ⏳ |
| B-04 | Trust signals above-the-fold | S | Fort | ⏳ |

---

## 3.5 Gouvernance sprint

### Réunions
| Type | Fréquence | Durée | Participants |
|------|-----------|-------|--------------|
| Sprint planning | J+0 (lundi) | 1h | Tous leads |
| Daily standup | Quotidien | 15 min | Tous |
| Sprint review | J+10 (vendredi) | 1h | Leads + stakeholder |
| Retrospective | J+10 (vendredi après review) | 45 min | Équipe |
| Revue KPI | Hebdomadaire | 30 min | Lead Produit |

### Gates de passage (exit criteria)
Pour passer d'un sprint au suivant :
1. **Gate Perf** : FCP < 3.0s ou gain ≥ 15% vs. baseline en Lighthouse prod
2. **Gate Conversion** : 0 régression sur les chemins CTA mesurés
3. **Gate Qualité** : 0 régression tests existants, couverture ≥ baseline
4. **Gate Accessibilité** (sprint 3+) : 0 nouvelle violation axe-core niveau AA

### Escalade
- Ticket bloqué > 48h → escalade Lead Tech
- Impact sur un autre stream non prévu → réunion d'alignement express (30 min)
- Décision architecture > M → ADR (Architecture Decision Record) requis

---

## 3.6 Règle d'or d'exécution

> **Pour chaque chapitre produit livré, au moins une amélioration de code réelle est déployée dans le même cycle.**

Les documents de plan n'ont de valeur que s'ils accompagnent des commits mesurables.

---

## 3.7 Passerelle vers Chapitre 4

Une fois [A-04] et [A-05] validés en production et [A-06] (bundle analysis) terminé, le Chapitre 4 — **Optimisation Bundle & Critical Path** — peut démarrer.

KPI déclencheur : **FCP ≤ 3.5s** en Lighthouse prod (throttled).

---

*Fin du Chapitre 3/13*
