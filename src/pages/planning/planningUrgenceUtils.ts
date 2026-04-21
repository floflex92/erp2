import type { OT, PlanningUrgence } from './planningTypes'

export type ConflictPair = {
  overlapMinutes: number
}

export type ConflictSummary = {
  rowId: string
  rowLabel: string
  pairs: ConflictPair[]
}

const DAY_MS = 24 * 60 * 60 * 1000

export function buildPlanningUrgences(input: {
  nowTs: number
  ganttOTs: OT[]
  unresourced: OT[]
  conflicts: ConflictSummary[]
  formatMinutes: (minutes: number) => string
  limit?: number
}): PlanningUrgence[] {
  const { nowTs, ganttOTs, unresourced, conflicts, formatMinutes } = input
  const limit = input.limit ?? 40
  const in24h = nowTs + DAY_MS
  const urgences: PlanningUrgence[] = []

  for (const ot of ganttOTs) {
    const endTs = new Date(ot.date_livraison_prevue ?? ot.date_chargement_prevue ?? 0).getTime()
    if (!Number.isFinite(endTs)) continue
    if (ot.statut !== 'facture' && endTs < nowTs) {
      const minutesLate = Math.max(0, Math.round((nowTs - endTs) / 60000))
      urgences.push({
        id: `late-${ot.id}`,
        level: minutesLate >= 180 ? 'critique' : 'haute',
        source: 'retard',
        label: ot.reference,
        detail: `Retard livraison ${formatMinutes(minutesLate)}`,
        otId: ot.id,
        score: 200 + Math.min(minutesLate, 600),
      })
    }
  }

  for (const ot of unresourced) {
    const startTs = new Date(ot.date_chargement_prevue ?? ot.date_livraison_prevue ?? 0).getTime()
    if (!Number.isFinite(startTs)) continue
    if (startTs >= nowTs && startTs <= in24h) {
      const minutesToStart = Math.max(0, Math.round((startTs - nowTs) / 60000))
      urgences.push({
        id: `unresourced-${ot.id}`,
        level: minutesToStart <= 240 ? 'critique' : 'haute',
        source: 'non_affectee',
        label: ot.reference,
        detail: `Depart dans ${formatMinutes(minutesToStart)} sans ressource`,
        otId: ot.id,
        score: 180 + Math.max(0, 300 - minutesToStart),
      })
    }
  }

  for (const conflict of conflicts) {
    const overlap = conflict.pairs.reduce((sum, pair) => sum + pair.overlapMinutes, 0)
    if (overlap <= 0) continue
    urgences.push({
      id: `conflict-${conflict.rowId}`,
      level: overlap >= 120 ? 'critique' : 'moyenne',
      source: 'conflit',
      label: conflict.rowLabel,
      detail: `${conflict.pairs.length} conflit(s), chevauchement cumule ${formatMinutes(overlap)}`,
      rowId: conflict.rowId,
      score: 120 + overlap,
    })
  }

  return urgences
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
}
