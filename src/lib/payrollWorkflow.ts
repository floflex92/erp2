export type PayrollValidationLevel = 'exploitation' | 'direction'

export type PayrollValidationStep = {
  validatedAt: string
  validatedBy: string
}

export type PayrollValidationEntry = {
  exploitation?: PayrollValidationStep
  direction?: PayrollValidationStep
}

export type PayrollValidationState = Record<string, Record<string, PayrollValidationEntry>>

export type PayrollReleaseEntry = {
  fullyValidatedAt: string
  vaultAvailableAt: string | null
  paymentScheduledAt: string | null
  updatedAt: string
}

export type PayrollReleaseState = Record<string, PayrollReleaseEntry>

const PAYROLL_VALIDATION_STORAGE_KEY = 'nexora-payroll-validations-v1'
const PAYROLL_RELEASE_STORAGE_KEY = 'nexora-payroll-release-v1'

function dayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function clampDay(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(31, Math.max(1, Math.round(value)))
}

export function normalizePayrollDay(value: unknown, fallback: number) {
  return clampDay(typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10), fallback)
}

export function parsePayrollPeriodLabel(label: string) {
  const months: Record<string, number> = {
    janvier: 0,
    fevrier: 1,
    mars: 2,
    avril: 3,
    mai: 4,
    juin: 5,
    juillet: 6,
    aout: 7,
    septembre: 8,
    octobre: 9,
    novembre: 10,
    decembre: 11,
  }
  const normalized = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const parts = normalized.split(/\s+/)
  if (parts.length !== 2) return null
  const monthIndex = months[parts[0]]
  const year = Number.parseInt(parts[1], 10)
  if (monthIndex === undefined || Number.isNaN(year)) return null
  return { year, monthIndex }
}

function buildDate(year: number, monthIndex: number, day: number, hours = 0, minutes = 0, seconds = 0, milliseconds = 0) {
  const safeDay = Math.min(dayOfMonth(year, monthIndex), Math.max(1, day))
  return new Date(year, monthIndex, safeDay, hours, minutes, seconds, milliseconds)
}

export function buildPayrollPeriodSchedule(
  periodLabel: string,
  settings: {
    payrollValidationDeadlineDay: number
    payrollVaultReleaseDay: number
    payrollPaymentDay: number
  },
) {
  const parsed = parsePayrollPeriodLabel(periodLabel)
  if (!parsed) {
    return {
      validationDeadlineAt: null,
      vaultAvailableAt: null,
      paymentScheduledAt: null,
    }
  }

  const validationDeadlineAt = buildDate(
    parsed.year,
    parsed.monthIndex,
    normalizePayrollDay(settings.payrollValidationDeadlineDay, 28),
    23,
    59,
    59,
    999,
  )
  const vaultAvailableAt = buildDate(
    parsed.year,
    parsed.monthIndex + 1,
    normalizePayrollDay(settings.payrollVaultReleaseDay, 1),
    0,
    0,
    0,
    0,
  )
  const paymentScheduledAt = buildDate(
    parsed.year,
    parsed.monthIndex + 1,
    normalizePayrollDay(settings.payrollPaymentDay, 5),
    0,
    0,
    0,
    0,
  )

  return {
    validationDeadlineAt,
    vaultAvailableAt,
    paymentScheduledAt,
  }
}

export function formatPayrollWorkflowDate(value: string | Date | null) {
  if (!value) return 'Non defini'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Non defini'
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function normalizePayrollValidationState(raw: unknown): PayrollValidationState {
  if (!raw || typeof raw !== 'object') return {}

  const migrationStamp = new Date().toISOString()
  const migrated: PayrollValidationState = {}
  for (const [periodLabel, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      migrated[periodLabel] = value.reduce<Record<string, PayrollValidationEntry>>((acc, employeeId) => {
        if (typeof employeeId !== 'string' || !employeeId) return acc
        acc[employeeId] = {
          exploitation: { validatedAt: migrationStamp, validatedBy: 'Migration locale' },
          direction: { validatedAt: migrationStamp, validatedBy: 'Migration locale' },
        }
        return acc
      }, {})
      continue
    }

    if (!value || typeof value !== 'object') continue
    const normalizedByEmployee: Record<string, PayrollValidationEntry> = {}
    for (const [employeeId, entry] of Object.entries(value as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue
      const item = entry as Record<string, unknown>
      const exploitation = item.exploitation
      const direction = item.direction
      normalizedByEmployee[employeeId] = {
        exploitation: exploitation && typeof exploitation === 'object'
          ? {
              validatedAt: typeof (exploitation as { validatedAt?: unknown }).validatedAt === 'string'
                ? (exploitation as { validatedAt: string }).validatedAt
                : migrationStamp,
              validatedBy: typeof (exploitation as { validatedBy?: unknown }).validatedBy === 'string'
                ? (exploitation as { validatedBy: string }).validatedBy
                : 'Service exploitation',
            }
          : undefined,
        direction: direction && typeof direction === 'object'
          ? {
              validatedAt: typeof (direction as { validatedAt?: unknown }).validatedAt === 'string'
                ? (direction as { validatedAt: string }).validatedAt
                : migrationStamp,
              validatedBy: typeof (direction as { validatedBy?: unknown }).validatedBy === 'string'
                ? (direction as { validatedBy: string }).validatedBy
                : 'Direction',
            }
          : undefined,
      }
    }
    migrated[periodLabel] = normalizedByEmployee
  }
  return migrated
}

export function readPayrollValidationState() {
  try {
    return normalizePayrollValidationState(JSON.parse(window.localStorage.getItem(PAYROLL_VALIDATION_STORAGE_KEY) ?? '{}'))
  } catch {
    return {}
  }
}

export function writePayrollValidationState(state: PayrollValidationState) {
  window.localStorage.setItem(PAYROLL_VALIDATION_STORAGE_KEY, JSON.stringify(state))
}

export function readPayrollReleaseState() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(PAYROLL_RELEASE_STORAGE_KEY) ?? '{}') as unknown
    if (!raw || typeof raw !== 'object') return {} as PayrollReleaseState
    const normalized: PayrollReleaseState = {}
    for (const [periodLabel, entry] of Object.entries(raw as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue
      const item = entry as Record<string, unknown>
      if (typeof item.fullyValidatedAt !== 'string') continue
      normalized[periodLabel] = {
        fullyValidatedAt: item.fullyValidatedAt,
        vaultAvailableAt: typeof item.vaultAvailableAt === 'string' ? item.vaultAvailableAt : null,
        paymentScheduledAt: typeof item.paymentScheduledAt === 'string' ? item.paymentScheduledAt : null,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : item.fullyValidatedAt,
      }
    }
    return normalized
  } catch {
    return {} as PayrollReleaseState
  }
}

export function upsertPayrollRelease(periodLabel: string, entry: PayrollReleaseEntry | null) {
  const state = readPayrollReleaseState()
  if (!entry) {
    delete state[periodLabel]
  } else {
    state[periodLabel] = entry
  }
  window.localStorage.setItem(PAYROLL_RELEASE_STORAGE_KEY, JSON.stringify(state))
  return state
}

export function isPayrollReleased(periodLabel: string, availableAt: string | null, now = new Date()) {
  const release = readPayrollReleaseState()[periodLabel]
  if (!release?.fullyValidatedAt) return false
  if (!availableAt) return true
  const availableDate = new Date(availableAt)
  if (Number.isNaN(availableDate.getTime())) return false
  return availableDate.getTime() <= now.getTime()
}

export function extractPayrollPeriodLabel(tags: string[]) {
  return tags.find(tag => /\b20\d{2}\b/.test(tag)) ?? null
}
