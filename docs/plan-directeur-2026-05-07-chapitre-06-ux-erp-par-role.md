# Plan Directeur NEXORA 2026 — Chapitre 6/13
## UX ERP par rôle : cohérence des états de données

**Version :** 1.0  
**Date :** 2026-05-07  
**Statut :** Implémenté ✅

---

## 1. Objectif du chapitre

Uniformiser l'expérience utilisateur à travers tous les écrans ERP en remplaçant les états de données ad-hoc (texte "Chargement...", div centrée, cellule de tableau vide) par le composant `DataState` déjà présent dans la base de code. Cibler les pages utilisées quotidiennement par chaque rôle métier.

---

## 2. Parcours cibles par rôle

### 2.1 Exploitant (rôle quotidien le plus critique)
**Écrans principaux :** Transports, Planning, Dashboard "Exploitant"  
**Douleurs UX observées :**
- Temps de chargement des OT non indiqué visuellement
- Liste vide indiscernable d'un résultat filtré vide
- Aucune suggestion d'action quand la liste est réellement vide

**KPI cible :** < 2 clics pour créer un OT depuis l'état vide "Aucun transport"

### 2.2 Dirigeant
**Écrans principaux :** Dashboard "Dirigeant", Facturation, Rapports  
**Douleurs UX observées :**
- Facturation : "Chargement..." texte brut — aucun squelette
- Tableaux financiers : état vide sans contexte ni action
- Comptabin non guidé quand aucune facture

**KPI cible :** Temps d'identification de la situation financière < 10 s

### 2.3 Mécanicien / Flotte
**Écrans principaux :** Véhicules, Maintenance, ParcVehicules  
**Douleurs UX observées :**
- Véhicules.tsx : état loading = `"Chargement..."` brut, état vide = `"Aucun vehicule enregistre"`
- Aucune indication du nombre de véhicules attendus pendant le chargement

**KPI cible :** Reconnaissance immédiate de l'état de la flotte (< 1 s visuellement)

### 2.4 Commercial
**Écrans principaux :** Clients, Pipeline, Carte  
**Douleurs UX observées :**
- États vides non exploités pour guider la prospection

### 2.5 Conducteur / Affreteur
**Écrans principaux :** Planning conducteur, Bourse d'affrètement  
**Douleurs UX observées :**
- Interface mobile non optimisée pour les états de chargement

---

## 3. Audit des états de données — avant/après

### Pages ciblées ce chapitre

| Page | État avant | État après |
|------|-----------|-----------|
| `Vehicules.tsx` | `"Chargement..."` texte brut + `"Aucun vehicule enregistre"` | `DataState.Loading` + `SkeletonTable` + `DataState.Empty` |
| `Facturation.tsx` (onglet Factures) | `"Chargement..."` texte brut + `"Aucune facture enregistrée"` | `DataState.Loading` + `SkeletonTable` + `DataState.Empty` |
| `Facturation.tsx` (onglet Fournisseurs) | `"Chargement..."` texte brut + `"Aucune facture fournisseur"` | `DataState.Loading` + `SkeletonTable` + `DataState.Empty` |

### Pages déjà conformes (non modifiées)
- `Chauffeurs.tsx` — `DataState` + `SkeletonTable` déjà en place ✅
- `Dashboard.tsx` — `Suspense` avec fallback skeleton par widget ✅

---

## 4. Composants utilisés

### `DataState` (existant, `src/components/ui/DataState.tsx`)

```tsx
// Chargement avec skeleton
if (loading) return (
  <DataState.Loading>
    <SkeletonTable cols={6} rows={7} />
  </DataState.Loading>
)

// État vide avec label contextuel
if (filtered.length === 0) return (
  <DataState.Empty
    label="Aucun véhicule enregistré"
    sublabel="Ajoutez votre premier véhicule pour démarrer le suivi de flotte."
  />
)
```

### `SkeletonTable` (existant, `src/components/ui/SkeletonTable.tsx`)
Paramètres utilisés :
- `cols` : correspond au nombre de colonnes du tableau cible
- `rows` : 7 par défaut (bonne approximation)
- `colWidths` : optionnel pour matcher les proportions réelles

---

## 5. KPIs de qualité UX

| Indicateur | Avant | Cible |
|-----------|-------|-------|
| Pages avec état loading cohérent | ~30% | 100% |
| Pages avec état vide avec message contextuel | ~40% | 100% |
| Pages avec état empty + action CTA | ~5% | 50% (pages clés) |
| Cohérence visuelle entre écrans (même composants) | Partielle | Totale |

---

## 6. Backlog UX ERP — suite

### Court terme (ch. 6 livré)
- ✅ `Vehicules.tsx` — Loading + Empty via DataState
- ✅ `Facturation.tsx` — Loading + Empty (factures client + fournisseur) via DataState

### Moyen terme (ch. 7-8)
- `Remorques.tsx` — même traitement que Vehicules
- `Maintenance.tsx` — états loading/empty pour les fiches d'entretien
- `Clients.tsx` — état empty avec CTA "Créer premier client"
- `PlanningUnifie.tsx` — skeleton planning (ligne par ligne)

### Long terme (ch. 9-13)
- Mobile-first pour rôle conducteur (états condensés, swipe)
- Skeleton adaptatif selon la taille de l'écran
- Offline state (quand Supabase ne répond pas)

---

## 7. Code changes livrés

### `src/pages/Vehicules.tsx`
- Ajout imports : `DataState` + `SkeletonTable`
- Remplacement `loading ? <div>Chargement...</div>` → `DataState.Loading` + `SkeletonTable cols={6} rows={7}`
- Remplacement `filtered.length === 0 ? <div>Aucun vehicule</div>` → `DataState.Empty` avec sublabel contextuel

### `src/pages/Facturation.tsx`
- Ajout imports : `DataState` + `SkeletonTable`
- Remplacement ×2 (onglet factures client + onglet fournisseurs) des états ad-hoc

---

## 8. Critères de succès

- [ ] Zéro erreur TypeScript après modification
- [ ] Skeleton visible avant le premier rendu des données
- [ ] Message d'état vide différencié entre "aucune donnée" et "aucun résultat de filtre"
- [ ] `DataState.Empty` utilisé dans ≥ 3 pages ERP en tout (Chauffeurs + Vehicules + Facturation)
