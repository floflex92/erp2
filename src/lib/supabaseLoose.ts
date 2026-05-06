import { supabase } from './supabase'

export type LooseSupabaseClient = Omit<typeof supabase, 'from' | 'channel' | 'rpc'> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  channel: (name: string) => any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: (fn: string, args?: Record<string, unknown>) => any
}

export const looseSupabase = supabase as unknown as LooseSupabaseClient
