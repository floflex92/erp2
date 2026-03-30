const STORAGE_KEY = 'nexora-demo-local-db-v1'
const EVENT_NAME = 'nexora-demo-local-db-updated'

type DemoRow = Record<string, unknown>
type DemoTable = DemoRow[]
type DemoDbState = Record<string, DemoTable>

export type DemoFilter =
  | { op: 'eq'; column: string; value: unknown }
  | { op: 'neq'; column: string; value: unknown }
  | { op: 'is'; column: string; value: unknown }
  | { op: 'in'; column: string; value: unknown[] }
  | { op: 'like'; column: string; value: string }

export type DemoOrder = {
  column: string
  ascending: boolean
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function readState(): DemoDbState {
  if (!isBrowser()) return {}
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as DemoDbState
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

function writeState(state: DemoDbState) {
  if (!isBrowser()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function toRegexFromLike(pattern: string) {
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.')
  return new RegExp(`^${escaped}$`, 'i')
}

function rowMatchesFilter(row: DemoRow, filter: DemoFilter) {
  const value = row[filter.column]
  if (filter.op === 'eq') return value === filter.value
  if (filter.op === 'neq') return value !== filter.value
  if (filter.op === 'is') return value === filter.value
  if (filter.op === 'in') return Array.isArray(filter.value) && filter.value.includes(value)
  if (filter.op === 'like') return toRegexFromLike(filter.value).test(safeString(value))
  return true
}

function applyFilters(rows: DemoRow[], filters: DemoFilter[]) {
  if (filters.length === 0) return rows
  return rows.filter(row => filters.every(filter => rowMatchesFilter(row, filter)))
}

function compareValues(left: unknown, right: unknown) {
  if (left == null && right == null) return 0
  if (left == null) return -1
  if (right == null) return 1
  if (typeof left === 'number' && typeof right === 'number') return left - right
  const leftString = safeString(left).toLowerCase()
  const rightString = safeString(right).toLowerCase()
  if (leftString < rightString) return -1
  if (leftString > rightString) return 1
  return 0
}

function applyOrders(rows: DemoRow[], orders: DemoOrder[]) {
  if (orders.length === 0) return rows
  return [...rows].sort((a, b) => {
    for (const order of orders) {
      const compared = compareValues(a[order.column], b[order.column])
      if (compared !== 0) return order.ascending ? compared : -compared
    }
    return 0
  })
}

function ensureRowId(table: string, row: DemoRow) {
  if (typeof row.id === 'string' && row.id.length > 0) return row
  const generatedId = `${table}-local-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`
  return { ...row, id: generatedId }
}

// Track rows that were modified locally and must override remote data on read
const DIRTY_STORAGE_KEY = 'nexora-demo-dirty-ids'

function readDirtyIds(): Record<string, Set<string>> {
  if (!isBrowser()) return {}
  const raw = window.localStorage.getItem(DIRTY_STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, string[]>
    const result: Record<string, Set<string>> = {}
    for (const [table, ids] of Object.entries(parsed)) {
      if (Array.isArray(ids)) result[table] = new Set(ids)
    }
    return result
  } catch { return {} }
}

function writeDirtyIds(dirty: Record<string, Set<string>>) {
  if (!isBrowser()) return
  const serializable: Record<string, string[]> = {}
  for (const [table, ids] of Object.entries(dirty)) {
    serializable[table] = [...ids]
  }
  window.localStorage.setItem(DIRTY_STORAGE_KEY, JSON.stringify(serializable))
}

export function markDirtyIds(table: string, ids: string[]) {
  const dirty = readDirtyIds()
  if (!dirty[table]) dirty[table] = new Set()
  for (const id of ids) dirty[table].add(id)
  writeDirtyIds(dirty)
}

export function getDirtyIds(table: string): Set<string> {
  return readDirtyIds()[table] ?? new Set()
}

export function hasDemoLocalData(table: string) {
  const state = readState()
  return Array.isArray(state[table]) && state[table].length > 0
}

export function getDemoLocalTable<T extends DemoRow = DemoRow>(table: string): T[] {
  const state = readState()
  return deepClone((state[table] ?? []) as T[])
}

export function replaceDemoLocalTables(tables: Record<string, DemoRow[]>) {
  const state = readState()
  const nextState: DemoDbState = { ...state }
  for (const [table, rows] of Object.entries(tables)) {
    nextState[table] = deepClone(rows).map(row => ensureRowId(table, row))
  }
  writeState(nextState)
}

export function queryDemoLocalTable<T extends DemoRow = DemoRow>(params: {
  table: string
  filters?: DemoFilter[]
  orders?: DemoOrder[]
  limit?: number | null
}): T[] {
  const rows = getDemoLocalTable<T>(params.table)
  const filtered = applyFilters(rows, params.filters ?? [])
  const ordered = applyOrders(filtered, params.orders ?? []) as T[]
  if (typeof params.limit === 'number' && params.limit >= 0) {
    return ordered.slice(0, params.limit) as T[]
  }
  return ordered
}

export function insertDemoLocalRows(table: string, payload: DemoRow | DemoRow[]) {
  const rows = Array.isArray(payload) ? payload : [payload]
  const state = readState()
  const existing = Array.isArray(state[table]) ? state[table] : []
  const inserted = rows.map(row => ensureRowId(table, deepClone(row)))
  state[table] = [...existing, ...inserted]
  writeState(state)
  return inserted
}

export function upsertDemoLocalRows(table: string, payload: DemoRow | DemoRow[], onConflict = 'id') {
  const rows = Array.isArray(payload) ? payload : [payload]
  const state = readState()
  const existing = Array.isArray(state[table]) ? deepClone(state[table]) : []
  const insertedOrUpdated: DemoRow[] = []

  for (const sourceRow of rows) {
    const row = ensureRowId(table, deepClone(sourceRow))
    const conflictValue = row[onConflict]
    const index = existing.findIndex(current => current[onConflict] === conflictValue)
    if (index >= 0) {
      existing[index] = { ...existing[index], ...row }
      insertedOrUpdated.push(existing[index])
    } else {
      existing.push(row)
      insertedOrUpdated.push(row)
    }
  }

  state[table] = existing
  writeState(state)
  return insertedOrUpdated
}

export function updateDemoLocalRows(table: string, patch: DemoRow, filters: DemoFilter[]) {
  const state = readState()
  const existing = Array.isArray(state[table]) ? deepClone(state[table]) : []
  const updated: DemoRow[] = []
  state[table] = existing.map(row => {
    if (!filters.every(filter => rowMatchesFilter(row, filter))) return row
    const merged = { ...row, ...patch }
    updated.push(merged)
    return merged
  })
  writeState(state)
  // Track updated IDs so reads merge local patches over remote
  const dirtyIds = updated.map(r => r.id).filter((id): id is string => typeof id === 'string')
  if (dirtyIds.length > 0) markDirtyIds(table, dirtyIds)
  return updated
}

export function deleteDemoLocalRows(table: string, filters: DemoFilter[]) {
  const state = readState()
  const existing = Array.isArray(state[table]) ? deepClone(state[table]) : []
  const deleted: DemoRow[] = []
  state[table] = existing.filter(row => {
    const matches = filters.every(filter => rowMatchesFilter(row, filter))
    if (matches) deleted.push(row)
    return !matches
  })
  writeState(state)
  return deleted
}

export function subscribeDemoLocalStore(listener: () => void) {
  if (!isBrowser()) return () => {}
  const handler = () => listener()
  window.addEventListener(EVENT_NAME, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT_NAME, handler)
    window.removeEventListener('storage', handler)
  }
}
