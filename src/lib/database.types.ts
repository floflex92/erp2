export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chauffeurs: {
        Row: {
          adresse: string | null
          carte_tachy_expiration: string | null
          carte_tachy_numero: string | null
          created_at: string
          date_naissance: string | null
          email: string | null
          fco_date: string | null
          fco_expiration: string | null
          fimo_date: string | null
          id: string
          nom: string
          notes: string | null
          numero_permis: string | null
          permis_categories: string[] | null
          permis_expiration: string | null
          prenom: string
          statut: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          carte_tachy_expiration?: string | null
          carte_tachy_numero?: string | null
          created_at?: string
          date_naissance?: string | null
          email?: string | null
          fco_date?: string | null
          fco_expiration?: string | null
          fimo_date?: string | null
          id?: string
          nom: string
          notes?: string | null
          numero_permis?: string | null
          permis_categories?: string[] | null
          permis_expiration?: string | null
          prenom: string
          statut?: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          carte_tachy_expiration?: string | null
          carte_tachy_numero?: string | null
          created_at?: string
          date_naissance?: string | null
          email?: string | null
          fco_date?: string | null
          fco_expiration?: string | null
          fimo_date?: string | null
          id?: string
          nom?: string
          notes?: string | null
          numero_permis?: string | null
          permis_categories?: string[] | null
          permis_expiration?: string | null
          prenom?: string
          statut?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          actif: boolean
          adresse: string | null
          code_postal: string | null
          created_at: string
          email: string | null
          id: string
          nom: string
          notes: string | null
          siret: string | null
          telephone: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          code_postal?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom: string
          notes?: string | null
          siret?: string | null
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          code_postal?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          notes?: string | null
          siret?: string | null
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      entretiens: {
        Row: {
          cout_ht: number | null
          created_at: string
          date_entretien: string
          description: string | null
          id: string
          km_au_moment: number | null
          prestataire: string | null
          type_entretien: string
          vehicule_id: string
        }
        Insert: {
          cout_ht?: number | null
          created_at?: string
          date_entretien: string
          description?: string | null
          id?: string
          km_au_moment?: number | null
          prestataire?: string | null
          type_entretien: string
          vehicule_id: string
        }
        Update: {
          cout_ht?: number | null
          created_at?: string
          date_entretien?: string
          description?: string | null
          id?: string
          km_au_moment?: number | null
          prestataire?: string | null
          type_entretien?: string
          vehicule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entretiens_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          client_id: string
          created_at: string
          date_echeance: string | null
          date_emission: string
          id: string
          montant_ht: number
          montant_ttc: number | null
          montant_tva: number | null
          notes: string | null
          numero: string
          statut: string
          taux_tva: number
          transport_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date_echeance?: string | null
          date_emission?: string
          id?: string
          montant_ht?: number
          montant_ttc?: number | null
          montant_tva?: number | null
          notes?: string | null
          numero: string
          statut?: string
          taux_tva?: number
          transport_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date_echeance?: string | null
          date_emission?: string
          id?: string
          montant_ht?: number
          montant_ttc?: number | null
          montant_tva?: number | null
          notes?: string | null
          numero?: string
          statut?: string
          taux_tva?: number
          transport_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "transports"
            referencedColumns: ["id"]
          },
        ]
      }
      tachygraphe_entrees: {
        Row: {
          chauffeur_id: string
          created_at: string
          date_debut: string
          date_fin: string | null
          duree_minutes: number | null
          id: string
          notes: string | null
          source: string | null
          type_activite: string
          vehicule_id: string | null
        }
        Insert: {
          chauffeur_id: string
          created_at?: string
          date_debut: string
          date_fin?: string | null
          duree_minutes?: number | null
          id?: string
          notes?: string | null
          source?: string | null
          type_activite: string
          vehicule_id?: string | null
        }
        Update: {
          chauffeur_id?: string
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          duree_minutes?: number | null
          id?: string
          notes?: string | null
          source?: string | null
          type_activite?: string
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tachygraphe_entrees_chauffeur_id_fkey"
            columns: ["chauffeur_id"]
            isOneToOne: false
            referencedRelation: "chauffeurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tachygraphe_entrees_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      transports: {
        Row: {
          adresse_chargement: string | null
          adresse_livraison: string | null
          chauffeur_id: string | null
          client_id: string | null
          created_at: string
          date_chargement: string | null
          date_livraison_prevue: string | null
          date_livraison_reelle: string | null
          id: string
          nature_marchandise: string | null
          notes: string | null
          poids_kg: number | null
          prix_ht: number | null
          reference: string
          statut: string
          taux_tva: number | null
          updated_at: string
          vehicule_id: string | null
          ville_chargement: string | null
          ville_livraison: string | null
          volume_m3: number | null
        }
        Insert: {
          adresse_chargement?: string | null
          adresse_livraison?: string | null
          chauffeur_id?: string | null
          client_id?: string | null
          created_at?: string
          date_chargement?: string | null
          date_livraison_prevue?: string | null
          date_livraison_reelle?: string | null
          id?: string
          nature_marchandise?: string | null
          notes?: string | null
          poids_kg?: number | null
          prix_ht?: number | null
          reference: string
          statut?: string
          taux_tva?: number | null
          updated_at?: string
          vehicule_id?: string | null
          ville_chargement?: string | null
          ville_livraison?: string | null
          volume_m3?: number | null
        }
        Update: {
          adresse_chargement?: string | null
          adresse_livraison?: string | null
          chauffeur_id?: string | null
          client_id?: string | null
          created_at?: string
          date_chargement?: string | null
          date_livraison_prevue?: string | null
          date_livraison_reelle?: string | null
          id?: string
          nature_marchandise?: string | null
          notes?: string | null
          poids_kg?: number | null
          prix_ht?: number | null
          reference?: string
          statut?: string
          taux_tva?: number | null
          updated_at?: string
          vehicule_id?: string | null
          ville_chargement?: string | null
          ville_livraison?: string | null
          volume_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transports_chauffeur_id_fkey"
            columns: ["chauffeur_id"]
            isOneToOne: false
            referencedRelation: "chauffeurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transports_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicules: {
        Row: {
          annee: number | null
          assurance_expiration: string | null
          created_at: string
          ct_date: string | null
          ct_expiration: string | null
          id: string
          immatriculation: string
          km_actuel: number | null
          km_dernier_entretien: number | null
          km_prochain_entretien: number | null
          marque: string | null
          modele: string | null
          notes: string | null
          ptac_kg: number | null
          statut: string
          tachy_etalonnage: string | null
          tachy_etalonnage_prochain: string | null
          tachy_serie: string | null
          type_vehicule: string
          updated_at: string
          vignette_expiration: string | null
        }
        Insert: {
          annee?: number | null
          assurance_expiration?: string | null
          created_at?: string
          ct_date?: string | null
          ct_expiration?: string | null
          id?: string
          immatriculation: string
          km_actuel?: number | null
          km_dernier_entretien?: number | null
          km_prochain_entretien?: number | null
          marque?: string | null
          modele?: string | null
          notes?: string | null
          ptac_kg?: number | null
          statut?: string
          tachy_etalonnage?: string | null
          tachy_etalonnage_prochain?: string | null
          tachy_serie?: string | null
          type_vehicule?: string
          updated_at?: string
          vignette_expiration?: string | null
        }
        Update: {
          annee?: number | null
          assurance_expiration?: string | null
          created_at?: string
          ct_date?: string | null
          ct_expiration?: string | null
          id?: string
          immatriculation?: string
          km_actuel?: number | null
          km_dernier_entretien?: number | null
          km_prochain_entretien?: number | null
          marque?: string | null
          modele?: string | null
          notes?: string | null
          ptac_kg?: number | null
          statut?: string
          tachy_etalonnage?: string | null
          tachy_etalonnage_prochain?: string | null
          tachy_serie?: string | null
          type_vehicule?: string
          updated_at?: string
          vignette_expiration?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"]
