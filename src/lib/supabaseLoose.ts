import { supabase } from './supabase'

export type LooseSupabaseClient = Omit<typeof supabase, 'from' | 'channel' | 'rpc'> & {

  from: (table: string) => any

  channel: (name: string) => any

  rpc: (fn: string, args?: Record<string, unknown>) => any
}

export const looseSupabase = supabase as unknown as LooseSupabaseClient
