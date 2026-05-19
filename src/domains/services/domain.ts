export type Service = {
  id: string
  company_id: number
  name: string
  code: string
  description: string | null
  color: string | null
  visual_marker: string | null
  parent_service_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type ServiceInsert = {
  company_id: number
  name: string
  code: string
  description?: string | null
  color?: string | null
  visual_marker?: string | null
  parent_service_id?: string | null
  is_active?: boolean
}

export type ServiceHealth = {
  ready: boolean
  message: string | null
}

export const DEFAULT_SERVICE_COLORS = [
  '#1d4ed8',
  '#0f766e',
  '#b45309',
  '#7c3aed',
  '#be123c',
  '#475569',
] as const
