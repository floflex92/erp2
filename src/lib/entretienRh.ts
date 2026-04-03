import { supabase } from './supabase'

export type EntretienRh = {
  id: string
  employe_id: string
  type: 'evaluation_annuelle' | 'entretien_professionnel' | 'bilan_competences' | 'reunion_management' | 'autre'
  titre: string
  description: string | null
  date_planifiee: string
  heure_debut: string | null
  duree_minutes: number
  evaluateur_id: string | null
  statut: 'planifie' | 'effectue' | 'reporte' | 'annule'
  resultat: string | null
  notes_evaluation: string | null
  suivi_requis: boolean
  date_suivi_prevu: string | null
  created_at: string
  updated_at: string
}

/**
 * Fetch all entretiens RH from Supabase
 */
export async function fetchEntretienRh(): Promise<EntretienRh[]> {
  try {
    const { data, error } = await (supabase
      .from('entretiens_rh' as any)
      .select('*')
      .order('date_planifiee', { ascending: false }) as any)

    if (error) {
      console.error('Error fetching entretiens_rh:', error)
      return []
    }

    return (data as EntretienRh[]) ?? []
  } catch (err) {
    console.error('fetchEntretienRh error:', err)
    return []
  }
}

/**
 * Fetch entretiens for a specific employee
 */
export async function fetchEntretienRhForEmployee(employeId: string): Promise<EntretienRh[]> {
  try {
    const { data, error } = await (supabase
      .from('entretiens_rh' as any)
      .select('*')
      .eq('employe_id', employeId)
      .order('date_planifiee', { ascending: false }) as any)

    if (error) {
      console.error('Error fetching entretiens_rh for employee:', error)
      return []
    }

    return (data as EntretienRh[]) ?? []
  } catch (err) {
    console.error('fetchEntretienRhForEmployee error:', err)
    return []
  }
}

/**
 * Create a new entretien RH
 */
export async function createEntretienRh(entretien: Omit<EntretienRh, 'id' | 'created_at' | 'updated_at'>): Promise<EntretienRh | null> {
  try {
    const { data, error } = await (supabase
      .from('entretiens_rh' as any)
      .insert([entretien])
      .select()
      .single() as any)

    if (error) {
      console.error('Error creating entretien_rh:', error)
      return null
    }

    return (data as EntretienRh) ?? null
  } catch (err) {
    console.error('createEntretienRh error:', err)
    return null
  }
}

/**
 * Update an existing entretien RH
 */
export async function updateEntretienRh(id: string, updates: Partial<EntretienRh>): Promise<EntretienRh | null> {
  try {
    const { data, error } = await (supabase
      .from('entretiens_rh' as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single() as any)

    if (error) {
      console.error('Error updating entretien_rh:', error)
      return null
    }

    return (data as EntretienRh) ?? null
  } catch (err) {
    console.error('updateEntretienRh error:', err)
    return null
  }
}

/**
 * Delete an entretien RH
 */
export async function deleteEntretienRh(id: string): Promise<boolean> {
  try {
    const { error } = await (supabase
      .from('entretiens_rh' as any)
      .delete()
      .eq('id', id) as any)

    if (error) {
      console.error('Error deleting entretien_rh:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('deleteEntretienRh error:', err)
    return false
  }
}

/**
 * Get entretiens RH that require follow-up and are not scheduled yet
 */
export async function fetchFollowUpRequiredEntretiens(): Promise<EntretienRh[]> {
  try {
    const { data, error } = await (supabase
      .from('entretiens_rh' as any)
      .select('*')
      .eq('suivi_requis', true)
      .is('date_suivi_prevu', null)
      .eq('statut', 'effectue')
      .order('date_planifiee', { ascending: false }) as any)

    if (error) {
      console.error('Error fetching follow-up required entretiens:', error)
      return []
    }

    return (data as EntretienRh[]) ?? []
  } catch (err) {
    console.error('fetchFollowUpRequiredEntretiens error:', err)
    return []
  }
}

/**
 * Get entretiens RH planned within X days
 */
export async function fetchUpcomingEntretiens(daysAhead: number = 7): Promise<EntretienRh[]> {
  try {
    const today = new Date()
    const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    const { data, error } = await (supabase
      .from('entretiens_rh' as any)
      .select('*')
      .eq('statut', 'planifie')
      .gte('date_planifiee', today.toISOString().split('T')[0]!)
      .lte('date_planifiee', futureDate.toISOString().split('T')[0]!)
      .order('date_planifiee', { ascending: true }) as any)

    if (error) {
      console.error('Error fetching upcoming entretiens:', error)
      return []
    }

    return (data as EntretienRh[]) ?? []
  } catch (err) {
    console.error('fetchUpcomingEntretiens error:', err)
    return []
  }
}
