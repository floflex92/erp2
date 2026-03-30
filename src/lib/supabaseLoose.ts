import { supabase } from './supabase'

export type LooseSupabaseClient = Omit<typeof supabase, 'from' | 'channel'> & {
  from: (table: string) => any
  channel: (name: string) => any
}

export const looseSupabase = supabase as unknown as LooseSupabaseClient
