import { supabase } from './supabase'

const db = supabase as any          // eslint-disable-line @typescript-eslint/no-explicit-any

export interface CourseTemplate {
  id: string
  label: string
  type_transport: string | null
  nature_marchandise: string | null
  chargement_site_id: string | null
  livraison_site_id: string | null
  client_id: string | null
  distance_km: number | null
  duree_heures: number | null
  notes: string | null
  created_at: string
}

export async function listCourseTemplates(): Promise<CourseTemplate[]> {
  const { data, error } = await db
    .from('course_templates')
    .select('id, label, type_transport, nature_marchandise, chargement_site_id, livraison_site_id, client_id, distance_km, duree_heures, notes, created_at')
    .order('label')
  if (error) return []
  return (data ?? []) as CourseTemplate[]
}

export async function saveCourseTemplate(template: Omit<CourseTemplate, 'id' | 'created_at'>): Promise<CourseTemplate | null> {
  const { data, error } = await db
    .from('course_templates')
    .insert(template)
    .select('id, label, type_transport, nature_marchandise, chargement_site_id, livraison_site_id, client_id, distance_km, duree_heures, notes, created_at')
    .single()
  if (error) return null
  return data as CourseTemplate
}

export async function deleteCourseTemplate(id: string): Promise<void> {
  await db.from('course_templates').delete().eq('id', id)
}
