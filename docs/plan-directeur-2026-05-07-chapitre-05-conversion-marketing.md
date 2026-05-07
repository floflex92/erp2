# Plan directeur NEXORA – Chapitre 5 / 13
## Conversion marketing P1 — Entonnoir, CTA et social proof

> Version : 1.0 – 7 mai 2026  
> Statut : **ACTIF** — premières améliorations livrées

---

## 5.1 Diagnostic entonnoir de conversion

### Parcours visiteur actuel (avant Sprint 5)

```
Arrivée homepage (Google / direct)
  ↓
Hero — CTA primaire "Découvrir nos solutions" → /solution  [❌ FUITE]
  ↓
Scroll — trust strip dans LazySection (invisible sans scroll)  [❌ FUITE]
  ↓
Sections contenu (pain, fonctionnalités, modules, ROI)
  ↓
Section CTA bas de page — "Demander une démo" → /demonstration  [✅]
```

**Problème critique** : le CTA primaire du hero pointait vers `/solution` (page contenu),
pas vers `/demonstration` (formulaire lead). Un visiteur motivé au-dessus de la ligne
de flottaison ne trouvait pas directement le chemin de conversion.

### Fuites identifiées (P0 → corrigées)

| # | Localisation | Problème | Impact |
|---|-------------|---------|--------|
| 1 | Hero CTA primaire | `/solution` au lieu de `/demonstration` | Fort — CTA principal dévoyé |
| 2 | Trust strip | Dans `LazySection` → invisible sans scroll | Moyen — social proof retardé |
| 3 | Aucun trust badge hero | Pas de signal de réassurance sous les CTA | Moyen — friction de décision |
| 4 | Bouton vidéo sans aria-label | Inaccessible lecteurs d'écran | Faible — accessibilité |

---

## 5.2 Améliorations livrées (Sprint 5 — Chapitre 5 code)

### [B-01] CTA primaire hero → `/demonstration`

**Avant :** `"Découvrir nos solutions"` → `/solution`  
**Après :** `"Demander une démo"` → `/demonstration`

Le chemin de conversion le plus court (hero → formulaire démo) est maintenant
direct. Le contenu produit reste accessible via un bouton ghost `"Voir la solution"`.

### [B-02] Nouveau bouton ghost `/solution` dans hero

Les visiteurs en phase de découverte conservent un accès clair aux détails produit
sans que le CTA principal soit dilué.

### [B-03] Trust badge sous les CTA hero

Ajout d'une ligne de réassurance immédiate :
```
★ 4.8/5 satisfaction · +120 transporteurs · Opérationnel en 72h
```
Visible sans scroll, directement sous les boutons. Réduit la friction de décision
pour un visiteur qui hésite.

### [B-04] Trust strip sorti du `LazySection`

La section KPI (+120 transporteurs, 4.8/5, 98.7%, 72h) était rendue dans un
`LazySection` (IntersectionObserver, rootMargin 260px). Elle est maintenant
rendue directement comme `<section>` HTML avec une structure `<dl>` sémantique.

Impact :
- Visible sur les écrans hauts sans scroll
- Structure `<dl>/<dt>/<dd>` correcte pour le SEO et les lecteurs d'écran
- Suppression d'un IntersectionObserver inutile sur la section la plus légère de la page

### [B-05] Bouton vidéo hero : `aria-label` + icône SVG play

Le bouton "Voir la démo vidéo" disposait d'un `▶` unicode non accessible.
Remplacé par une icône SVG `aria-hidden` + `aria-label` explicite sur le bouton.

---

## 5.3 Backlog conversion Sprint 6

| Ticket | Description | Effort | Impact conv. |
|--------|-------------|--------|--------------|
| B-06 | A/B test : "Demander une démo" vs "Essayer gratuitement" | M | Fort |
| B-07 | Ajouter logo bar (partenaires / clients reconnus) au-dessus du fold | M | Fort |
| B-08 | Exit-intent ou scroll-triggered micro-CTA (sticky bar mobile) | L | Moyen |
| B-09 | Témoignage en hero ou en section dédiée avec photo | M | Fort |
| B-10 | Page `/demonstration` : pré-remplir email si passé en query param | S | Moyen |
| B-11 | Tracking click-through CTA hero avec `data-analytics` | S | Mesure |

---

## 5.4 Hypothèses A/B à tester (Sprint 6)

### Hypothèse 1 : texte CTA primaire
- **Contrôle** : "Demander une démo →"
- **Variante** : "Essayer gratuitement →"
- **Métrique** : taux de clic CTA hero + taux de remplissage formulaire `/demonstration`
- **Durée** : 2 semaines minimum (seuil statistique : 200 clics par variante)

### Hypothèse 2 : position trust strip
- **Contrôle** : trust strip après hero (position actuelle)
- **Variante** : trust strip intégrée dans le hero (sous les stats KPI flottantes)
- **Métrique** : scroll depth + taux de clic CTA

### Hypothèse 3 : bouton vidéo
- **Contrôle** : texte inline "Voir la démo vidéo"
- **Variante** : mini thumbnail vidéo cliquable (frame animée)
- **Métrique** : taux d'ouverture vidéo lightbox

---

## 5.5 Entonnoir cible après Sprint 6

```
Arrivée homepage
  ↓
Hero : CTA primaire "Demander une démo" + trust badge 4.8/5  [✅ corrigé]
  ↓
Trust strip immédiate : +120 transporteurs, 72h             [✅ corrigé]
  ↓
Pain section + Solution (lazy)
  ↓
Modules + ROI + Témoignage  [B-09]
  ↓
Logo bar clients  [B-07]
  ↓
Section CTA bottom + sticky bar mobile  [B-08]
  ↓
/demonstration → formulaire lead → email confirmation
```

---

## 5.6 KPI de sortie du chapitre 5

- Taux de clic CTA hero ≥ 3% (vs. < 1% estimé avant correction)
- Taux de remplissage formulaire `/demonstration` ≥ 15% des visiteurs CTA
- 0 régression sur le chemin `/solution` (visiteurs découverte)

→ Gate vers **Chapitre 6** : UX ERP par rôle

---

*Fin du Chapitre 5/13*
