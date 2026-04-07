export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      profils: {
        Row: {
          id: string
          user_id: string
          role: string
          matricule: string
          nom: string | null
          prenom: string | null
          tenant_key: string | null
          company_id: number | null
          max_concurrent_screens: number
          login_enabled: boolean
          force_password_reset: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: string
          matricule?: string
          nom?: string | null
          prenom?: string | null
          tenant_key?: string | null
          company_id?: number | null
          max_concurrent_screens?: number
          login_enabled?: boolean
          force_password_reset?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          matricule?: string
          nom?: string | null
          prenom?: string | null
          tenant_key?: string | null
          company_id?: number | null
          max_concurrent_screens?: number
          login_enabled?: boolean
          force_password_reset?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profils_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth.users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profils_tenant_key_fk"
            columns: ["tenant_key"]
            isOneToOne: false
            referencedRelation: "erp_v11_tenants"
            referencedColumns: ["tenant_key"]
          },
          {
            foreignKeyName: "profils_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          id: number
          name: string
          slug: string
          status: 'active' | 'suspended' | 'trial' | 'cancelled'
          subscription_plan: 'starter' | 'pro' | 'enterprise'
          max_users: number
          max_screens: number
          email_domain: string | null
          enabled_modules: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          slug: string
          status?: 'active' | 'suspended' | 'trial' | 'cancelled'
          subscription_plan?: 'starter' | 'pro' | 'enterprise'
          max_users?: number
          max_screens?: number
          email_domain?: string | null
          enabled_modules?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
          status?: 'active' | 'suspended' | 'trial' | 'cancelled'
          subscription_plan?: 'starter' | 'pro' | 'enterprise'
          max_users?: number
          max_screens?: number
          email_domain?: string | null
          enabled_modules?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          id: string
          user_id: string
          email: string
          nom: string | null
          prenom: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          nom?: string | null
          prenom?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          nom?: string | null
          prenom?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      impersonation_logs: {
        Row: {
          id: string
          admin_user_id: string
          admin_email: string
          target_user_id: string
          target_email: string
          target_company_id: number
          reason: string | null
          ip_hash: string | null
          started_at: string
          ended_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          admin_email: string
          target_user_id: string
          target_email: string
          target_company_id: number
          reason?: string | null
          ip_hash?: string | null
          started_at?: string
          ended_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          admin_email?: string
          target_user_id?: string
          target_email?: string
          target_company_id?: number
          reason?: string | null
          ip_hash?: string | null
          started_at?: string
          ended_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_logs_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          id: string
          log_id: string
          admin_user_id: string
          target_user_id: string
          target_company_id: number
          is_impersonating: boolean
          impersonated_by: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          log_id: string
          admin_user_id: string
          target_user_id: string
          target_company_id: number
          is_impersonating?: boolean
          impersonated_by: string
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          log_id?: string
          admin_user_id?: string
          target_user_id?: string
          target_company_id?: number
          is_impersonating?: boolean
          impersonated_by?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_sessions_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "impersonation_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: number
          company_id: number
          name: string
          label: string
          description: string | null
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: number
          company_id?: number
          name: string
          label: string
          description?: string | null
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          company_id?: number
          name?: string
          label?: string
          description?: string | null
          is_system?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          id: number
          name: string
          resource: string
          action: string
          label: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          resource: string
          action: string
          label: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          resource?: string
          action?: string
          label?: string
          created_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_profile_id: string
          role_id: number
          company_id: number
          granted_by: string | null
          granted_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_profile_id: string
          role_id: number
          company_id?: number
          granted_by?: string | null
          granted_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_profile_id?: string
          role_id?: number
          company_id?: number
          granted_by?: string | null
          granted_at?: string
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          role_id: number
          permission_id: number
        }
        Insert: {
          role_id: number
          permission_id: number
        }
        Update: {
          role_id?: number
          permission_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          notes: string | null
          completed: boolean
          due_date: string | null
          priority: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          notes?: string | null
          completed?: boolean
          due_date?: string | null
          priority?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          notes?: string | null
          completed?: boolean
          due_date?: string | null
          priority?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      tchat_conversations: {
        Row: {
          id: string
          updated_at: string
        }
        Insert: {
          id?: string
          updated_at?: string
        }
        Update: {
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tchat_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          created_at?: string
          read_at?: string | null
        }
        Relationships: []
      }
      tchat_participants: {
        Row: {
          conversation_id: string
          profil_id: string
          profils?: {
            id: string
            nom: string | null
            prenom: string | null
            role: string
          } | null
        }
        Insert: {
          conversation_id: string
          profil_id: string
        }
        Update: {
          conversation_id?: string
          profil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tchat_participants_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tchat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "tchat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_v11_tenants: {
        Row: {
          id: string
          tenant_key: string
          display_name: string
          is_active: boolean
          default_max_concurrent_screens: number
          allowed_pages: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_key: string
          display_name: string
          is_active?: boolean
          default_max_concurrent_screens?: number
          allowed_pages?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_key?: string
          display_name?: string
          is_active?: boolean
          default_max_concurrent_screens?: number
          allowed_pages?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      erp_v11_modules: {
        Row: {
          id: string
          tenant_key: string
          module_key: string
          enabled: boolean
          mode: string
          refresh_interval_sec: number
          fallback_strategy: string
          config: Json
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_key?: string
          module_key?: string
          enabled?: boolean
          mode?: string
          refresh_interval_sec?: number
          fallback_strategy?: string
          config?: Json
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_key?: string
          module_key?: string
          enabled?: boolean
          mode?: string
          refresh_interval_sec?: number
          fallback_strategy?: string
          config?: Json
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_v11_modules_tenant_fk"
            columns: ["tenant_key"]
            isOneToOne: false
            referencedRelation: "erp_v11_tenants"
            referencedColumns: ["tenant_key"]
          },
          {
            foreignKeyName: "erp_v11_modules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "auth.users"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_v11_providers: {
        Row: {
          id: string
          tenant_key: string
          provider_key: string
          provider_type: string
          enabled: boolean
          priority: number
          base_url: string | null
          auth_type: string
          api_key_ref: string | null
          capabilities: string[]
          rate_limit_per_minute: number
          cache_ttl_sec: number
          timeout_ms: number
          mapping_profile: string
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_key?: string
          provider_key?: string
          provider_type?: string
          enabled?: boolean
          priority?: number
          base_url?: string | null
          auth_type?: string
          api_key_ref?: string | null
          capabilities?: string[]
          rate_limit_per_minute?: number
          cache_ttl_sec?: number
          timeout_ms?: number
          mapping_profile?: string
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_key?: string
          provider_key?: string
          provider_type?: string
          enabled?: boolean
          priority?: number
          base_url?: string | null
          auth_type?: string
          api_key_ref?: string | null
          capabilities?: string[]
          rate_limit_per_minute?: number
          cache_ttl_sec?: number
          timeout_ms?: number
          mapping_profile?: string
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_v11_providers_tenant_fk"
            columns: ["tenant_key"]
            isOneToOne: false
            referencedRelation: "erp_v11_tenants"
            referencedColumns: ["tenant_key"]
          },
        ]
      }
      erp_v11_api_mappings: {
        Row: {
          id: string
          tenant_key: string
          provider_key: string
          object_name: string
          direction: string
          mapping_version: number
          is_active: boolean
          rules: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_key?: string
          provider_key?: string
          object_name?: string
          direction?: string
          mapping_version?: number
          is_active?: boolean
          rules?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_key?: string
          provider_key?: string
          object_name?: string
          direction?: string
          mapping_version?: number
          is_active?: boolean
          rules?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_v11_api_mappings_tenant_fk"
            columns: ["tenant_key"]
            isOneToOne: false
            referencedRelation: "erp_v11_tenants"
            referencedColumns: ["tenant_key"]
          },
        ]
      }
      erp_v11_cache: {
        Row: {
          id: string
          tenant_key: string
          cache_key: string
          scope: string
          payload: Json
          payload_hash: string | null
          source: string
          stale_after: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_key?: string
          cache_key?: string
          scope?: string
          payload?: Json
          payload_hash?: string | null
          source?: string
          stale_after?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_key?: string
          cache_key?: string
          scope?: string
          payload?: Json
          payload_hash?: string | null
          source?: string
          stale_after?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_v11_cache_tenant_fk"
            columns: ["tenant_key"]
            isOneToOne: false
            referencedRelation: "erp_v11_tenants"
            referencedColumns: ["tenant_key"]
          },
        ]
      }
      affectations: {
        Row: {
          id: string
          conducteur_id: string
          vehicule_id: string | null
          remorque_id: string | null
          type_affectation: string
          date_debut: string | null
          date_fin: string | null
          actif: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conducteur_id: string
          vehicule_id?: string | null
          remorque_id?: string | null
          type_affectation?: string
          date_debut?: string | null
          date_fin?: string | null
          actif?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conducteur_id?: string
          vehicule_id?: string | null
          remorque_id?: string | null
          type_affectation?: string
          date_debut?: string | null
          date_fin?: string | null
          actif?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affectations_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_remorque_id_fkey"
            columns: ["remorque_id"]
            isOneToOne: false
            referencedRelation: "remorques"
            referencedColumns: ["id"]
          },
        ]
      }
      adresses: {
        Row: {
          actif: boolean
          adresse: string | null
          client_id: string | null
          code_postal: string | null
          contact_nom: string | null
          contact_tel: string | null
          created_at: string
          horaires: string | null
          id: string
          instructions: string | null
          latitude: number | null
          longitude: number | null
          nom_lieu: string
          pays: string | null
          type_lieu: string | null
          updated_at: string
          ville: string
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          client_id?: string | null
          code_postal?: string | null
          contact_nom?: string | null
          contact_tel?: string | null
          created_at?: string
          horaires?: string | null
          id?: string
          instructions?: string | null
          latitude?: number | null
          longitude?: number | null
          nom_lieu: string
          pays?: string | null
          type_lieu?: string | null
          updated_at?: string
          ville: string
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          client_id?: string | null
          code_postal?: string | null
          contact_nom?: string | null
          contact_tel?: string | null
          created_at?: string
          horaires?: string | null
          id?: string
          instructions?: string | null
          latitude?: number | null
          longitude?: number | null
          nom_lieu?: string
          pays?: string | null
          type_lieu?: string | null
          updated_at?: string
          ville?: string
        }
        Relationships: [
          {
            foreignKeyName: "adresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          actif: boolean
          adresse: string | null
          adresse_facturation: string | null
          banque: string | null
          bic: string | null
          code_postal: string | null
          code_postal_facturation: string | null
          code_client: string | null
          contact_facturation_email: string | null
          contact_facturation_nom: string | null
          contact_facturation_telephone: string | null
          conditions_paiement: number | null
          created_at: string
          email: string | null
          encours_max: number | null
          id: string
          iban: string | null
          jour_echeance: number | null
          mode_paiement_defaut: string | null
          nom: string
          notes: string | null
          pays: string | null
          pays_facturation: string | null
          siret: string | null
          site_web: string | null
          taux_tva_defaut: number | null
          telephone: string | null
          titulaire_compte: string | null
          type_echeance: string | null
          tva_intra: string | null
          type_client: string
          updated_at: string
          ville: string | null
          ville_facturation: string | null
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          adresse_facturation?: string | null
          banque?: string | null
          bic?: string | null
          code_postal?: string | null
          code_postal_facturation?: string | null
          code_client?: string | null
          contact_facturation_email?: string | null
          contact_facturation_nom?: string | null
          contact_facturation_telephone?: string | null
          conditions_paiement?: number | null
          created_at?: string
          email?: string | null
          encours_max?: number | null
          id?: string
          iban?: string | null
          jour_echeance?: number | null
          mode_paiement_defaut?: string | null
          nom: string
          notes?: string | null
          pays?: string | null
          pays_facturation?: string | null
          siret?: string | null
          site_web?: string | null
          taux_tva_defaut?: number | null
          telephone?: string | null
          titulaire_compte?: string | null
          type_echeance?: string | null
          tva_intra?: string | null
          type_client?: string
          updated_at?: string
          ville?: string | null
          ville_facturation?: string | null
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          adresse_facturation?: string | null
          banque?: string | null
          bic?: string | null
          code_postal?: string | null
          code_postal_facturation?: string | null
          code_client?: string | null
          contact_facturation_email?: string | null
          contact_facturation_nom?: string | null
          contact_facturation_telephone?: string | null
          conditions_paiement?: number | null
          created_at?: string
          email?: string | null
          encours_max?: number | null
          id?: string
          iban?: string | null
          jour_echeance?: number | null
          mode_paiement_defaut?: string | null
          nom?: string
          notes?: string | null
          pays?: string | null
          pays_facturation?: string | null
          siret?: string | null
          site_web?: string | null
          taux_tva_defaut?: number | null
          telephone?: string | null
          titulaire_compte?: string | null
          type_echeance?: string | null
          tva_intra?: string | null
          type_client?: string
          updated_at?: string
          ville?: string | null
          ville_facturation?: string | null
        }
        Relationships: []
      }
      conducteurs: {
        Row: {
          adresse: string | null
          carte_tachy_expiration: string | null
          carte_tachy_numero: string | null
          contact_urgence_nom: string | null
          contact_urgence_telephone: string | null
          created_at: string
          date_entree: string | null
          date_naissance: string | null
          date_sortie: string | null
          email: string | null
          fco_date: string | null
          fco_expiration: string | null
          fimo_date: string | null
          id: string
          matricule: string | null
          motif_sortie: string | null
          nom: string
          notes: string | null
          numero_permis: string | null
          permis_categories: string[] | null
          permis_expiration: string | null
          preferences: string | null
          prenom: string
          poste: string | null
          recyclage_date: string | null
          recyclage_expiration: string | null
          statut: string
          telephone: string | null
          type_contrat: string | null
          updated_at: string
          visite_medicale_date: string | null
          visite_medicale_expiration: string | null
        }
        Insert: {
          adresse?: string | null
          carte_tachy_expiration?: string | null
          carte_tachy_numero?: string | null
          contact_urgence_nom?: string | null
          contact_urgence_telephone?: string | null
          created_at?: string
          date_entree?: string | null
          date_naissance?: string | null
          date_sortie?: string | null
          email?: string | null
          fco_date?: string | null
          fco_expiration?: string | null
          fimo_date?: string | null
          id?: string
          matricule?: string | null
          motif_sortie?: string | null
          nom: string
          notes?: string | null
          numero_permis?: string | null
          permis_categories?: string[] | null
          permis_expiration?: string | null
          preferences?: string | null
          prenom: string
          poste?: string | null
          recyclage_date?: string | null
          recyclage_expiration?: string | null
          statut?: string
          telephone?: string | null
          type_contrat?: string | null
          updated_at?: string
          visite_medicale_date?: string | null
          visite_medicale_expiration?: string | null
        }
        Update: {
          adresse?: string | null
          carte_tachy_expiration?: string | null
          carte_tachy_numero?: string | null
          contact_urgence_nom?: string | null
          contact_urgence_telephone?: string | null
          created_at?: string
          date_entree?: string | null
          date_naissance?: string | null
          date_sortie?: string | null
          email?: string | null
          fco_date?: string | null
          fco_expiration?: string | null
          fimo_date?: string | null
          id?: string
          matricule?: string | null
          motif_sortie?: string | null
          nom?: string
          notes?: string | null
          numero_permis?: string | null
          permis_categories?: string[] | null
          permis_expiration?: string | null
          preferences?: string | null
          prenom?: string
          poste?: string | null
          recyclage_date?: string | null
          recyclage_expiration?: string | null
          statut?: string
          telephone?: string | null
          type_contrat?: string | null
          updated_at?: string
          visite_medicale_date?: string | null
          visite_medicale_expiration?: string | null
        }
        Relationships: []
      }
      conducteur_documents: {
        Row: {
          archived_at: string | null
          category: string
          conducteur_id: string
          created_at: string
          expires_at: string | null
          file_name: string
          id: string
          is_mandatory: boolean
          issued_at: string | null
          mime_type: string
          notes: string | null
          storage_bucket: string
          storage_path: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          archived_at?: string | null
          category: string
          conducteur_id: string
          created_at?: string
          expires_at?: string | null
          file_name: string
          id?: string
          is_mandatory?: boolean
          issued_at?: string | null
          mime_type?: string
          notes?: string | null
          storage_bucket?: string
          storage_path: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          archived_at?: string | null
          category?: string
          conducteur_id?: string
          created_at?: string
          expires_at?: string | null
          file_name?: string
          id?: string
          is_mandatory?: boolean
          issued_at?: string | null
          mime_type?: string
          notes?: string | null
          storage_bucket?: string
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conducteur_documents_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      conducteur_evenements_rh: {
        Row: {
          conducteur_id: string
          created_at: string
          created_by: string | null
          description: string | null
          document_id: string | null
          end_date: string | null
          event_type: string
          id: string
          reminder_at: string | null
          severity: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          conducteur_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          end_date?: string | null
          event_type: string
          id?: string
          reminder_at?: string | null
          severity?: string
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          conducteur_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          reminder_at?: string | null
          severity?: string
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conducteur_evenements_rh_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conducteur_evenements_rh_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "conducteur_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          nom: string
          poste: string | null
          prenom: string | null
          principal: boolean | null
          telephone: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          nom: string
          poste?: string | null
          prenom?: string | null
          principal?: boolean | null
          telephone?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          poste?: string | null
          prenom?: string | null
          principal?: boolean | null
          telephone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      flotte_documents: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          expires_at: string | null
          file_name: string
          id: string
          issued_at: string | null
          mime_type: string
          notes: string | null
          remorque_id: string | null
          storage_bucket: string
          storage_path: string
          title: string
          updated_at: string
          uploaded_by: string | null
          vehicule_id: string | null
        }
        Insert: {
          archived_at?: string | null
          category: string
          created_at?: string
          expires_at?: string | null
          file_name: string
          id?: string
          issued_at?: string | null
          mime_type?: string
          notes?: string | null
          remorque_id?: string | null
          storage_bucket?: string
          storage_path: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
          vehicule_id?: string | null
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          expires_at?: string | null
          file_name?: string
          id?: string
          issued_at?: string | null
          mime_type?: string
          notes?: string | null
          remorque_id?: string | null
          storage_bucket?: string
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flotte_documents_remorque_id_fkey"
            columns: ["remorque_id"]
            isOneToOne: false
            referencedRelation: "remorques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flotte_documents_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      flotte_entretiens: {
        Row: {
          covered_by_contract: boolean
          cout_ht: number
          cout_ttc: number | null
          created_at: string
          created_by: string | null
          garage: string | null
          id: string
          invoice_document_id: string | null
          km_compteur: number | null
          maintenance_type: string
          next_due_date: string | null
          next_due_km: number | null
          notes: string | null
          prestataire: string | null
          remorque_id: string | null
          service_date: string
          updated_at: string
          vehicule_id: string | null
        }
        Insert: {
          covered_by_contract?: boolean
          cout_ht?: number
          cout_ttc?: number | null
          created_at?: string
          created_by?: string | null
          garage?: string | null
          id?: string
          invoice_document_id?: string | null
          km_compteur?: number | null
          maintenance_type: string
          next_due_date?: string | null
          next_due_km?: number | null
          notes?: string | null
          prestataire?: string | null
          remorque_id?: string | null
          service_date: string
          updated_at?: string
          vehicule_id?: string | null
        }
        Update: {
          covered_by_contract?: boolean
          cout_ht?: number
          cout_ttc?: number | null
          created_at?: string
          created_by?: string | null
          garage?: string | null
          id?: string
          invoice_document_id?: string | null
          km_compteur?: number | null
          maintenance_type?: string
          next_due_date?: string | null
          next_due_km?: number | null
          notes?: string | null
          prestataire?: string | null
          remorque_id?: string | null
          service_date?: string
          updated_at?: string
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flotte_entretiens_invoice_document_id_fkey"
            columns: ["invoice_document_id"]
            isOneToOne: false
            referencedRelation: "flotte_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flotte_entretiens_remorque_id_fkey"
            columns: ["remorque_id"]
            isOneToOne: false
            referencedRelation: "remorques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flotte_entretiens_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicule_releves_km: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          km_compteur: number
          notes: string | null
          reading_date: string
          source: string | null
          updated_at: string
          vehicule_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          km_compteur: number
          notes?: string | null
          reading_date: string
          source?: string | null
          updated_at?: string
          vehicule_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          km_compteur?: number
          notes?: string | null
          reading_date?: string
          source?: string | null
          updated_at?: string
          vehicule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicule_releves_km_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      couts_mission: {
        Row: {
          created_at: string
          date_cout: string | null
          fournisseur: string | null
          id: string
          libelle: string | null
          montant_ht: number
          notes: string | null
          ot_id: string
          reference_piece: string | null
          taux_tva: number | null
          type_cout: string
        }
        Insert: {
          created_at?: string
          date_cout?: string | null
          fournisseur?: string | null
          id?: string
          libelle?: string | null
          montant_ht: number
          notes?: string | null
          ot_id: string
          reference_piece?: string | null
          taux_tva?: number | null
          type_cout: string
        }
        Update: {
          created_at?: string
          date_cout?: string | null
          fournisseur?: string | null
          id?: string
          libelle?: string | null
          montant_ht?: number
          notes?: string | null
          ot_id?: string
          reference_piece?: string | null
          taux_tva?: number | null
          type_cout?: string
        }
        Relationships: [
          {
            foreignKeyName: "couts_mission_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couts_mission_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_marge_ot"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          id: string
          nom_fichier: string
          ot_id: string | null
          taille_bytes: number | null
          type_document: string
          uploaded_by: string | null
          url_stockage: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nom_fichier: string
          ot_id?: string | null
          taille_bytes?: number | null
          type_document: string
          uploaded_by?: string | null
          url_stockage?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nom_fichier?: string
          ot_id?: string | null
          taille_bytes?: number | null
          type_document?: string
          uploaded_by?: string | null
          url_stockage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_marge_ot"
            referencedColumns: ["id"]
          },
        ]
      }
      document_links: {
        Row: {
          created_at: string
          document_id: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
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
      maintenance_events: {
        Row: {
          created_at: string
          created_by: string | null
          cout_ht: number | null
          cout_ttc: number | null
          garage: string | null
          id: string
          km_compteur: number | null
          maintenance_type: string
          notes: string | null
          ot_id: string | null
          prestataire: string | null
          remorque_id: string | null
          service_date: string
          updated_at: string
          vehicule_id: string | null
          conducteur_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cout_ht?: number | null
          cout_ttc?: number | null
          garage?: string | null
          id?: string
          km_compteur?: number | null
          maintenance_type: string
          notes?: string | null
          ot_id?: string | null
          prestataire?: string | null
          remorque_id?: string | null
          service_date: string
          updated_at?: string
          vehicule_id?: string | null
          conducteur_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cout_ht?: number | null
          cout_ttc?: number | null
          garage?: string | null
          id?: string
          km_compteur?: number | null
          maintenance_type?: string
          notes?: string | null
          ot_id?: string | null
          prestataire?: string | null
          remorque_id?: string | null
          service_date?: string
          updated_at?: string
          vehicule_id?: string | null
          conducteur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_events_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_events_remorque_id_fkey"
            columns: ["remorque_id"]
            isOneToOne: false
            referencedRelation: "remorques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_events_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_events_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
        ]
      }
      etapes_mission: {
        Row: {
          adresse_id: string | null
          adresse_libre: string | null
          code_postal: string | null
          contact_nom: string | null
          contact_tel: string | null
          created_at: string
          date_prevue: string | null
          date_reelle: string | null
          id: string
          instructions: string | null
          nombre_colis: number | null
          notes: string | null
          ordre: number
          ot_id: string
          pays: string | null
          poids_kg: number | null
          reference_marchandise: string | null
          statut: string
          type_etape: string
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse_id?: string | null
          adresse_libre?: string | null
          code_postal?: string | null
          contact_nom?: string | null
          contact_tel?: string | null
          created_at?: string
          date_prevue?: string | null
          date_reelle?: string | null
          id?: string
          instructions?: string | null
          nombre_colis?: number | null
          notes?: string | null
          ordre?: number
          ot_id: string
          pays?: string | null
          poids_kg?: number | null
          reference_marchandise?: string | null
          statut?: string
          type_etape: string
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse_id?: string | null
          adresse_libre?: string | null
          code_postal?: string | null
          contact_nom?: string | null
          contact_tel?: string | null
          created_at?: string
          date_prevue?: string | null
          date_reelle?: string | null
          id?: string
          instructions?: string | null
          nombre_colis?: number | null
          notes?: string | null
          ordre?: number
          ot_id?: string
          pays?: string | null
          poids_kg?: number | null
          reference_marchandise?: string | null
          statut?: string
          type_etape?: string
          updated_at?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etapes_mission_adresse_id_fkey"
            columns: ["adresse_id"]
            isOneToOne: false
            referencedRelation: "adresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapes_mission_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapes_mission_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_marge_ot"
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
          date_paiement: string | null
          id: string
          mode_paiement: string | null
          montant_ht: number
          montant_ttc: number | null
          montant_tva: number | null
          notes: string | null
          numero: string
          ot_id: string | null
          statut: string
          taux_tva: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date_echeance?: string | null
          date_emission?: string
          date_paiement?: string | null
          id?: string
          mode_paiement?: string | null
          montant_ht?: number
          montant_ttc?: number | null
          montant_tva?: number | null
          notes?: string | null
          numero?: string
          ot_id?: string | null
          statut?: string
          taux_tva?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date_echeance?: string | null
          date_emission?: string
          date_paiement?: string | null
          id?: string
          mode_paiement?: string | null
          montant_ht?: number
          montant_ttc?: number | null
          montant_tva?: number | null
          notes?: string | null
          numero?: string
          ot_id?: string | null
          statut?: string
          taux_tva?: number
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
            foreignKeyName: "factures_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_marge_ot"
            referencedColumns: ["id"]
          },
        ]
      }
      historique_statuts: {
        Row: {
          commentaire: string | null
          created_at: string
          created_by: string | null
          id: string
          ot_id: string
          statut_ancien: string | null
          statut_nouveau: string
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ot_id: string
          statut_ancien?: string | null
          statut_nouveau: string
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ot_id?: string
          statut_ancien?: string | null
          statut_nouveau?: string
        }
        Relationships: [
          {
            foreignKeyName: "historique_statuts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historique_statuts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_marge_ot"
            referencedColumns: ["id"]
          },
        ]
      }
      ot_lignes: {
        Row: {
          id: string
          ot_id: string
          libelle: string
          poids_kg: number | null
          metrage_ml: number | null
          nombre_colis: number | null
          notes: string | null
          company_id: number
          created_at: string
        }
        Insert: {
          id?: string
          ot_id: string
          libelle: string
          poids_kg?: number | null
          metrage_ml?: number | null
          nombre_colis?: number | null
          notes?: string | null
          company_id?: number
          created_at?: string
        }
        Update: {
          id?: string
          ot_id?: string
          libelle?: string
          poids_kg?: number | null
          metrage_ml?: number | null
          nombre_colis?: number | null
          notes?: string | null
          company_id?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ot_lignes_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
        ]
      }
      ordres_transport: {
        Row: {
          affreteur_id: string | null
          chargement_site_id: string | null
          client_id: string
          conducteur_id: string | null
          created_at: string
          date_chargement_prevue: string | null
          date_livraison_prevue: string | null
          date_livraison_reelle: string | null
          distance_km: number | null
          donneur_ordre_id: string
          est_affretee: boolean
          facturation_id: string | null
          groupage_fige: boolean
          groupage_id: string | null
          id: string
          instructions: string | null
          livraison_site_id: string | null
          metrage_ml: number | null
          nature_marchandise: string | null
          nombre_colis: number | null
          notes_internes: string | null
          numero_bl: string | null
          numero_cmr: string | null
          poids_kg: number | null
          prix_ht: number | null
          reference: string
          reference_externe: string | null
          reference_transport: string | null
          remorque_id: string | null
          source_course: string
          statut: string
          statut_transport: string
          statut_operationnel: string | null
          taux_tva: number | null
          temperature_requise: string | null
          type_transport: string
          updated_at: string
          vehicule_id: string | null
          volume_m3: number | null
        }
        Insert: {
          affreteur_id?: string | null
          chargement_site_id?: string | null
          client_id: string
          conducteur_id?: string | null
          created_at?: string
          date_chargement_prevue?: string | null
          date_livraison_prevue?: string | null
          date_livraison_reelle?: string | null
          distance_km?: number | null
          donneur_ordre_id?: string
          est_affretee?: boolean
          facturation_id?: string | null
          groupage_fige?: boolean
          groupage_id?: string | null
          id?: string
          instructions?: string | null
          livraison_site_id?: string | null
          metrage_ml?: number | null
          nature_marchandise?: string | null
          nombre_colis?: number | null
          notes_internes?: string | null
          numero_bl?: string | null
          numero_cmr?: string | null
          poids_kg?: number | null
          prix_ht?: number | null
          reference?: string
          reference_externe?: string | null
          reference_transport?: string | null
          remorque_id?: string | null
          source_course?: string
          statut?: string
          statut_transport?: string
          statut_operationnel?: string | null
          taux_tva?: number | null
          temperature_requise?: string | null
          type_transport?: string
          updated_at?: string
          vehicule_id?: string | null
          volume_m3?: number | null
        }
        Update: {
          affreteur_id?: string | null
          chargement_site_id?: string | null
          client_id?: string
          conducteur_id?: string | null
          created_at?: string
          date_chargement_prevue?: string | null
          date_livraison_prevue?: string | null
          date_livraison_reelle?: string | null
          distance_km?: number | null
          donneur_ordre_id?: string
          est_affretee?: boolean
          facturation_id?: string | null
          groupage_fige?: boolean
          groupage_id?: string | null
          id?: string
          instructions?: string | null
          livraison_site_id?: string | null
          metrage_ml?: number | null
          nature_marchandise?: string | null
          nombre_colis?: number | null
          notes_internes?: string | null
          numero_bl?: string | null
          numero_cmr?: string | null
          poids_kg?: number | null
          prix_ht?: number | null
          reference?: string
          reference_externe?: string | null
          reference_transport?: string | null
          remorque_id?: string | null
          source_course?: string
          statut?: string
          statut_transport?: string
          statut_operationnel?: string | null
          taux_tva?: number | null
          temperature_requise?: string | null
          type_transport?: string
          updated_at?: string
          vehicule_id?: string | null
          volume_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordres_transport_affreteur_fkey"
            columns: ["affreteur_id"]
            isOneToOne: false
            referencedRelation: "affreteur_onboardings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_chargement_site_fkey"
            columns: ["chargement_site_id"]
            isOneToOne: false
            referencedRelation: "sites_logistiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_donneur_ordre_fkey"
            columns: ["donneur_ordre_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ot_facture"
            columns: ["facturation_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_livraison_site_fkey"
            columns: ["livraison_site_id"]
            isOneToOne: false
            referencedRelation: "sites_logistiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_remorque_id_fkey"
            columns: ["remorque_id"]
            isOneToOne: false
            referencedRelation: "remorques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      ordres_transport_statut_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          commentaire: string | null
          created_at: string
          id: string
          ot_id: string
          statut_ancien: string | null
          statut_nouveau: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          commentaire?: string | null
          created_at?: string
          id?: string
          ot_id: string
          statut_ancien?: string | null
          statut_nouveau: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          commentaire?: string | null
          created_at?: string
          id?: string
          ot_id?: string
          statut_ancien?: string | null
          statut_nouveau?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordres_transport_statut_history_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_statut_history_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_marge_ot"
            referencedColumns: ["id"]
          },
        ]
      }
      sites_logistiques: {
        Row: {
          adresse: string
          code_postal: string | null
          contact_nom: string | null
          contact_tel: string | null
          created_at: string
          entreprise_id: string | null
          est_depot_relais: boolean
          horaires_ouverture: string | null
          id: string
          jours_ouverture: string | null
          latitude: number | null
          longitude: number | null
          nom: string
          notes: string | null
          notes_livraison: string | null
          pays: string
          type_site: string
          updated_at: string
          usage_type: string
          ville: string | null
        }
        Insert: {
          adresse: string
          code_postal?: string | null
          contact_nom?: string | null
          contact_tel?: string | null
          created_at?: string
          entreprise_id?: string | null
          est_depot_relais?: boolean
          horaires_ouverture?: string | null
          id?: string
          jours_ouverture?: string | null
          latitude?: number | null
          longitude?: number | null
          nom: string
          notes?: string | null
          notes_livraison?: string | null
          pays?: string
          type_site?: string
          updated_at?: string
          usage_type?: string
          ville?: string | null
        }
        Update: {
          adresse?: string
          code_postal?: string | null
          contact_nom?: string | null
          contact_tel?: string | null
          created_at?: string
          entreprise_id?: string | null
          est_depot_relais?: boolean
          horaires_ouverture?: string | null
          id?: string
          jours_ouverture?: string | null
          latitude?: number | null
          longitude?: number | null
          nom?: string
          notes?: string | null
          notes_livraison?: string | null
          pays?: string
          type_site?: string
          updated_at?: string
          usage_type?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_logistiques_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_relais: {
        Row: {
          conducteur_depose_id: string | null
          conducteur_reprise_id: string | null
          created_at: string
          created_by: string | null
          date_depot: string
          date_reprise_prevue: string | null
          date_reprise_reelle: string | null
          id: string
          lieu_adresse: string | null
          lieu_lat: number | null
          lieu_lng: number | null
          lieu_nom: string
          notes: string | null
          ot_id: string
          remorque_depose_id: string | null
          remorque_reprise_id: string | null
          site_id: string | null
          statut: string
          type_relais: string
          updated_at: string
          vehicule_depose_id: string | null
          vehicule_reprise_id: string | null
        }
        Insert: {
          conducteur_depose_id?: string | null
          conducteur_reprise_id?: string | null
          created_at?: string
          created_by?: string | null
          date_depot?: string
          date_reprise_prevue?: string | null
          date_reprise_reelle?: string | null
          id?: string
          lieu_adresse?: string | null
          lieu_lat?: number | null
          lieu_lng?: number | null
          lieu_nom: string
          notes?: string | null
          ot_id: string
          remorque_depose_id?: string | null
          remorque_reprise_id?: string | null
          site_id?: string | null
          statut?: string
          type_relais?: string
          updated_at?: string
          vehicule_depose_id?: string | null
          vehicule_reprise_id?: string | null
        }
        Update: {
          conducteur_depose_id?: string | null
          conducteur_reprise_id?: string | null
          created_at?: string
          created_by?: string | null
          date_depot?: string
          date_reprise_prevue?: string | null
          date_reprise_reelle?: string | null
          id?: string
          lieu_adresse?: string | null
          lieu_lat?: number | null
          lieu_lng?: number | null
          lieu_nom?: string
          notes?: string | null
          ot_id?: string
          remorque_depose_id?: string | null
          remorque_reprise_id?: string | null
          site_id?: string | null
          statut?: string
          type_relais?: string
          updated_at?: string
          vehicule_depose_id?: string | null
          vehicule_reprise_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_relais_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_logistiques"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_reference_sequences: {
        Row: {
          last_value: number
          period_yyyymm: string
          updated_at: string
        }
        Insert: {
          last_value?: number
          period_yyyymm: string
          updated_at?: string
        }
        Update: {
          last_value?: number
          period_yyyymm?: string
          updated_at?: string
        }
        Relationships: []
      }
      remorques: {
        Row: {
          assurance_expiration: string | null
          charge_utile_kg: number | null
          contrat_entretien: boolean
          created_at: string
          ct_expiration: string | null
          cout_achat_ht: number | null
          date_achat: string | null
          date_mise_en_circulation: string | null
          garage_entretien: string | null
          garantie_expiration: string | null
          id: string
          immatriculation: string
          longueur_m: number | null
          marque: string | null
          notes: string | null
          numero_carte_grise: string | null
          preferences: string | null
          prestataire_entretien: string | null
          statut: string
          type_remorque: string
          type_propriete: string | null
          updated_at: string
          vin: string | null
        }
        Insert: {
          assurance_expiration?: string | null
          charge_utile_kg?: number | null
          contrat_entretien?: boolean
          created_at?: string
          ct_expiration?: string | null
          cout_achat_ht?: number | null
          date_achat?: string | null
          date_mise_en_circulation?: string | null
          garage_entretien?: string | null
          garantie_expiration?: string | null
          id?: string
          immatriculation: string
          longueur_m?: number | null
          marque?: string | null
          notes?: string | null
          numero_carte_grise?: string | null
          preferences?: string | null
          prestataire_entretien?: string | null
          statut?: string
          type_remorque?: string
          type_propriete?: string | null
          updated_at?: string
          vin?: string | null
        }
        Update: {
          assurance_expiration?: string | null
          charge_utile_kg?: number | null
          contrat_entretien?: boolean
          created_at?: string
          ct_expiration?: string | null
          cout_achat_ht?: number | null
          date_achat?: string | null
          date_mise_en_circulation?: string | null
          garage_entretien?: string | null
          garantie_expiration?: string | null
          id?: string
          immatriculation?: string
          longueur_m?: number | null
          marque?: string | null
          notes?: string | null
          numero_carte_grise?: string | null
          preferences?: string | null
          prestataire_entretien?: string | null
          statut?: string
          type_remorque?: string
          type_propriete?: string | null
          updated_at?: string
          vin?: string | null
        }
        Relationships: []
      }
      tachygraphe_entrees: {
        Row: {
          conducteur_id: string
          created_at: string
          date_debut: string
          date_fin: string | null
          duree_minutes: number | null
          id: string
          notes: string | null
          ot_id: string | null
          source: string | null
          type_activite: string
          vehicule_id: string | null
        }
        Insert: {
          conducteur_id: string
          created_at?: string
          date_debut: string
          date_fin?: string | null
          duree_minutes?: number | null
          id?: string
          notes?: string | null
          ot_id?: string | null
          source?: string | null
          type_activite: string
          vehicule_id?: string | null
        }
        Update: {
          conducteur_id?: string
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          duree_minutes?: number | null
          id?: string
          notes?: string | null
          ot_id?: string | null
          source?: string | null
          type_activite?: string
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tachygraphe_entrees_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tachygraphe_entrees_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tachygraphe_entrees_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_marge_ot"
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
      vehicules: {
        Row: {
          annee: number | null
          numero_parc: string | null
          assurance_expiration: string | null
          contrat_entretien: boolean
          created_at: string
          ct_expiration: string | null
          cout_achat_ht: number | null
          date_achat: string | null
          date_mise_en_circulation: string | null
          garage_entretien: string | null
          garantie_expiration: string | null
          id: string
          immatriculation: string
          km_actuel: number | null
          marque: string | null
          modele: string | null
          notes: string | null
          numero_carte_grise: string | null
          preferences: string | null
          prestataire_entretien: string | null
          ptac_kg: number | null
          statut: string
          tachy_etalonnage_prochain: string | null
          tachy_serie: string | null
          type_vehicule: string
          type_propriete: string | null
          updated_at: string
          vignette_expiration: string | null
          vin: string | null
        }
        Insert: {
          annee?: number | null
          numero_parc?: string | null
          assurance_expiration?: string | null
          contrat_entretien?: boolean
          created_at?: string
          ct_expiration?: string | null
          cout_achat_ht?: number | null
          date_achat?: string | null
          date_mise_en_circulation?: string | null
          garage_entretien?: string | null
          garantie_expiration?: string | null
          id?: string
          immatriculation: string
          km_actuel?: number | null
          marque?: string | null
          modele?: string | null
          notes?: string | null
          numero_carte_grise?: string | null
          preferences?: string | null
          prestataire_entretien?: string | null
          ptac_kg?: number | null
          statut?: string
          tachy_etalonnage_prochain?: string | null
          tachy_serie?: string | null
          type_vehicule?: string
          type_propriete?: string | null
          updated_at?: string
          vignette_expiration?: string | null
          vin?: string | null
        }
        Update: {
          annee?: number | null
          numero_parc?: string | null
          assurance_expiration?: string | null
          contrat_entretien?: boolean
          created_at?: string
          ct_expiration?: string | null
          cout_achat_ht?: number | null
          date_achat?: string | null
          date_mise_en_circulation?: string | null
          garage_entretien?: string | null
          garantie_expiration?: string | null
          id?: string
          immatriculation?: string
          km_actuel?: number | null
          marque?: string | null
          modele?: string | null
          notes?: string | null
          numero_carte_grise?: string | null
          preferences?: string | null
          prestataire_entretien?: string | null
          ptac_kg?: number | null
          statut?: string
          tachy_etalonnage_prochain?: string | null
          tachy_serie?: string | null
          type_vehicule?: string
          type_propriete?: string | null
          updated_at?: string
          vignette_expiration?: string | null
          vin?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vue_alertes_flotte: {
        Row: {
          alert_type: string | null
          asset_id: string | null
          asset_label: string | null
          asset_type: string | null
          days_remaining: number | null
          due_on: string | null
          id: string | null
          label: string | null
        }
        Relationships: []
      }
      vue_conducteur_alertes: {
        Row: {
          alert_type: string | null
          conducteur_id: string | null
          days_remaining: number | null
          due_on: string | null
          id: string | null
          label: string | null
        }
        Relationships: []
      }
      vue_marge_ot: {
        Row: {
          chiffre_affaires: number | null
          client: string | null
          created_at: string | null
          date_livraison_prevue: string | null
          date_livraison_reelle: string | null
          id: string | null
          marge_brute: number | null
          reference: string | null
          statut: string | null
          taux_marge_pct: number | null
          total_couts: number | null
        }
        Relationships: []
      }
      vue_cout_kilometrique_vehicules: {
        Row: {
          cout_ht: number | null
          cout_km_ht: number | null
          km_parcourus: number | null
          month: string | null
          vehicule_id: string | null
        }
        Relationships: []
      }
      vue_couts_flotte_mensuels: {
        Row: {
          asset_id: string | null
          asset_type: string | null
          month: string | null
          total_cout_ht: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_updated_at_trigger: { Args: { tbl: string }; Returns: undefined }
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

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
