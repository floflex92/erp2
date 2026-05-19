import { looseSupabase } from '@/lib/supabaseLoose'
import type { Service, ServiceHealth, ServiceInsert } from './domain'

function mapSupabaseError(error: { code?: string | null; message?: string | null } | null): string | null {
  if (!error) return null
  if (error.code === '42P01') return 'Le schema services n est pas encore deploye sur la base.'
  if (error.code === '42703') return 'La structure services attendue n est pas encore complete.'
  return error.message ?? 'Erreur Supabase inconnue.'
}

export async function listServices(companyId: number): Promise<{ data: Service[]; health: ServiceHealth }> {
  const { data, error } = await looseSupabase
    .from('services')
    .select('id, company_id, name, code, description, color, visual_marker, parent_service_id, is_active, created_at, updated_at, archived_at')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name')

  if (error) {
    return { data: [], health: { ready: false, message: mapSupabaseError(error) } }
  }

  return { data: (data as Service[] | null) ?? [], health: { ready: true, message: null } }
}

export async function createService(input: ServiceInsert): Promise<{ data: Service | null; error: string | null }> {
  const payload = {
    company_id: input.company_id,
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    description: input.description?.trim() || null,
    color: input.color ?? null,
    visual_marker: input.visual_marker ?? null,
    parent_service_id: input.parent_service_id ?? null,
    is_active: input.is_active ?? true,
  }

  const { data, error } = await looseSupabase
    .from('services')
    .insert(payload)
    .select('id, company_id, name, code, description, color, visual_marker, parent_service_id, is_active, created_at, updated_at, archived_at')
    .single()

  if (error) return { data: null, error: mapSupabaseError(error) }
  return { data: data as Service, error: null }
}
