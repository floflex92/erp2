import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface RemoteCustomRow {
  id: string
  label: string
  subtitle: string
}

export interface RemoteCustomBlock {
  id: string
  row_id: string
  label: string
  date_start: string
  date_end: string
  color: string
  ot_id: string | null
  kind: string | null
}

// ── Rows ─────────────────────────────────────────────────────────────────────

export async function fetchCustomRows(): Promise<RemoteCustomRow[]> {
  const { data, error } = await db
    .from('planning_custom_rows')
    .select('id, label, subtitle')
    .order('created_at')
  if (error) { console.error('[planningCustomBlocks] fetchCustomRows', error); return [] }
  return data ?? []
}

export async function upsertCustomRow(row: RemoteCustomRow): Promise<void> {
  const { error } = await db
    .from('planning_custom_rows')
    .upsert({ id: row.id, label: row.label, subtitle: row.subtitle })
  if (error) console.error('[planningCustomBlocks] upsertCustomRow', error)
}

export async function deleteCustomRow(id: string): Promise<void> {
  const { error } = await db
    .from('planning_custom_rows')
    .delete()
    .eq('id', id)
  if (error) console.error('[planningCustomBlocks] deleteCustomRow', error)
}

export async function syncCustomRows(rows: RemoteCustomRow[]): Promise<void> {
  if (rows.length === 0) {
    await db.from('planning_custom_rows').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    return
  }
  const { error } = await db
    .from('planning_custom_rows')
    .upsert(rows.map(r => ({ id: r.id, label: r.label, subtitle: r.subtitle })))
  if (error) console.error('[planningCustomBlocks] syncCustomRows', error)
}

// ── Blocks ────────────────────────────────────────────────────────────────────

export async function fetchCustomBlocks(): Promise<RemoteCustomBlock[]> {
  const { data, error } = await db
    .from('planning_custom_blocks')
    .select('id, row_id, label, date_start, date_end, color, ot_id, kind')
    .order('created_at')
  if (error) { console.error('[planningCustomBlocks] fetchCustomBlocks', error); return [] }
  return data ?? []
}

export async function upsertCustomBlock(block: RemoteCustomBlock): Promise<void> {
  const { error } = await db
    .from('planning_custom_blocks')
    .upsert({
      id: block.id,
      row_id: block.row_id,
      label: block.label,
      date_start: block.date_start,
      date_end: block.date_end,
      color: block.color,
      ot_id: block.ot_id ?? null,
      kind: block.kind ?? null,
    })
  if (error) console.error('[planningCustomBlocks] upsertCustomBlock', error)
}

export async function deleteCustomBlock(id: string): Promise<void> {
  const { error } = await db
    .from('planning_custom_blocks')
    .delete()
    .eq('id', id)
  if (error) console.error('[planningCustomBlocks] deleteCustomBlock', error)
}

export async function syncCustomBlocks(blocks: RemoteCustomBlock[]): Promise<void> {
  if (blocks.length === 0) {
    await db.from('planning_custom_blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    return
  }
  const { error } = await db
    .from('planning_custom_blocks')
    .upsert(blocks.map(b => ({
      id: b.id,
      row_id: b.row_id,
      label: b.label,
      date_start: b.date_start,
      date_end: b.date_end,
      color: b.color,
      ot_id: b.ot_id ?? null,
      kind: b.kind ?? null,
    })))
  if (error) console.error('[planningCustomBlocks] syncCustomBlocks', error)
}
