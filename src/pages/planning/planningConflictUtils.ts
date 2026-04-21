import type { OT, RowConflict } from './planningTypes'
import { isoToDate, toTimeValue } from './planningUtils'

const MIN_SLOT_MS = 15 * 60 * 1000

export type OtSegment = {
  ot: OT
  start: number
  end: number
}

export function getOtInterval(ot: OT): { start: number; end: number } {
  const fallbackStart = isoToDate(ot.date_chargement_prevue)
  const fallbackEnd = isoToDate(ot.date_livraison_prevue ?? ot.date_chargement_prevue)
  const start = toTimeValue(ot.date_chargement_prevue, fallbackStart)
  const endRaw = toTimeValue(ot.date_livraison_prevue ?? ot.date_chargement_prevue, fallbackEnd)
  const end = Math.max(endRaw, start + MIN_SLOT_MS)
  return { start, end }
}

export function findOverlapTargetInRow(
  rowOts: OT[],
  startISO: string,
  endISO: string,
  movingOtIds: string[],
): OT | null {
  const start = new Date(startISO).getTime()
  const end = Math.max(start + MIN_SLOT_MS, new Date(endISO).getTime())

  for (const item of rowOts) {
    if (movingOtIds.includes(item.id)) continue
    const interval = getOtInterval(item)
    if (Math.min(end, interval.end) > Math.max(start, interval.start)) {
      return item
    }
  }

  return null
}

export function buildRowConflicts(rowOts: OT[], viewStart: number, viewEnd: number): RowConflict[] {
  const segments: OtSegment[] = rowOts
    .map(ot => ({ ot, ...getOtInterval(ot) }))
    .filter(seg => seg.end >= viewStart && seg.start <= viewEnd)
    .sort((a, b) => a.start - b.start)

  const conflicts: RowConflict[] = []

  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      if (segments[j].start >= segments[i].end) break
      if (segments[i].ot.mission_id && segments[i].ot.mission_id === segments[j].ot.mission_id) continue
      const overlapMs = Math.max(0, Math.min(segments[i].end, segments[j].end) - Math.max(segments[i].start, segments[j].start))
      if (overlapMs <= 0) continue
      conflicts.push({
        first: segments[i].ot,
        second: segments[j].ot,
        overlapMinutes: Math.round(overlapMs / 60000),
      })
    }
  }

  return conflicts
}
