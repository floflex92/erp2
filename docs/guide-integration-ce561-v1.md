# Guide d'intégration CE 561/2006 - V1.0

## 📋 Résumé

Implémentation du moteur de validation CE 561/2006 pour ERP2. Le système valide automatiquement chaque affectation de conducteur au planning en vérifiant les règles de régulation (conduite, repos, pausesetc).

## 🏗️ Architecture mise en place

### Tables Supabase (5 nouvelles)

```sql
-- Paramètres des règles (configurable par admin)
parametre_regle (code_regle, libelle, valeur, unite, type_controle)
  → Contient tous les seuils CE 561 (conduite continue, journalière, hebdo, repos, etc.)

-- Agrégats conducteur/jour (calculé depuis tachygraphe + planning)
journee_travail (conducteur_id, jour, minutes_conduite, minutes_travail, minutes_repos, nb_missions)
  → Mis à jour après chaque assignation

-- Matrice distance/durée
matrice_temps (site_origine_id, site_destination_id, distance_km, duree_minutes)
  → Pour pré-calculs planning (optionnel pour v1)

-- Indisponibilités (maintenance, absences non-RH)
indisponibilite_planning (type_ressource, ressource_id, type_indisponibilite, date_debut, date_fin)
  → Bloque le drag-drop en Planning si indisponible

-- Infractions tracées
infraction_tachy (conducteur_id, ot_id, date_infraction, code_infraction, ..., etat)
  → Archive les infractions forçées ou bloquées
```

### Modules TypeScript

1. **ce561Validation.ts** — Moteur central
   - `CE561ValidationService`: validation d'une affectation
   - `validatePlanningDropAudit()`: fonction legacy (compatible)
   - Règles: conduite continue, journalière, hebdo, repos, jours consécutifs, documents

2. **journeeTravail.ts** — Agrégation données
   - `JourneeTravailService`: recalcul journée conducteur/jour
   - Agrège tachygraphe + planning OT
   - Utilitaires: historique 7j, totaux glissants, repos min hebdo

3. **planningCompliance.ts** — Façade Planning
   - `PlanningComplianceService`: API simple pour Planning
   - `validateAndAssignMission()`: validation + assignation + transaction
   - `getCompteursCE()`: compteurs temps réel (pour affichage)
   - `recordInfraction()`: trace infractions forçées

### Composants React

- **ComplianceAlertModal.tsx**: Modal affichant infractions bloquantes + avertissements
- **ComplianceCountersBar.tsx**: Barre supérieure affichant compteurs CE en temps réel

### Hooks personnalisés

- `usePlanningCompliance()`: accès service
- `useValidateAndAssign()`: validation+assignation
- `usePrevalidateDropOver()`: pré-validation drag-over
- `useCECounters()`: compteurs temps réel
- `useConducteurIndisponibilites()`: indisponibilités du jour

## 🔌 Intégration Planning (Exemples)

### 1. Ajouter modal alertes au onDrop

```typescript
// Dans Planning.tsx onRowDrop
const [complianceModal, setComplianceModal] = useState<{
  visible: boolean
  alerts: CEAlert[]
  pendingAssignment?: InputAssignment
}>(null)

async function onRowDrop(e: React.DragEvent, rowId: string) {
  // ... logique existante ...
  
  if (activeDrag.ot) {
    const auditResult = await validatePlanningDropAudit({
      otId: activeDrag.ot.id,
      conducteurId: targetConducteurId,
      startISO: startISO,
      endISO: endISO,
    })
    
    if (auditResult.alerts.some(a => a.type === 'bloquant')) {
      // Afficher modal avec option forçage
      setComplianceModal({
        visible: true,
        alerts: auditResult.alerts,
        pendingAssignment: { ot: activeDrag.ot, rowId, forced: false }
      })
      setDrag(null)
      return
    }
  }
  
  // Sinon, assignation normale
  await assignCourseToResourceWithoutTimelineMove(activeDrag.ot, rowId)
}

// Rendu du modal
{complianceModal.visible && (
  <ComplianceAlertModal
    visible={true}
    alerts={complianceModal.alerts}
    onCancel={() => setComplianceModal({ visible: false, alerts: [] })}
    onConfirm={(forced) => {
      if (complianceModal.pendingAssignment) {
        const { ot, rowId } = complianceModal.pendingAssignment
        // Re-assigner avec force=true si cochéé
        handleForcedAssignment(ot, rowId, forced)
      }
      setComplianceModal({ visible: false, alerts: [] })
    }}
  />
)}
```

### 2. Ajouter compteurs CE en haut

```typescript
<ComplianceCountersBar
  conducteurId={selectedConducteur?.id ?? null}
  date={new Date(selectedDay)}
  service={complianceService}
/>
```

### 3. Enregistrer infractions (optionnel)

```typescript
// Après forçage
if (forced) {
  const blockinAlerts = auditResult.alerts.filter(a => a.type === 'bloquant')
  for (const alert of blockingAlerts) {
    await complianceService.recordInfraction({
      conducteur_id: targetConducteurId,
      ot_id: activeDrag.ot.id,
      date_infraction: startISO.split('T')[0],
      code_infraction: alert.code,
      libelle_infraction: alert.message,
      type_infraction: alert.code.split('_')[0].toLowerCase(),
      valeur_mesuree: 0, // À enrichir
      seuil_reglementaire: 0, // À enrichir
      severite: 'normale',
    })
  }
}
```

## ⚙️ Configuration (Admin)

Tableau paramètres_regle dans Supabase:

| code_regle | libelle | valeur | unite | type_controle |
|---|---|---|---|---|
| CONDUITE_CONTINUE_MAX | Conduite continue max | 270 | minutes | bloquant |
| PAUSE_APRES_CONDUITE | Pause obligatoire apres 4h30 | 45 | minutes | bloquant |
| CONDUITE_JOUR_MAX | Conduite journaliere max | 540 | minutes | bloquant |
| CONDUITE_JOUR_ETENDU | Conduite journaliere etendue | 600 | minutes | avertissement |
| ... | ... | ... | ... | ... |

## 🧪 Tests

### Cas de test CE 561:

1. **Conduite continue > 4h30** → ❌ Bloqué
2. **Conduite journalière > 10h** → ⚠️ Avertissement
3. **Repos journalier < 9h** → ⚠️ Avertissement
4. **Permis expiré** → ❌ Bloqué
5. **FCO expiré** → ❌ Bloqué
6. **Chevauchement missions** → ❌ Bloqué
7. **Conduite hebdo > 56h** → ❌ Bloqué
8. **Jours consécutifs > 6** → ❌ Bloqué
9. **Forçage avec max 3 infractions** → ✅ Autorisé

### Commande test:

```bash
# Dans Planning, assigner mission >4h30 continue → Modal affichée
# Cocher "Forcer" → Assignation enregistrée + infraction_tachy créée
```

## 📊 Affichage temps réel

La barre ComplianceCountersBar affiche:
- 🕐 Conduite aujourd'hui / semaine / 14j
- 😴 Repos minimum hebdomadaire
- 📅 Jours consécutifs travaillés
- 🟢 Normal / 🟡 Avertissement / 🔴 Critique

Couleurs changent dynamiquement (refresh chaque changement conducteur/date).

## 🚀 Phases futures

**Phase 2**: Intégration données réelles tachygraphe
- Lire `tachygraphe_entrees` en temps réel
- Recalcul journée_travail automatique via trigger DB

**Phase 3**: Admin UI paramètres règles
- Écran édition seuils CE 561
- Activation/désactivation règles par client

**Phase 4**: Rapports & audit
- Export infractions tracées
- Dashboard compliance hebdo

## 🔗 Références

- [Réglement CE 561/2006](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=celex:32006R0561)
- [Code route transport: sections conduite](https://www.legifrance.gouv.fr/codes/article_L3211-8)
- [Tachygraphe numérique](https://transport.ec.europa.eu/modes-transport/road-transport/digital-tachograph_en)
