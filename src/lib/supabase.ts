import { createClient } from '@supabase/supabase-js'
import type { Database as BaseDatabase } from './database.types'
import {
  deleteDemoLocalRows,
  getDirtyIds,
  hasDemoLocalData,
  insertDemoLocalRows,
  queryDemoLocalTable,
  type DemoFilter,
  type DemoOrder,
  updateDemoLocalRows,
  upsertDemoLocalRows,
} from './demoLocalStore'

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type ExtraPublicTables = {
  prospects: {
    Row: {
      id: string
      created_at: string
      updated_at: string
      nom_entreprise: string
      statut: string
      montant_mensuel_estime: number | null
      commercial_nom: string | null
      secteur: string | null
      type_transport: string | null
    }
    Insert: {
      id?: string
      created_at?: string
      updated_at?: string
      nom_entreprise: string
      statut?: string
      montant_mensuel_estime?: number | null
      commercial_nom?: string | null
      secteur?: string | null
      type_transport?: string | null
    }
    Update: {
      id?: string
      created_at?: string
      updated_at?: string
      nom_entreprise?: string
      statut?: string
      montant_mensuel_estime?: number | null
      commercial_nom?: string | null
      secteur?: string | null
      type_transport?: string | null
    }
    Relationships: []
  }
  config_entreprise: {
    Row: {
      cle: string
      valeur: Json | null
    }
    Insert: {
      cle: string
      valeur?: Json | null
    }
    Update: {
      cle?: string
      valeur?: Json | null
    }
    Relationships: []
  }
  rapports_conducteurs: {
    Row: {
      id: string
      conducteur_id: string
      type: 'releve_infraction' | 'attestation_activite'
      periode_debut: string
      periode_fin: string
      periode_label: string
      contenu: Json
      statut: 'genere' | 'envoye' | 'signe'
      envoye_at: string | null
      created_at: string
    }
    Insert: {
      id?: string
      conducteur_id: string
      type: 'releve_infraction' | 'attestation_activite'
      periode_debut: string
      periode_fin: string
      periode_label: string
      contenu: Json
      statut?: 'genere' | 'envoye' | 'signe'
      envoye_at?: string | null
      created_at?: string
    }
    Update: {
      id?: string
      conducteur_id?: string
      type?: 'releve_infraction' | 'attestation_activite'
      periode_debut?: string
      periode_fin?: string
      periode_label?: string
      contenu?: Json
      statut?: 'genere' | 'envoye' | 'signe'
      envoye_at?: string | null
      created_at?: string
    }
    Relationships: [
      {
        foreignKeyName: 'rapports_conducteurs_conducteur_id_fkey'
        columns: ['conducteur_id']
        isOneToOne: false
        referencedRelation: 'conducteurs'
        referencedColumns: ['id']
      },
    ]
  }
}

type AppDatabase = Omit<BaseDatabase, 'public'> & {
  public: Omit<BaseDatabase['public'], 'Tables'> & {
    Tables: BaseDatabase['public']['Tables'] & ExtraPublicTables
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

const DEMO_FALLBACK_TABLES = new Set([
  'clients',
  'contacts',
  'adresses',
  'conducteurs',
  'vehicules',
  'remorques',
  'affectations',
  'ordres_transport',
  'etapes_mission',
  'factures',
  'historique_statuts',
  'conducteur_evenements_rh',
  'vehicule_releves_km',
  'flotte_entretiens',
  'flotte_equipements',
])

type QueryAction = 'none' | 'select' | 'insert' | 'upsert' | 'update' | 'delete'

function isWriteAction(action: QueryAction) {
  return action === 'insert' || action === 'upsert' || action === 'update' || action === 'delete'
}

type RemoteResponse = Record<string, unknown> & {
  data?: unknown
  error?: { message?: string } | null
  count?: number | null
  status?: number
  statusText?: string
}

type QueryLike = PromiseLike<RemoteResponse> & Record<string, unknown>

type DemoAwareBaseClient = {
  from: (table: string) => QueryLike
} & Record<string, unknown>

function isPermissionError(message: string | null | undefined) {
  const normalized = (message ?? '').toLowerCase()
  return normalized.includes('row-level security')
    || normalized.includes('permission denied')
    || normalized.includes('forbidden')
    || normalized.includes('insufficient privilege')
}

function extractFirstConflictColumn(onConflict: unknown) {
  if (typeof onConflict !== 'string' || onConflict.trim().length === 0) return 'id'
  return onConflict.split(',')[0]?.trim() || 'id'
}

function isLocalFallbackEnabled() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname.toLowerCase()
  return host === 'localhost' || host === '127.0.0.1'
}

class DemoAwareQueryBuilder {
  private readonly table: string
  private action: QueryAction = 'none'
  private filters: DemoFilter[] = []
  private orders: DemoOrder[] = []
  private limitValue: number | null = null
  private expectSingle: 'none' | 'single' | 'maybeSingle' = 'none'
  private selectOptions: Record<string, unknown> | null = null
  private insertPayload: Record<string, unknown> | Record<string, unknown>[] | null = null
  private upsertPayload: Record<string, unknown> | Record<string, unknown>[] | null = null
  private upsertConflict = 'id'
  private updatePatch: Record<string, unknown> = {}
  private query: QueryLike

  constructor(table: string, query: QueryLike) {
    this.table = table
    this.query = query
  }

  private applyMethod(name: string, args: unknown[]) {
    const maybeMethod = this.query?.[name]
    if (typeof maybeMethod === 'function') {
      this.query = (maybeMethod as (...params: unknown[]) => QueryLike).apply(this.query, args)
    }
    return this
  }

  select(columns?: string, options?: Record<string, unknown>) {
    // Keep write action when select() is used as a returning clause after update/insert/upsert/delete.
    if (!isWriteAction(this.action)) this.action = 'select'
    this.selectOptions = options ?? null
    return this.applyMethod('select', [columns ?? '*', options])
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[], options?: Record<string, unknown>) {
    this.action = 'insert'
    this.insertPayload = payload
    return this.applyMethod('insert', [payload, options])
  }

  upsert(payload: Record<string, unknown> | Record<string, unknown>[], options?: Record<string, unknown>) {
    this.action = 'upsert'
    this.upsertPayload = payload
    this.upsertConflict = extractFirstConflictColumn(options?.onConflict)
    return this.applyMethod('upsert', [payload, options])
  }

  update(patch: Record<string, unknown>) {
    this.action = 'update'
    this.updatePatch = patch
    return this.applyMethod('update', [patch])
  }

  delete() {
    this.action = 'delete'
    return this.applyMethod('delete', [])
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: 'eq', column, value })
    return this.applyMethod('eq', [column, value])
  }

  neq(column: string, value: unknown) {
    this.filters.push({ op: 'neq', column, value })
    return this.applyMethod('neq', [column, value])
  }

  is(column: string, value: unknown) {
    this.filters.push({ op: 'is', column, value })
    return this.applyMethod('is', [column, value])
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ op: 'in', column, value: values })
    return this.applyMethod('in', [column, values])
  }

  like(column: string, value: string) {
    this.filters.push({ op: 'like', column, value })
    return this.applyMethod('like', [column, value])
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({
      column,
      ascending: options?.ascending !== false,
    })
    return this.applyMethod('order', [column, options])
  }

  limit(value: number) {
    this.limitValue = value
    return this.applyMethod('limit', [value])
  }

  single() {
    this.expectSingle = 'single'
    return this.applyMethod('single', [])
  }

  maybeSingle() {
    this.expectSingle = 'maybeSingle'
    return this.applyMethod('maybeSingle', [])
  }

  then<TResult1 = RemoteResponse, TResult2 = never>(
    onfulfilled?: ((value: RemoteResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected)
  }

  catch<TResult = never>(onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null) {
    return this.execute().catch(onrejected)
  }

  finally(onfinally?: (() => void) | null) {
    return this.execute().finally(onfinally ?? undefined)
  }

  private buildSelectResponse(remote: RemoteResponse) {
    const localRows = queryDemoLocalTable({
      table: this.table,
      filters: this.filters,
      orders: this.orders,
      limit: this.limitValue,
    })

    if (this.selectOptions?.head) {
      return {
        ...remote,
        data: null,
        error: null,
        count: localRows.length,
        status: 200,
        statusText: 'OK',
      }
    }

    if (this.expectSingle !== 'none') {
      const singleRow = localRows[0] ?? null
      return {
        ...remote,
        data: singleRow,
        error: this.expectSingle === 'single' && !singleRow ? { message: 'No rows returned.' } : null,
        count: singleRow ? 1 : 0,
        status: 200,
        statusText: 'OK',
      }
    }

    return {
      ...remote,
      data: localRows,
      error: null,
      count: localRows.length,
      status: 200,
      statusText: 'OK',
    }
  }

  private canFallbackToLocal() {
    if (!isLocalFallbackEnabled()) return false
    if (!DEMO_FALLBACK_TABLES.has(this.table)) return false
    if (this.action === 'select') {
      return hasDemoLocalData(this.table)
    }
    return hasDemoLocalData(this.table) || this.action === 'insert' || this.action === 'upsert'
  }

  private shouldFallbackWrite(remote: RemoteResponse) {
    // Explicit permission / RLS error
    if (remote?.error && isPermissionError(remote.error.message)) return true
    // Any other remote error (schema mismatch, network, etc.)
    if (remote?.error) return true
    // Silent RLS denial: no error but data is null/empty (0 rows affected)
    if (!remote?.error && (remote?.data == null || (Array.isArray(remote.data) && remote.data.length === 0))) return true
    return false
  }

  private fallbackWrite(remote: RemoteResponse) {
    if (!this.canFallbackToLocal()) return remote
    if (!this.shouldFallbackWrite(remote)) return remote

    if (this.action === 'insert' && this.insertPayload) {
      const rows = insertDemoLocalRows(this.table, this.insertPayload)
      return { ...remote, data: rows, error: null, status: 200, statusText: 'OK' }
    }

    if (this.action === 'upsert' && this.upsertPayload) {
      const rows = upsertDemoLocalRows(this.table, this.upsertPayload, this.upsertConflict)
      return { ...remote, data: rows, error: null, status: 200, statusText: 'OK' }
    }

    if (this.action === 'update') {
      const rows = updateDemoLocalRows(this.table, this.updatePatch, this.filters)
      return { ...remote, data: rows, error: null, status: 200, statusText: 'OK' }
    }

    if (this.action === 'delete') {
      const rows = deleteDemoLocalRows(this.table, this.filters)
      return { ...remote, data: rows, error: null, status: 200, statusText: 'OK' }
    }

    return remote
  }

  async execute() {
    const remote = await this.query
    if (this.action === 'select') {
      if (!this.canFallbackToLocal()) return remote

      const remoteRows = Array.isArray(remote?.data) ? remote.data : []
      const remoteCount = typeof remote?.count === 'number' ? remote.count : null
      const hasRemoteRows = remoteRows.length > 0 || (remoteCount != null && remoteCount > 0)

      // When remote has rows, patch in any locally-modified rows so DnD updates are visible
      if (!remote?.error && hasRemoteRows) {
        const dirtyIds = getDirtyIds(this.table)
        if (dirtyIds.size > 0) {
          const localRows = queryDemoLocalTable({ table: this.table })
          const localById = new Map(
            localRows
              .filter(r => typeof r.id === 'string' && dirtyIds.has(r.id))
              .map(r => [r.id as string, r]),
          )
          if (localById.size > 0) {
            const merged = (remoteRows as Record<string, unknown>[]).map(r => {
              const local = localById.get(r.id as string)
              return local ? { ...r, ...local } : r
            })
            return { ...remote, data: merged, error: null, count: merged.length }
          }
        }
        return remote
      }
      return this.buildSelectResponse(remote)
    }
    return this.fallbackWrite(remote)
  }
}

function createDemoAwareClient(baseClient: DemoAwareBaseClient) {
  if (typeof window === 'undefined') return baseClient
  const realFrom = baseClient.from.bind(baseClient) as (table: string) => QueryLike
  return new Proxy(baseClient, {
    get(target, property, receiver) {
      if (property === 'from') {
        return (table: string) => {
          const query = realFrom(table)
          if (!DEMO_FALLBACK_TABLES.has(table)) return query
          return new DemoAwareQueryBuilder(table, query)
        }
      }
      return Reflect.get(target, property, receiver)
    },
  })
}

const baseSupabase = createClient<AppDatabase>(supabaseUrl, supabaseKey)
export const supabase: typeof baseSupabase = createDemoAwareClient(baseSupabase as unknown as DemoAwareBaseClient) as unknown as typeof baseSupabase
