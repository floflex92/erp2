import type { AssignForm } from './planningTypes'
import { parseDay, toISO } from './planningUtils'

export type AssignScheduleMeta = {
  durationMinutes: number
  valid: boolean
}

export function parseAssignDateTime(dateValue: string, timeValue: string): Date | null {
  if (!dateValue) return null
  const date = parseDay(dateValue)
  const [hourToken = '0', minuteToken = '0'] = (timeValue || '00:00').split(':')
  const hours = Number(hourToken)
  const minutes = Number(minuteToken)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  date.setHours(hours, minutes, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

export function toTimeHHmm(value: Date): string {
  const hh = String(value.getHours()).padStart(2, '0')
  const mm = String(value.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function getAssignScheduleMeta(assign: AssignForm | null): AssignScheduleMeta {
  if (!assign) return { durationMinutes: 0, valid: false }
  const start = parseAssignDateTime(assign.date_chargement, assign.time_chargement)
  const end = parseAssignDateTime(assign.date_livraison, assign.time_livraison)
  if (!start || !end) return { durationMinutes: 0, valid: false }
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000)
  return { durationMinutes, valid: durationMinutes > 0 }
}

export function formatAssignDurationLabel(durationMinutes: number): string {
  const total = Math.max(0, durationMinutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h > 0 && m > 0) return `${h}h ${String(m).padStart(2, '0')}`
  if (h > 0) return `${h}h`
  return `${m} min`
}

export function updateAssignStartKeepingDuration(
  current: AssignForm,
  nextDate: string,
  nextTime: string,
  keepDuration: boolean,
): AssignForm {
  const next: AssignForm = { ...current, date_chargement: nextDate, time_chargement: nextTime }
  if (!keepDuration) return next

  const prevStart = parseAssignDateTime(current.date_chargement, current.time_chargement)
  const prevEnd = parseAssignDateTime(current.date_livraison, current.time_livraison)
  const newStart = parseAssignDateTime(nextDate, nextTime)
  if (!prevStart || !prevEnd || !newStart) return next

  const durationMinutes = Math.round((prevEnd.getTime() - prevStart.getTime()) / 60000)
  if (durationMinutes <= 0) return next

  const newEnd = new Date(newStart.getTime() + durationMinutes * 60000)
  return {
    ...next,
    date_livraison: toISO(newEnd),
    time_livraison: toTimeHHmm(newEnd),
  }
}

export function shiftAssignStartKeepingDuration(
  current: AssignForm,
  deltaMinutes: number,
  keepDuration: boolean,
): AssignForm {
  const start = parseAssignDateTime(current.date_chargement, current.time_chargement)
  if (!start) return current

  const shiftedStart = new Date(start.getTime() + deltaMinutes * 60000)
  const next: AssignForm = {
    ...current,
    date_chargement: toISO(shiftedStart),
    time_chargement: toTimeHHmm(shiftedStart),
  }

  if (!keepDuration) return next

  const end = parseAssignDateTime(current.date_livraison, current.time_livraison)
  if (!end) return next

  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000)
  if (durationMinutes <= 0) return next

  const shiftedEnd = new Date(shiftedStart.getTime() + durationMinutes * 60000)
  return {
    ...next,
    date_livraison: toISO(shiftedEnd),
    time_livraison: toTimeHHmm(shiftedEnd),
  }
}

export function applyAssignDurationFromStart(current: AssignForm, durationMinutes: number): AssignForm {
  if (durationMinutes <= 0) return current

  const start = parseAssignDateTime(current.date_chargement, current.time_chargement)
  if (!start) return current

  const nextEnd = new Date(start.getTime() + durationMinutes * 60000)
  return {
    ...current,
    date_livraison: toISO(nextEnd),
    time_livraison: toTimeHHmm(nextEnd),
  }
}
