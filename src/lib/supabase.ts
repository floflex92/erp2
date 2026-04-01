import { createClient } from '@supabase/supabase-js'
import type { Database as BaseDatabase } from './database.types'

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

export const supabase = createClient<AppDatabase>(supabaseUrl, supabaseKey)
