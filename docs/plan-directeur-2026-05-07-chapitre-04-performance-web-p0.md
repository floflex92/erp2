# Plan directeur NEXORA – Chapitre 4 / 13
## Performance Web P0 — Bundle, Critical Path & Render Blocking

> Version : 1.0 – 7 mai 2026  
> Statut : **ACTIF** — implémentation Sprint 1 en cours

---

## 4.1 Diagnostic : pourquoi FCP = 4.2s et LCP = 6.7s ?

### Baseline Lighthouse (throttled Mobile 4G)
| Métrique | Valeur | Cible P0 | Écart |
|----------|--------|----------|-------|
| FCP | 4.2–4.3 s | ≤ 2.5 s | **−1.7 s** |
| LCP | 6.7–6.9 s | ≤ 4.0 s | **−2.7 s** |
| TBT | 50–80 ms | ≤ 200 ms | ✅ OK |
| CLS | 0 | ≤ 0.1 | ✅ OK |
| Score Perf | 0.66 | ≥ 0.85 | **−0.19** |

### Causes identifiées (par ordre d'impact)

```
[CRITIQUE] Cascade JS avant premier rendu
  → entry chunk doit charger vendor-react + vendor-router + vendor-supabase
    avant qu'une seule frame ne soit peinte.

[CRITIQUE] SiteLayout + HomePage sont lazy (chunks séparés)
  → même avec modulepreload hints, il y a 1-2 roundtrips réseau supplémentaires
    sur mobile 4G avant que React puisse hydrater le DOM.

[ÉLEVÉ] SiteFallback ne peut pas s'afficher correctement sans le bundle CSS
  → .nx-skeleton, .site-shell etc. ne sont pas définis jusqu'au chargement du CSS.

[ÉLEVÉ] gtag.js chargé en <head> avec `async`
  → bien que non-bloquant, gtag consomme du CPU/bande passante en compétition
    avec les chunks JS critiques sur mobile.

[MOYEN] AuthProvider.getSession() sur TOUTES les pages
  → pour les visiteurs anonymes (pas de token Supabase en localStorage),
    getSession() est un appel async inutile qui garde `loading=true` pendant
    ~50-200ms avant de confirmer session=null.

[MOYEN] Image hero : LCP sans width/height explicites (corrigé sprint 1)
  → navigateur ne peut pas réserver l'espace avant téléchargement → CLS.
```

---

## 4.2 Améliorations livrées (Sprint 1)

| Ticket | Description | Impact estimé | Statut |
|--------|-------------|---------------|--------|
| A-04 | `SiteFallback` skeleton marketing | FCP perçu −0.5 s | ✅ |
| A-04b | Suspense public routes → `SiteFallback` | FCP perçu | ✅ |
| A-05 | `width`/`height` hero image (1400×1050) | CLS 0 garanti | ✅ |
| A-01 | JSON-LD déféré via `scheduleIdleWork` | TBT −5 ms | ✅ |
| A-02 | `articleIndex` dynamic import idle | TBT −10 ms | ✅ |
| A-03 | CustomEvent vs MutationObserver | CPU −5 ms | ✅ |

---

## 4.3 Améliorations livrées (Sprint 2 — Chapitre 4 code)

### [A-11] Inline critical CSS dans `index.html`

**Problème** : `SiteFallback` et le squelette nav s'affichent sans style jusqu'au
chargement du chunk CSS principal. Le visiteur voit des blocs bruts sans animation.

**Solution** : inline dans `<head>` un bloc `<style>` minimal (~350 octets gzippé)
contenant uniquement :
- `@keyframes nx-shimmer`
- `.nx-skeleton` avec ses CSS custom properties
- `min-height: 100dvh` sur `body`

Impact : FCP perçu amélioré — le skeleton s'anime immédiatement.

### [A-07] Fast-path AuthProvider : skip `getSession()` si pas de token

**Problème** : `AuthProvider` appelle toujours `supabase.auth.getSession()` (async),
maintenant `loading=true` et obligeant `RequireAuth` à afficher un spinner même
pour les visiteurs anonymes sur les routes publiques.

**Solution** : Vérifier `localStorage` de façon synchrone avant l'appel async.
Si aucune clé `sb-*-auth-token` n'existe, l'utilisateur est définitivement
non-authentifié → `setLoading(false)` immédiat, `setSession(null)` sync.

```
Avant : getSession() → microtask → 50-200ms → loading=false
Après : localStorage check sync → 0ms → loading=false  (visiteurs anonymes)
```

Impact sur les routes protégées (`RequireAuth`) : résolution immédiate.

### [A-12] Déférer l'initialisation gtag après LCP

**Problème** : `gtag.js` est chargé en `<head>` avec `async`. Même si non-bloquant
pour le parsing HTML, le thread JS exécute gtag dès qu'il est disponible, en
compétition directe avec les chunks critiques React/SiteLayout.

**Solution** : Déplacer l'initialisation gtag vers `requestIdleCallback` /
`setTimeout(2000)` déclenché depuis App.tsx après le montage. Le `<script async>`
peut rester dans `<head>` pour le préchargement mais l'exécution `gtag('config')`
est différée.

---

## 4.4 Backlog Sprint 3 (prochains tickets P0)

| Ticket | Description | Effort | Impact |
|--------|-------------|--------|--------|
| A-06 | Bundle visualizer + identifier chunks surdimensionnés | M | Fort |
| A-13 | Lazy-load `@supabase/supabase-js` hors critical path | L | Très fort |
| A-14 | CSS code-split : chunk CSS public site séparé ERP | M | Fort |
| A-15 | `<link rel="preload" as="font">` DM Sans 400 woff2 | S | Moyen |
| A-16 | Mesure FCP/LCP après sprints 1+2 (Lighthouse CI) | XS | Baseline |

---

## 4.5 Architecture bundle cible

```
ACTUEL (entry bundle cascade)
  index.js
  ├── vendor-react      (~45 KB gz)
  ├── vendor-router     (~12 KB gz)
  ├── vendor-supabase   (~85 KB gz) ← BLOQUE critical path
  ├── SiteLayout chunk  (~18 KB gz)
  └── HomePage chunk    (~42 KB gz)

CIBLE (après sprint 3)
  index.js (minimal, ~8 KB gz)
  ├── vendor-react      (~45 KB gz) ← modulepreload
  ├── vendor-router     (~12 KB gz) ← modulepreload
  ├── SiteLayout chunk  (~18 KB gz) ← modulepreload
  ├── HomePage chunk    (~42 KB gz) ← modulepreload
  └── vendor-supabase   (~85 KB gz) ← lazy, chargé après FCP
```

---

## 4.6 KPI de sortie du chapitre 4

Le Chapitre 4 est clôturé quand :
- FCP ≤ 3.0 s en Lighthouse throttled (vs 4.2 s baseline)
- LCP ≤ 5.0 s (vs 6.7 s baseline)
- Score Perf ≥ 0.75 (vs 0.66 baseline)
- 0 régression TBT / CLS

→ Gate vers **Chapitre 5** : Conversion marketing P1

---

*Fin du Chapitre 4/13*
