import { supabase } from './supabase'

export type LooseSupabaseClient = Omit<typeof supabase, 'from' | 'channel'> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  channel: (name: string) => any
}

export const looseSupabase = supabase as unknown as LooseSupabaseClient
