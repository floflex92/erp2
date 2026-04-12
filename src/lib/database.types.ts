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
      absences_rh: {
        Row: {
          commentaire_rh: string | null
          company_id: number | null
          created_at: string
          created_by: string | null
          date_debut: string
          date_fin: string
          date_integration_paie: string | null
          date_validation: string | null
          date_validation_direction: string | null
          date_validation_exploitation: string | null
          employe_id: string
          id: string
          integre_paie_par_id: string | null
          justificatif_url: string | null
          motif: string | null
          nb_jours: number
          statut: string
          type_absence: string
          updated_at: string
          validateur_direction_id: string | null
          validateur_exploitation_id: string | null
          validateur_id: string | null
        }
        Insert: {
          commentaire_rh?: string | null
          company_id?: number | null
          created_at?: string
          created_by?: string | null
          date_debut: string
          date_fin: string
          date_integration_paie?: string | null
          date_validation?: string | null
          date_validation_direction?: string | null
          date_validation_exploitation?: string | null
          employe_id: string
          id?: string
          integre_paie_par_id?: string | null
          justificatif_url?: string | null
          motif?: string | null
          nb_jours?: number
          statut?: string
          type_absence: string
          updated_at?: string
          validateur_direction_id?: string | null
          validateur_exploitation_id?: string | null
          validateur_id?: string | null
        }
        Update: {
          commentaire_rh?: string | null
          company_id?: number | null
          created_at?: string
          created_by?: string | null
          date_debut?: string
          date_fin?: string
          date_integration_paie?: string | null
          date_validation?: string | null
          date_validation_direction?: string | null
          date_validation_exploitation?: string | null
          employe_id?: string
          id?: string
          integre_paie_par_id?: string | null
          justificatif_url?: string | null
          motif?: string | null
          nb_jours?: number
          statut?: string
          type_absence?: string
          updated_at?: string
          validateur_direction_id?: string | null
          validateur_exploitation_id?: string | null
          validateur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "absences_rh_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_rh_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_rh_employe_id_fkey"
            columns: ["employe_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_rh_integre_paie_par_id_fkey"
            columns: ["integre_paie_par_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_rh_validateur_direction_id_fkey"
            columns: ["validateur_direction_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_rh_validateur_exploitation_id_fkey"
            columns: ["validateur_exploitation_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_rh_validateur_id_fkey"
            columns: ["validateur_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      actions_commerciales: {
        Row: {
          commercial_nom: string | null
          created_at: string
          date_action: string
          devis_id: string | null
          duree_minutes: number | null
          id: string
          notes: string
          prospect_id: string
          resultat: string | null
          type_action: string
        }
        Insert: {
          commercial_nom?: string | null
          created_at?: string
          date_action?: string
          devis_id?: string | null
          duree_minutes?: number | null
          id?: string
          notes?: string
          prospect_id: string
          resultat?: string | null
          type_action: string
        }
        Update: {
          commercial_nom?: string | null
          created_at?: string
          date_action?: string
          devis_id?: string | null
          duree_minutes?: number | null
          id?: string
          notes?: string
          prospect_id?: string
          resultat?: string | null
          type_action?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_commerciales_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_commerciales_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
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
          company_id: number
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
          company_id?: number
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
          company_id?: number
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
          {
            foreignKeyName: "adresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "adresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vue_scoring_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "adresses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      affectations: {
        Row: {
          actif: boolean
          company_id: number
          conducteur_id: string
          created_at: string
          date_debut: string | null
          date_fin: string | null
          est_exclusive: boolean
          exploitant_responsable_id: string | null
          id: string
          motif_affectation: string | null
          notes: string | null
          remorque_id: string | null
          type_affectation: string
          updated_at: string
          vehicule_id: string | null
        }
        Insert: {
          actif?: boolean
          company_id?: number
          conducteur_id: string
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          est_exclusive?: boolean
          exploitant_responsable_id?: string | null
          id?: string
          motif_affectation?: string | null
          notes?: string | null
          remorque_id?: string | null
          type_affectation?: string
          updated_at?: string
          vehicule_id?: string | null
        }
        Update: {
          actif?: boolean
          company_id?: number
          conducteur_id?: string
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          est_exclusive?: boolean
          exploitant_responsable_id?: string | null
          id?: string
          motif_affectation?: string | null
          notes?: string | null
          remorque_id?: string | null
          type_affectation?: string
          updated_at?: string
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affectations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "affectations_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_exploitant_responsable_id_fkey"
            columns: ["exploitant_responsable_id"]
            isOneToOne: false
            referencedRelation: "exploitants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_remorque_id_fkey"
            columns: ["remorque_id"]
            isOneToOne: false
            referencedRelation: "remorques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "affectations_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "affectations_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      affectations_audit: {
        Row: {
          affectation_id: string
          changed_at: string
          changed_by: string | null
          changes_json: Json
          company_id: number
          created_at: string
          id: string
          motif: string | null
          new_date_fin: string | null
          new_exploitant_responsable_id: string | null
          old_date_fin: string | null
          old_exploitant_responsable_id: string | null
          operation: string
        }
        Insert: {
          affectation_id: string
          changed_at?: string
          changed_by?: string | null
          changes_json?: Json
          company_id: number
          created_at?: string
          id?: string
          motif?: string | null
          new_date_fin?: string | null
          new_exploitant_responsable_id?: string | null
          old_date_fin?: string | null
          old_exploitant_responsable_id?: string | null
          operation: string
        }
        Update: {
          affectation_id?: string
          changed_at?: string
          changed_by?: string | null
          changes_json?: Json
          company_id?: number
          created_at?: string
          id?: string
          motif?: string | null
          new_date_fin?: string | null
          new_exploitant_responsable_id?: string | null
          old_date_fin?: string | null
          old_exploitant_responsable_id?: string | null
          operation?: string
        }
        Relationships: [
          {
            foreignKeyName: "affectations_audit_affectation_id_fkey"
            columns: ["affectation_id"]
            isOneToOne: false
            referencedRelation: "affectations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_audit_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_audit_new_exploitant_responsable_id_fkey"
            columns: ["new_exploitant_responsable_id"]
            isOneToOne: false
            referencedRelation: "exploitants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_audit_old_exploitant_responsable_id_fkey"
            columns: ["old_exploitant_responsable_id"]
            isOneToOne: false
            referencedRelation: "exploitants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_placement_constraints: {
        Row: {
          conducteur_id: string | null
          created_at: string
          created_by: string | null
          date_debut: string
          date_fin: string
          depot_lat: number | null
          depot_lng: number | null
          id: string
          notes: string | null
          position_ref_lat: number | null
          position_ref_lng: number | null
          rayon_km: number
          retour_depot_avant: string | null
          statut: string
          updated_at: string
          vehicule_id: string
        }
        Insert: {
          conducteur_id?: string | null
          created_at?: string
          created_by?: string | null
          date_debut: string
          date_fin: string
          depot_lat?: number | null
          depot_lng?: number | null
          id?: string
          notes?: string | null
          position_ref_lat?: number | null
          position_ref_lng?: number | null
          rayon_km?: number
          retour_depot_avant?: string | null
          statut?: string
          updated_at?: string
          vehicule_id: string
        }
        Update: {
          conducteur_id?: string | null
          created_at?: string
          created_by?: string | null
          date_debut?: string
          date_fin?: string
          depot_lat?: number | null
          depot_lng?: number | null
          id?: string
          notes?: string | null
          position_ref_lat?: number | null
          position_ref_lng?: number | null
          rayon_km?: number
          retour_depot_avant?: string | null
          statut?: string
          updated_at?: string
          vehicule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_placement_constraints_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_placement_constraints_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "ai_placement_constraints_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_placement_constraints_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "ai_placement_constraints_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "ai_placement_constraints_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_placement_constraints_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      app_error_logs: {
        Row: {
          context: Json | null
          created_at: string
          error_type: string
          id: string
          message: string
          source: string
          stack_trace: string | null
          tenant_key: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          error_type: string
          id?: string
          message: string
          source?: string
          stack_trace?: string | null
          tenant_key?: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          error_type?: string
          id?: string
          message?: string
          source?: string
          stack_trace?: string | null
          tenant_key?: string
        }
        Relationships: []
      }
      bareme_indemnites_transport: {
        Row: {
          annee: number
          created_at: string
          id: string
          libelle: string
          montant_max_exonere: number
          montant_max_fiscal: number
          note: string | null
          source: string
          type_regime: string
        }
        Insert: {
          annee: number
          created_at?: string
          id?: string
          libelle: string
          montant_max_exonere: number
          montant_max_fiscal: number
          note?: string | null
          source?: string
          type_regime: string
        }
        Update: {
          annee?: number
          created_at?: string
          id?: string
          libelle?: string
          montant_max_exonere?: number
          montant_max_fiscal?: number
          note?: string | null
          source?: string
          type_regime?: string
        }
        Relationships: []
      }
      bonus_calculations: {
        Row: {
          calculation_detail: Json
          company_id: number
          created_at: string
          exploitant_id: string | null
          id: string
          is_paid: boolean
          is_validated: boolean
          objectives_count: number
          objectives_met: number
          paid_at: string | null
          payment_reference: string | null
          period_key: string
          profil_id: string | null
          scheme_id: string
          total_after_taxes: number | null
          total_before_taxes: number | null
          total_calculated_bonus: number
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          calculation_detail?: Json
          company_id: number
          created_at?: string
          exploitant_id?: string | null
          id?: string
          is_paid?: boolean
          is_validated?: boolean
          objectives_count?: number
          objectives_met?: number
          paid_at?: string | null
          payment_reference?: string | null
          period_key: string
          profil_id?: string | null
          scheme_id: string
          total_after_taxes?: number | null
          total_before_taxes?: number | null
          total_calculated_bonus?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          calculation_detail?: Json
          company_id?: number
          created_at?: string
          exploitant_id?: string | null
          id?: string
          is_paid?: boolean
          is_validated?: boolean
          objectives_count?: number
          objectives_met?: number
          paid_at?: string | null
          payment_reference?: string | null
          period_key?: string
          profil_id?: string | null
          scheme_id?: string
          total_after_taxes?: number | null
          total_before_taxes?: number | null
          total_calculated_bonus?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bonus_calculations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_calculations_exploitant_id_fkey"
            columns: ["exploitant_id"]
            isOneToOne: false
            referencedRelation: "exploitants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_calculations_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_calculations_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "bonus_schemes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_calculations_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_payroll_accounting_links: {
        Row: {
          bonus_calculation_id: string
          company_id: number
          compta_ecriture_id: string | null
          created_at: string
          error_message: string | null
          id: string
          payroll_period_label: string
          payroll_slip_id: string
          period_key: string
          profil_id: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          bonus_calculation_id: string
          company_id: number
          compta_ecriture_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payroll_period_label: string
          payroll_slip_id: string
          period_key: string
          profil_id?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          bonus_calculation_id?: string
          company_id?: number
          compta_ecriture_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payroll_period_label?: string
          payroll_slip_id?: string
          period_key?: string
          profil_id?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_payroll_accounting_links_bonus_calculation_id_fkey"
            columns: ["bonus_calculation_id"]
            isOneToOne: false
            referencedRelation: "bonus_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_payroll_accounting_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_payroll_accounting_links_compta_ecriture_id_fkey"
            columns: ["compta_ecriture_id"]
            isOneToOne: false
            referencedRelation: "compta_ecritures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_payroll_accounting_links_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_scheme_rules: {
        Row: {
          calculation_order: number | null
          company_id: number
          created_at: string
          formula_params: Json
          formula_type: string | null
          id: string
          minimum_threshold_pct: number
          objective_id: string
          paliers: Json
          scheme_id: string
          weight: number
        }
        Insert: {
          calculation_order?: number | null
          company_id: number
          created_at?: string
          formula_params?: Json
          formula_type?: string | null
          id?: string
          minimum_threshold_pct?: number
          objective_id: string
          paliers?: Json
          scheme_id: string
          weight?: number
        }
        Update: {
          calculation_order?: number | null
          company_id?: number
          created_at?: string
          formula_params?: Json
          formula_type?: string | null
          id?: string
          minimum_threshold_pct?: number
          objective_id?: string
          paliers?: Json
          scheme_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "bonus_scheme_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_scheme_rules_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_scheme_rules_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "bonus_schemes"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_schemes: {
        Row: {
          applies_to_scope_ref_id: string | null
          applies_to_scope_type: string | null
          company_id: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_locked: boolean
          name: string
          period_end: string
          period_start: string
          published_at: string | null
          scheme_type: string
          simulation_mode: boolean
          updated_at: string
        }
        Insert: {
          applies_to_scope_ref_id?: string | null
          applies_to_scope_type?: string | null
          company_id: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_locked?: boolean
          name: string
          period_end: string
          period_start: string
          published_at?: string | null
          scheme_type: string
          simulation_mode?: boolean
          updated_at?: string
        }
        Update: {
          applies_to_scope_ref_id?: string | null
          applies_to_scope_type?: string | null
          company_id?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_locked?: boolean
          name?: string
          period_end?: string
          period_start?: string
          published_at?: string | null
          scheme_type?: string
          simulation_mode?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_schemes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_schemes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletins_paie: {
        Row: {
          acompte_deduction: number
          alertes_conformite: Json
          autres_retenues: number
          base_mensuelle_heures: number
          brut_heures_sup_25: number
          brut_heures_sup_50: number
          brut_soumis_cotisations: number
          coefficient_convention: string | null
          company_id: number | null
          conducteur_id: string | null
          cotisations_patronales: number
          cotisations_salariales: number
          cout_employeur_total: number
          created_at: string
          deduction_absence: number
          depassement_bareme_cotisable: number
          document_nom: string | null
          document_url: string | null
          employe_profil_id: string | null
          frais_ajustement_manuel: number
          frais_auto_valides: number
          genere_par: string | null
          heures_absence: number
          heures_nuit: number
          heures_sup_25: number
          heures_sup_50: number
          heures_travaillees: number
          id: string
          indemnite_grand_routier_exo: number
          indemnite_repas_exo: number
          indemnite_tp_exo: number
          intitule_poste: string | null
          jours_travailles: number
          net_a_payer: number
          net_avant_pas: number
          net_imposable: number
          periode_debut: string
          periode_fin: string
          periode_label: string
          prelevement_source: number
          prime_exceptionnelle: number
          prime_performance: number
          salaire_base_brut: number
          source_heures: string
          statut: string
          taux_horaire: number
          type_contrat: string | null
          updated_at: string
          valide_at: string | null
          valide_par: string | null
        }
        Insert: {
          acompte_deduction?: number
          alertes_conformite?: Json
          autres_retenues?: number
          base_mensuelle_heures?: number
          brut_heures_sup_25?: number
          brut_heures_sup_50?: number
          brut_soumis_cotisations?: number
          coefficient_convention?: string | null
          company_id?: number | null
          conducteur_id?: string | null
          cotisations_patronales?: number
          cotisations_salariales?: number
          cout_employeur_total?: number
          created_at?: string
          deduction_absence?: number
          depassement_bareme_cotisable?: number
          document_nom?: string | null
          document_url?: string | null
          employe_profil_id?: string | null
          frais_ajustement_manuel?: number
          frais_auto_valides?: number
          genere_par?: string | null
          heures_absence?: number
          heures_nuit?: number
          heures_sup_25?: number
          heures_sup_50?: number
          heures_travaillees?: number
          id?: string
          indemnite_grand_routier_exo?: number
          indemnite_repas_exo?: number
          indemnite_tp_exo?: number
          intitule_poste?: string | null
          jours_travailles?: number
          net_a_payer?: number
          net_avant_pas?: number
          net_imposable?: number
          periode_debut: string
          periode_fin: string
          periode_label: string
          prelevement_source?: number
          prime_exceptionnelle?: number
          prime_performance?: number
          salaire_base_brut?: number
          source_heures?: string
          statut?: string
          taux_horaire: number
          type_contrat?: string | null
          updated_at?: string
          valide_at?: string | null
          valide_par?: string | null
        }
        Update: {
          acompte_deduction?: number
          alertes_conformite?: Json
          autres_retenues?: number
          base_mensuelle_heures?: number
          brut_heures_sup_25?: number
          brut_heures_sup_50?: number
          brut_soumis_cotisations?: number
          coefficient_convention?: string | null
          company_id?: number | null
          conducteur_id?: string | null
          cotisations_patronales?: number
          cotisations_salariales?: number
          cout_employeur_total?: number
          created_at?: string
          deduction_absence?: number
          depassement_bareme_cotisable?: number
          document_nom?: string | null
          document_url?: string | null
          employe_profil_id?: string | null
          frais_ajustement_manuel?: number
          frais_auto_valides?: number
          genere_par?: string | null
          heures_absence?: number
          heures_nuit?: number
          heures_sup_25?: number
          heures_sup_50?: number
          heures_travaillees?: number
          id?: string
          indemnite_grand_routier_exo?: number
          indemnite_repas_exo?: number
          indemnite_tp_exo?: number
          intitule_poste?: string | null
          jours_travailles?: number
          net_a_payer?: number
          net_avant_pas?: number
          net_imposable?: number
          periode_debut?: string
          periode_fin?: string
          periode_label?: string
          prelevement_source?: number
          prime_exceptionnelle?: number
          prime_performance?: number
          salaire_base_brut?: number
          source_heures?: string
          statut?: string
          taux_horaire?: number
          type_contrat?: string | null
          updated_at?: string
          valide_at?: string | null
          valide_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulletins_paie_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletins_paie_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletins_paie_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "bulletins_paie_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletins_paie_employe_profil_id_fkey"
            columns: ["employe_profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
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
          code_client: string | null
          code_postal: string | null
          code_postal_facturation: string | null
          company_id: number
          conditions_paiement: number | null
          contact_facturation_email: string | null
          contact_facturation_nom: string | null
          contact_facturation_telephone: string | null
          created_at: string
          email: string | null
          encours_max: number | null
          exclusive_to_service: boolean
          iban: string | null
          id: string
          jour_echeance: number | null
          mode_paiement_defaut: string | null
          nom: string
          notes: string | null
          pays: string | null
          pays_facturation: string | null
          preferred_service_id: string | null
          siret: string | null
          site_web: string | null
          taux_tva_defaut: number | null
          telephone: string | null
          titulaire_compte: string | null
          tva_intra: string | null
          type_client: string
          type_echeance: string | null
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
          code_client?: string | null
          code_postal?: string | null
          code_postal_facturation?: string | null
          company_id?: number
          conditions_paiement?: number | null
          contact_facturation_email?: string | null
          contact_facturation_nom?: string | null
          contact_facturation_telephone?: string | null
          created_at?: string
          email?: string | null
          encours_max?: number | null
          exclusive_to_service?: boolean
          iban?: string | null
          id?: string
          jour_echeance?: number | null
          mode_paiement_defaut?: string | null
          nom: string
          notes?: string | null
          pays?: string | null
          pays_facturation?: string | null
          preferred_service_id?: string | null
          siret?: string | null
          site_web?: string | null
          taux_tva_defaut?: number | null
          telephone?: string | null
          titulaire_compte?: string | null
          tva_intra?: string | null
          type_client?: string
          type_echeance?: string | null
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
          code_client?: string | null
          code_postal?: string | null
          code_postal_facturation?: string | null
          company_id?: number
          conditions_paiement?: number | null
          contact_facturation_email?: string | null
          contact_facturation_nom?: string | null
          contact_facturation_telephone?: string | null
          created_at?: string
          email?: string | null
          encours_max?: number | null
          exclusive_to_service?: boolean
          iban?: string | null
          id?: string
          jour_echeance?: number | null
          mode_paiement_defaut?: string | null
          nom?: string
          notes?: string | null
          pays?: string | null
          pays_facturation?: string | null
          preferred_service_id?: string | null
          siret?: string | null
          site_web?: string | null
          taux_tva_defaut?: number | null
          telephone?: string | null
          titulaire_compte?: string | null
          tva_intra?: string | null
          type_client?: string
          type_echeance?: string | null
          updated_at?: string
          ville?: string | null
          ville_facturation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_preferred_service_id_fkey"
            columns: ["preferred_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          email_domain: string | null
          enabled_modules: Json | null
          id: number
          max_screens: number
          max_users: number
          name: string
          slug: string
          status: string
          subscription_plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_domain?: string | null
          enabled_modules?: Json | null
          id?: number
          max_screens?: number
          max_users?: number
          name: string
          slug: string
          status?: string
          subscription_plan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_domain?: string | null
          enabled_modules?: Json | null
          id?: number
          max_screens?: number
          max_users?: number
          name?: string
          slug?: string
          status?: string
          subscription_plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      compta_audit_evenements: {
        Row: {
          actor_user_id: string | null
          company_id: number
          created_at: string
          entity: string
          entity_id: string | null
          event_type: string
          hash_current: string
          hash_prev: string | null
          id: string
          payload_json: Json
        }
        Insert: {
          actor_user_id?: string | null
          company_id?: number
          created_at?: string
          entity: string
          entity_id?: string | null
          event_type: string
          hash_current: string
          hash_prev?: string | null
          id?: string
          payload_json?: Json
        }
        Update: {
          actor_user_id?: string | null
          company_id?: number
          created_at?: string
          entity?: string
          entity_id?: string | null
          event_type?: string
          hash_current?: string
          hash_prev?: string | null
          id?: string
          payload_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "compta_audit_evenements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compta_ecriture_lignes: {
        Row: {
          axe_camion_id: string | null
          axe_chauffeur_id: string | null
          axe_client_id: string | null
          axe_mission_id: string | null
          axe_tournee_id: string | null
          company_id: number
          compte_code: string
          created_at: string
          credit: number
          debit: number
          devise: string
          ecriture_id: string
          id: string
          libelle_ligne: string | null
          ordre: number
          tiers_client_id: string | null
          updated_at: string
        }
        Insert: {
          axe_camion_id?: string | null
          axe_chauffeur_id?: string | null
          axe_client_id?: string | null
          axe_mission_id?: string | null
          axe_tournee_id?: string | null
          company_id?: number
          compte_code: string
          created_at?: string
          credit?: number
          debit?: number
          devise?: string
          ecriture_id: string
          id?: string
          libelle_ligne?: string | null
          ordre?: number
          tiers_client_id?: string | null
          updated_at?: string
        }
        Update: {
          axe_camion_id?: string | null
          axe_chauffeur_id?: string | null
          axe_client_id?: string | null
          axe_mission_id?: string | null
          axe_tournee_id?: string | null
          company_id?: number
          compte_code?: string
          created_at?: string
          credit?: number
          debit?: number
          devise?: string
          ecriture_id?: string
          id?: string
          libelle_ligne?: string | null
          ordre?: number
          tiers_client_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compta_ecriture_lignes_axe_client_id_fkey"
            columns: ["axe_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_axe_client_id_fkey"
            columns: ["axe_client_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_axe_client_id_fkey"
            columns: ["axe_client_id"]
            isOneToOne: false
            referencedRelation: "vue_scoring_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_axe_mission_id_fkey"
            columns: ["axe_mission_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_axe_mission_id_fkey"
            columns: ["axe_mission_id"]
            isOneToOne: false
            referencedRelation: "v_cout_salarial_ot"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_axe_mission_id_fkey"
            columns: ["axe_mission_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_axe_mission_id_fkey"
            columns: ["axe_mission_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["ot_suivant_id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_axe_mission_id_fkey"
            columns: ["axe_mission_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_non_affectes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_axe_mission_id_fkey"
            columns: ["axe_mission_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_axe_mission_id_fkey"
            columns: ["axe_mission_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_axe_mission_id_fkey"
            columns: ["axe_mission_id"]
            isOneToOne: false
            referencedRelation: "vue_marge_ot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_compte_code_fkey"
            columns: ["compte_code"]
            isOneToOne: false
            referencedRelation: "compta_plan_comptable"
            referencedColumns: ["code_compte"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_ecriture_id_fkey"
            columns: ["ecriture_id"]
            isOneToOne: false
            referencedRelation: "compta_ecritures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_tiers_client_id_fkey"
            columns: ["tiers_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_tiers_client_id_fkey"
            columns: ["tiers_client_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "compta_ecriture_lignes_tiers_client_id_fkey"
            columns: ["tiers_client_id"]
            isOneToOne: false
            referencedRelation: "vue_scoring_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      compta_ecritures: {
        Row: {
          company_id: number
          created_at: string
          created_by: string | null
          date_ecriture: string
          exercice: number
          id: string
          journal_id: string
          libelle: string
          numero_mouvement: number
          piece_id: string | null
          statut: string
          updated_at: string
          valide_at: string | null
        }
        Insert: {
          company_id?: number
          created_at?: string
          created_by?: string | null
          date_ecriture?: string
          exercice?: number
          id?: string
          journal_id: string
          libelle: string
          numero_mouvement: number
          piece_id?: string | null
          statut?: string
          updated_at?: string
          valide_at?: string | null
        }
        Update: {
          company_id?: number
          created_at?: string
          created_by?: string | null
          date_ecriture?: string
          exercice?: number
          id?: string
          journal_id?: string
          libelle?: string
          numero_mouvement?: number
          piece_id?: string | null
          statut?: string
          updated_at?: string
          valide_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compta_ecritures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compta_ecritures_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "compta_journaux"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compta_ecritures_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "compta_pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      compta_factures_fournisseurs: {
        Row: {
          company_id: number
          compte_charge_code: string
          compte_fournisseur_code: string
          compte_tva_deductible_code: string
          created_at: string
          created_by: string | null
          date_echeance: string | null
          date_facture: string
          date_paiement: string | null
          fournisseur_nom: string
          id: string
          mode_paiement: string | null
          montant_ht: number
          montant_ttc: number | null
          montant_tva: number
          notes: string | null
          numero: string
          source_id: string | null
          source_table: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          company_id?: number
          compte_charge_code?: string
          compte_fournisseur_code?: string
          compte_tva_deductible_code?: string
          created_at?: string
          created_by?: string | null
          date_echeance?: string | null
          date_facture: string
          date_paiement?: string | null
          fournisseur_nom: string
          id?: string
          mode_paiement?: string | null
          montant_ht?: number
          montant_ttc?: number | null
          montant_tva?: number
          notes?: string | null
          numero: string
          source_id?: string | null
          source_table?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          company_id?: number
          compte_charge_code?: string
          compte_fournisseur_code?: string
          compte_tva_deductible_code?: string
          created_at?: string
          created_by?: string | null
          date_echeance?: string | null
          date_facture?: string
          date_paiement?: string | null
          fournisseur_nom?: string
          id?: string
          mode_paiement?: string | null
          montant_ht?: number
          montant_ttc?: number | null
          montant_tva?: number
          notes?: string | null
          numero?: string
          source_id?: string | null
          source_table?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compta_factures_fournisseurs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compta_factures_fournisseurs_compte_charge_code_fkey"
            columns: ["compte_charge_code"]
            isOneToOne: false
            referencedRelation: "compta_plan_comptable"
            referencedColumns: ["code_compte"]
          },
          {
            foreignKeyName: "compta_factures_fournisseurs_compte_fournisseur_code_fkey"
            columns: ["compte_fournisseur_code"]
            isOneToOne: false
            referencedRelation: "compta_plan_comptable"
            referencedColumns: ["code_compte"]
          },
          {
            foreignKeyName: "compta_factures_fournisseurs_compte_tva_deductible_code_fkey"
            columns: ["compte_tva_deductible_code"]
            isOneToOne: false
            referencedRelation: "compta_plan_comptable"
            referencedColumns: ["code_compte"]
          },
        ]
      }
      compta_fec_exports: {
        Row: {
          checksum_sha256: string
          chemin_fichier: string | null
          company_id: number
          date_export: string
          exercice: number
          genere_par: string | null
          id: string
        }
        Insert: {
          checksum_sha256: string
          chemin_fichier?: string | null
          company_id?: number
          date_export?: string
          exercice: number
          genere_par?: string | null
          id?: string
        }
        Update: {
          checksum_sha256?: string
          chemin_fichier?: string | null
          company_id?: number
          date_export?: string
          exercice?: number
          genere_par?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compta_fec_exports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compta_journal_manuel: {
        Row: {
          compte: string
          created_at: string
          created_by: string | null
          credit: number
          date: string
          debit: number
          id: string
          libelle: string
          updated_at: string
        }
        Insert: {
          compte: string
          created_at?: string
          created_by?: string | null
          credit?: number
          date: string
          debit?: number
          id?: string
          libelle: string
          updated_at?: string
        }
        Update: {
          compte?: string
          created_at?: string
          created_by?: string | null
          credit?: number
          date?: string
          debit?: number
          id?: string
          libelle?: string
          updated_at?: string
        }
        Relationships: []
      }
      compta_journaux: {
        Row: {
          actif: boolean
          code_journal: string
          company_id: number
          created_at: string
          id: string
          libelle: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          code_journal: string
          company_id?: number
          created_at?: string
          id?: string
          libelle: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          code_journal?: string
          company_id?: number
          created_at?: string
          id?: string
          libelle?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compta_journaux_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compta_pieces: {
        Row: {
          company_id: number
          created_at: string
          date_piece: string
          id: string
          numero_piece: string
          source_id: string | null
          source_table: string | null
          type_piece: string
          updated_at: string
        }
        Insert: {
          company_id?: number
          created_at?: string
          date_piece?: string
          id?: string
          numero_piece: string
          source_id?: string | null
          source_table?: string | null
          type_piece: string
          updated_at?: string
        }
        Update: {
          company_id?: number
          created_at?: string
          date_piece?: string
          id?: string
          numero_piece?: string
          source_id?: string | null
          source_table?: string | null
          type_piece?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compta_pieces_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compta_plan_comptable: {
        Row: {
          actif: boolean
          classe: number
          code_compte: string
          company_id: number
          created_at: string
          libelle: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          classe: number
          code_compte: string
          company_id?: number
          created_at?: string
          libelle: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          classe?: number
          code_compte?: string
          company_id?: number
          created_at?: string
          libelle?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compta_plan_comptable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compta_tva_lignes: {
        Row: {
          base_ht: number
          code_case: string
          company_id: number
          created_at: string
          id: string
          montant_tva: number
          origine: string
          periode_id: string
          updated_at: string
        }
        Insert: {
          base_ht?: number
          code_case: string
          company_id?: number
          created_at?: string
          id?: string
          montant_tva?: number
          origine?: string
          periode_id: string
          updated_at?: string
        }
        Update: {
          base_ht?: number
          code_case?: string
          company_id?: number
          created_at?: string
          id?: string
          montant_tva?: number
          origine?: string
          periode_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compta_tva_lignes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compta_tva_lignes_periode_id_fkey"
            columns: ["periode_id"]
            isOneToOne: false
            referencedRelation: "compta_tva_periodes"
            referencedColumns: ["id"]
          },
        ]
      }
      compta_tva_periodes: {
        Row: {
          annee: number
          company_id: number
          created_at: string
          date_debut: string
          date_fin: string
          id: string
          periode_index: number
          periode_type: string
          statut: string
          updated_at: string
        }
        Insert: {
          annee: number
          company_id?: number
          created_at?: string
          date_debut: string
          date_fin: string
          id?: string
          periode_index: number
          periode_type: string
          statut?: string
          updated_at?: string
        }
        Update: {
          annee?: number
          company_id?: number
          created_at?: string
          date_debut?: string
          date_fin?: string
          id?: string
          periode_index?: number
          periode_type?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compta_tva_periodes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compta_tva_regles: {
        Row: {
          actif: boolean
          code_tva: string
          company_id: number
          compte_collectee: string
          compte_deductible: string
          created_at: string
          id: string
          regime: string
          taux: number
          updated_at: string
        }
        Insert: {
          actif?: boolean
          code_tva: string
          company_id?: number
          compte_collectee: string
          compte_deductible: string
          created_at?: string
          id?: string
          regime: string
          taux: number
          updated_at?: string
        }
        Update: {
          actif?: boolean
          code_tva?: string
          company_id?: number
          compte_collectee?: string
          compte_deductible?: string
          created_at?: string
          id?: string
          regime?: string
          taux?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compta_tva_regles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compta_tva_regles_compte_collectee_fkey"
            columns: ["compte_collectee"]
            isOneToOne: false
            referencedRelation: "compta_plan_comptable"
            referencedColumns: ["code_compte"]
          },
          {
            foreignKeyName: "compta_tva_regles_compte_deductible_fkey"
            columns: ["compte_deductible"]
            isOneToOne: false
            referencedRelation: "compta_plan_comptable"
            referencedColumns: ["code_compte"]
          },
        ]
      }
      conducteur_documents: {
        Row: {
          archived_at: string | null
          category: string
          company_id: number
          conducteur_id: string
          created_at: string
          expires_at: string | null
          file_name: string
          file_path: string
          id: string
          is_mandatory: boolean
          issued_at: string | null
          mime_type: string | null
          notes: string | null
          storage_bucket: string | null
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category?: string
          company_id?: number
          conducteur_id: string
          created_at?: string
          expires_at?: string | null
          file_name: string
          file_path: string
          id?: string
          is_mandatory?: boolean
          issued_at?: string | null
          mime_type?: string | null
          notes?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          company_id?: number
          conducteur_id?: string
          created_at?: string
          expires_at?: string | null
          file_name?: string
          file_path?: string
          id?: string
          is_mandatory?: boolean
          issued_at?: string | null
          mime_type?: string | null
          notes?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conducteur_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conducteur_documents_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conducteur_documents_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "conducteur_documents_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["id"]
          },
        ]
      }
      conducteur_evenements_rh: {
        Row: {
          company_id: number
          conducteur_id: string
          created_at: string
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
          company_id?: number
          conducteur_id: string
          created_at?: string
          description?: string | null
          document_id?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          reminder_at?: string | null
          severity?: string
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: number
          conducteur_id?: string
          created_at?: string
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
            foreignKeyName: "conducteur_evenements_rh_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conducteur_evenements_rh_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conducteur_evenements_rh_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "conducteur_evenements_rh_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
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
      conducteurs: {
        Row: {
          adresse: string | null
          carte_tachy_expiration: string | null
          carte_tachy_numero: string | null
          company_id: number
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
          poste: string | null
          preferences: string | null
          prenom: string
          primary_service_id: string | null
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
          company_id?: number
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
          poste?: string | null
          preferences?: string | null
          prenom: string
          primary_service_id?: string | null
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
          company_id?: number
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
          poste?: string | null
          preferences?: string | null
          prenom?: string
          primary_service_id?: string | null
          recyclage_date?: string | null
          recyclage_expiration?: string | null
          statut?: string
          telephone?: string | null
          type_contrat?: string | null
          updated_at?: string
          visite_medicale_date?: string | null
          visite_medicale_expiration?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conducteurs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conducteurs_primary_service_id_fkey"
            columns: ["primary_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      config_entreprise: {
        Row: {
          cle: string
          company_id: number
          description: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
          valeur: Json
        }
        Insert: {
          cle: string
          company_id?: number
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          valeur?: Json
        }
        Update: {
          cle?: string
          company_id?: number
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          valeur?: Json
        }
        Relationships: [
          {
            foreignKeyName: "config_entreprise_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_entreprise_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string
          company_id: number
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
          company_id?: number
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
          company_id?: number
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
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vue_scoring_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts_prospects: {
        Row: {
          canal_preference: string
          created_at: string
          email: string | null
          est_principal: boolean
          id: string
          nom: string
          notes: string | null
          poste: string | null
          prenom: string | null
          prospect_id: string
          telephone: string | null
        }
        Insert: {
          canal_preference?: string
          created_at?: string
          email?: string | null
          est_principal?: boolean
          id?: string
          nom: string
          notes?: string | null
          poste?: string | null
          prenom?: string | null
          prospect_id: string
          telephone?: string | null
        }
        Update: {
          canal_preference?: string
          created_at?: string
          email?: string | null
          est_principal?: boolean
          id?: string
          nom?: string
          notes?: string | null
          poste?: string | null
          prenom?: string | null
          prospect_id?: string
          telephone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_prospects_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      course_templates: {
        Row: {
          chargement_site_id: string | null
          client_id: string | null
          created_at: string | null
          distance_km: number | null
          duree_heures: number | null
          id: string
          label: string
          livraison_site_id: string | null
          nature_marchandise: string | null
          notes: string | null
          type_transport: string | null
          updated_at: string | null
        }
        Insert: {
          chargement_site_id?: string | null
          client_id?: string | null
          created_at?: string | null
          distance_km?: number | null
          duree_heures?: number | null
          id?: string
          label: string
          livraison_site_id?: string | null
          nature_marchandise?: string | null
          notes?: string | null
          type_transport?: string | null
          updated_at?: string | null
        }
        Update: {
          chargement_site_id?: string | null
          client_id?: string | null
          created_at?: string | null
          distance_km?: number | null
          duree_heures?: number | null
          id?: string
          label?: string
          livraison_site_id?: string | null
          nature_marchandise?: string | null
          notes?: string | null
          type_transport?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_templates_chargement_site_id_fkey"
            columns: ["chargement_site_id"]
            isOneToOne: false
            referencedRelation: "sites_logistiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "course_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vue_scoring_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "course_templates_livraison_site_id_fkey"
            columns: ["livraison_site_id"]
            isOneToOne: false
            referencedRelation: "sites_logistiques"
            referencedColumns: ["id"]
          },
        ]
      }
      course_transfers: {
        Row: {
          approval_deadline: string | null
          approval_reason: string | null
          approved_at: string | null
          company_id: number
          conductor_transfer: boolean
          created_at: string
          equipment_transfer: boolean
          executed_at: string | null
          from_exploitant_id: string
          id: string
          motif: string
          needs_approval: boolean
          notes: string | null
          ot_id: string
          requested_by: string | null
          status: string
          to_exploitant_id: string
          updated_at: string
          validated_by: string | null
        }
        Insert: {
          approval_deadline?: string | null
          approval_reason?: string | null
          approved_at?: string | null
          company_id: number
          conductor_transfer?: boolean
          created_at?: string
          equipment_transfer?: boolean
          executed_at?: string | null
          from_exploitant_id: string
          id?: string
          motif: string
          needs_approval?: boolean
          notes?: string | null
          ot_id: string
          requested_by?: string | null
          status?: string
          to_exploitant_id: string
          updated_at?: string
          validated_by?: string | null
        }
        Update: {
          approval_deadline?: string | null
          approval_reason?: string | null
          approved_at?: string | null
          company_id?: number
          conductor_transfer?: boolean
          created_at?: string
          equipment_transfer?: boolean
          executed_at?: string | null
          from_exploitant_id?: string
          id?: string
          motif?: string
          needs_approval?: boolean
          notes?: string | null
          ot_id?: string
          requested_by?: string | null
          status?: string
          to_exploitant_id?: string
          updated_at?: string
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_transfers_from_exploitant_id_fkey"
            columns: ["from_exploitant_id"]
            isOneToOne: false
            referencedRelation: "exploitants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_transfers_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_transfers_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_cout_salarial_ot"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "course_transfers_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_transfers_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["ot_suivant_id"]
          },
          {
            foreignKeyName: "course_transfers_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_non_affectes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_transfers_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_transfers_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "course_transfers_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_marge_ot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_transfers_to_exploitant_id_fkey"
            columns: ["to_exploitant_id"]
            isOneToOne: false
            referencedRelation: "exploitants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_transfers_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      couts_mission: {
        Row: {
          company_id: number
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
          company_id?: number
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
          company_id?: number
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
            foreignKeyName: "couts_mission_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "v_cout_salarial_ot"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "couts_mission_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couts_mission_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["ot_suivant_id"]
          },
          {
            foreignKeyName: "couts_mission_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_non_affectes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couts_mission_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couts_mission_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["ot_id"]
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
      demo_access_requests: {
        Row: {
          created_at: string | null
          description: string | null
          email: string
          id: string
          ip_address: unknown
          nom: string
          nom_entreprise: string | null
          nombre_salaries: string | null
          objectif: string
          prenom: string
          secteur_activite: string | null
          statut: string | null
          telephone: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          email: string
          id?: string
          ip_address?: unknown
          nom: string
          nom_entreprise?: string | null
          nombre_salaries?: string | null
          objectif: string
          prenom: string
          secteur_activite?: string | null
          statut?: string | null
          telephone?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          nom?: string
          nom_entreprise?: string | null
          nombre_salaries?: string | null
          objectif?: string
          prenom?: string
          secteur_activite?: string | null
          statut?: string | null
          telephone?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      devis_transport: {
        Row: {
          client_id: string | null
          commercial_nom: string | null
          cout_estime_ht: number | null
          created_at: string
          date_envoi: string | null
          date_reponse: string | null
          date_validite: string | null
          destination: string
          distance_km: number | null
          id: string
          marge_estime_ht: number | null
          marge_pct: number | null
          notes: string | null
          numero: string
          origine: string
          ot_reference: string | null
          poids_kg: number | null
          prix_propose_ht: number | null
          prospect_id: string | null
          statut: string
          taux_tva: number | null
          type_transport: string
          updated_at: string
          volume_m3: number | null
        }
        Insert: {
          client_id?: string | null
          commercial_nom?: string | null
          cout_estime_ht?: number | null
          created_at?: string
          date_envoi?: string | null
          date_reponse?: string | null
          date_validite?: string | null
          destination: string
          distance_km?: number | null
          id?: string
          marge_estime_ht?: number | null
          marge_pct?: number | null
          notes?: string | null
          numero: string
          origine: string
          ot_reference?: string | null
          poids_kg?: number | null
          prix_propose_ht?: number | null
          prospect_id?: string | null
          statut?: string
          taux_tva?: number | null
          type_transport?: string
          updated_at?: string
          volume_m3?: number | null
        }
        Update: {
          client_id?: string | null
          commercial_nom?: string | null
          cout_estime_ht?: number | null
          created_at?: string
          date_envoi?: string | null
          date_reponse?: string | null
          date_validite?: string | null
          destination?: string
          distance_km?: number | null
          id?: string
          marge_estime_ht?: number | null
          marge_pct?: number | null
          notes?: string | null
          numero?: string
          origine?: string
          ot_reference?: string | null
          poids_kg?: number | null
          prix_propose_ht?: number | null
          prospect_id?: string | null
          statut?: string
          taux_tva?: number | null
          type_transport?: string
          updated_at?: string
          volume_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "devis_transport_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_transport_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "devis_transport_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vue_scoring_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "devis_transport_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: number
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
          company_id?: number
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
          company_id?: number
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
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "v_cout_salarial_ot"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "documents_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["ot_suivant_id"]
          },
          {
            foreignKeyName: "documents_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_non_affectes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["ot_id"]
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
      driver_group_members: {
        Row: {
          added_at: string
          added_by: string | null
          conducteur_id: string
          group_id: string
          id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          conducteur_id: string
          group_id: string
          id?: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          conducteur_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_group_members_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_group_members_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "driver_group_members_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "driver_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_groups: {
        Row: {
          couleur: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          nom: string
          updated_at: string
        }
        Insert: {
          couleur?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          nom: string
          updated_at?: string
        }
        Update: {
          couleur?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          nom?: string
          updated_at?: string
        }
        Relationships: []
      }
      entretiens: {
        Row: {
          company_id: number
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
          company_id?: number
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
          company_id?: number
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
            foreignKeyName: "entretiens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entretiens_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "entretiens_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "entretiens_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entretiens_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      entretiens_rh: {
        Row: {
          company_id: number
          created_at: string
          created_by: string | null
          date_planifiee: string
          date_suivi_prevu: string | null
          description: string | null
          documents_id: string[] | null
          duree_minutes: number | null
          employe_id: string
          evaluateur_id: string | null
          heure_debut: string | null
          id: string
          notes_evaluation: string | null
          resultat: string | null
          statut: string
          suivi_requis: boolean | null
          titre: string
          type: string
          updated_at: string
        }
        Insert: {
          company_id?: number
          created_at?: string
          created_by?: string | null
          date_planifiee: string
          date_suivi_prevu?: string | null
          description?: string | null
          documents_id?: string[] | null
          duree_minutes?: number | null
          employe_id: string
          evaluateur_id?: string | null
          heure_debut?: string | null
          id?: string
          notes_evaluation?: string | null
          resultat?: string | null
          statut?: string
          suivi_requis?: boolean | null
          titre: string
          type: string
          updated_at?: string
        }
        Update: {
          company_id?: number
          created_at?: string
          created_by?: string | null
          date_planifiee?: string
          date_suivi_prevu?: string | null
          description?: string | null
          documents_id?: string[] | null
          duree_minutes?: number | null
          employe_id?: string
          evaluateur_id?: string | null
          heure_debut?: string | null
          id?: string
          notes_evaluation?: string | null
          resultat?: string | null
          statut?: string
          suivi_requis?: boolean | null
          titre?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entretiens_rh_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_v11_tenants: {
        Row: {
          allowed_pages: Json
          company_id: number | null
          created_at: string
          default_max_concurrent_screens: number
          display_name: string
          id: string
          is_active: boolean
          tenant_key: string
          updated_at: string
        }
        Insert: {
          allowed_pages?: Json
          company_id?: number | null
          created_at?: string
          default_max_concurrent_screens?: number
          display_name: string
          id?: string
          is_active?: boolean
          tenant_key: string
          updated_at?: string
        }
        Update: {
          allowed_pages?: Json
          company_id?: number | null
          created_at?: string
          default_max_concurrent_screens?: number
          display_name?: string
          id?: string
          is_active?: boolean
          tenant_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_v11_tenants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      etapes_mission: {
        Row: {
          adresse_id: string | null
          adresse_libre: string | null
          code_postal: string | null
          company_id: number
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
          company_id?: number
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
          company_id?: number
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
            foreignKeyName: "etapes_mission_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "v_cout_salarial_ot"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "etapes_mission_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapes_mission_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["ot_suivant_id"]
          },
          {
            foreignKeyName: "etapes_mission_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_non_affectes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapes_mission_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etapes_mission_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["ot_id"]
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
      exploitants: {
        Row: {
          archived_at: string | null
          company_department: string | null
          company_id: number
          created_at: string
          id: string
          is_active: boolean
          is_manager: boolean
          manager_level: number
          name: string
          profil_id: string | null
          service_id: string
          type_exploitant: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_department?: string | null
          company_id: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_manager?: boolean
          manager_level?: number
          name: string
          profil_id?: string | null
          service_id: string
          type_exploitant?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_department?: string | null
          company_id?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_manager?: boolean
          manager_level?: number
          name?: string
          profil_id?: string | null
          service_id?: string
          type_exploitant?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exploitants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exploitants_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exploitants_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          client_id: string
          company_id: number
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
          company_id?: number
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
          company_id?: number
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
            foreignKeyName: "factures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "factures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vue_scoring_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "factures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "v_cout_salarial_ot"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "factures_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["ot_suivant_id"]
          },
          {
            foreignKeyName: "factures_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_non_affectes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["ot_id"]
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
      flotte_documents: {
        Row: {
          archived_at: string | null
          category: string
          company_id: number
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
          company_id?: number
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
          company_id?: number
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
            foreignKeyName: "flotte_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "flotte_documents_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "flotte_documents_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flotte_documents_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      flotte_entretiens: {
        Row: {
          company_id: number
          cout_ht: number
          cout_ttc: number | null
          covered_by_contract: boolean
          created_at: string
          created_by: string | null
          date_debut_reelle: string | null
          date_fin_reelle: string | null
          garage: string | null
          id: string
          invoice_document_id: string | null
          km_compteur: number | null
          maintenance_type: string
          mecanicien_assign: string | null
          next_due_date: string | null
          next_due_km: number | null
          notes: string | null
          prestataire: string | null
          priority: string | null
          remorque_id: string | null
          service_date: string
          statut: string | null
          updated_at: string
          vehicule_id: string | null
        }
        Insert: {
          company_id?: number
          cout_ht?: number
          cout_ttc?: number | null
          covered_by_contract?: boolean
          created_at?: string
          created_by?: string | null
          date_debut_reelle?: string | null
          date_fin_reelle?: string | null
          garage?: string | null
          id?: string
          invoice_document_id?: string | null
          km_compteur?: number | null
          maintenance_type: string
          mecanicien_assign?: string | null
          next_due_date?: string | null
          next_due_km?: number | null
          notes?: string | null
          prestataire?: string | null
          priority?: string | null
          remorque_id?: string | null
          service_date: string
          statut?: string | null
          updated_at?: string
          vehicule_id?: string | null
        }
        Update: {
          company_id?: number
          cout_ht?: number
          cout_ttc?: number | null
          covered_by_contract?: boolean
          created_at?: string
          created_by?: string | null
          date_debut_reelle?: string | null
          date_fin_reelle?: string | null
          garage?: string | null
          id?: string
          invoice_document_id?: string | null
          km_compteur?: number | null
          maintenance_type?: string
          mecanicien_assign?: string | null
          next_due_date?: string | null
          next_due_km?: number | null
          notes?: string | null
          prestataire?: string | null
          priority?: string | null
          remorque_id?: string | null
          service_date?: string
          statut?: string | null
          updated_at?: string
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flotte_entretiens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "flotte_entretiens_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "flotte_entretiens_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flotte_entretiens_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      fournisseurs_maintenance: {
        Row: {
          adresse: string | null
          conditions_paiement: string | null
          contact_nom: string | null
          contrat_actif: boolean | null
          created_at: string
          delai_livraison: string | null
          email: string | null
          id: string
          nom: string
          note_qualite: number | null
          notes: string | null
          telephone: string | null
          type_service: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          conditions_paiement?: string | null
          contact_nom?: string | null
          contrat_actif?: boolean | null
          created_at?: string
          delai_livraison?: string | null
          email?: string | null
          id?: string
          nom: string
          note_qualite?: number | null
          notes?: string | null
          telephone?: string | null
          type_service?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          conditions_paiement?: string | null
          contact_nom?: string | null
          contrat_actif?: boolean | null
          created_at?: string
          delai_livraison?: string | null
          email?: string | null
          id?: string
          nom?: string
          note_qualite?: number | null
          notes?: string | null
          telephone?: string | null
          type_service?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      historique_statuts: {
        Row: {
          commentaire: string | null
          company_id: number
          created_at: string
          created_by: string | null
          id: string
          ot_id: string
          statut_ancien: string | null
          statut_nouveau: string
        }
        Insert: {
          commentaire?: string | null
          company_id?: number
          created_at?: string
          created_by?: string | null
          id?: string
          ot_id: string
          statut_ancien?: string | null
          statut_nouveau: string
        }
        Update: {
          commentaire?: string | null
          company_id?: number
          created_at?: string
          created_by?: string | null
          id?: string
          ot_id?: string
          statut_ancien?: string | null
          statut_nouveau?: string
        }
        Relationships: [
          {
            foreignKeyName: "historique_statuts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "v_cout_salarial_ot"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "historique_statuts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historique_statuts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["ot_suivant_id"]
          },
          {
            foreignKeyName: "historique_statuts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_non_affectes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historique_statuts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historique_statuts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["ot_id"]
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
      impersonation_logs: {
        Row: {
          admin_email: string
          admin_user_id: string
          created_at: string
          ended_at: string | null
          id: string
          ip_hash: string | null
          is_active: boolean
          reason: string | null
          started_at: string
          target_company_id: number
          target_email: string
          target_user_id: string
        }
        Insert: {
          admin_email: string
          admin_user_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          ip_hash?: string | null
          is_active?: boolean
          reason?: string | null
          started_at?: string
          target_company_id: number
          target_email: string
          target_user_id: string
        }
        Update: {
          admin_email?: string
          admin_user_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          ip_hash?: string | null
          is_active?: boolean
          reason?: string | null
          started_at?: string
          target_company_id?: number
          target_email?: string
          target_user_id?: string
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
          admin_user_id: string
          created_at: string
          expires_at: string
          id: string
          impersonated_by: string
          is_impersonating: boolean
          log_id: string
          target_company_id: number
          target_user_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          expires_at?: string
          id?: string
          impersonated_by: string
          is_impersonating?: boolean
          log_id: string
          target_company_id: number
          target_user_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          impersonated_by?: string
          is_impersonating?: boolean
          log_id?: string
          target_company_id?: number
          target_user_id?: string
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
      imprevu_exploitation: {
        Row: {
          action_prise: string | null
          company_id: number | null
          conducteur_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          notif_client_envoyee: boolean
          ot_id: string | null
          priorite: string
          resolved_at: string | null
          resolved_by: string | null
          statut: string
          titre: string
          type: string
          updated_at: string
          vehicule_id: string | null
        }
        Insert: {
          action_prise?: string | null
          company_id?: number | null
          conducteur_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          notif_client_envoyee?: boolean
          ot_id?: string | null
          priorite?: string
          resolved_at?: string | null
          resolved_by?: string | null
          statut?: string
          titre: string
          type: string
          updated_at?: string
          vehicule_id?: string | null
        }
        Update: {
          action_prise?: string | null
          company_id?: number | null
          conducteur_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          notif_client_envoyee?: boolean
          ot_id?: string | null
          priorite?: string
          resolved_at?: string | null
          resolved_by?: string | null
          statut?: string
          titre?: string
          type?: string
          updated_at?: string
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imprevu_exploitation_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_cout_salarial_ot"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["ot_suivant_id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_non_affectes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_marge_ot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imprevu_exploitation_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      kpi_alerts: {
        Row: {
          actual_value: number | null
          alert_threshold: number | null
          alert_type: string
          company_id: number
          created_at: string
          id: string
          is_acknowledged: boolean
          kpi_id: string
          scope_ref_id: string | null
          scope_type: string | null
          severity: string
        }
        Insert: {
          actual_value?: number | null
          alert_threshold?: number | null
          alert_type: string
          company_id: number
          created_at?: string
          id?: string
          is_acknowledged?: boolean
          kpi_id: string
          scope_ref_id?: string | null
          scope_type?: string | null
          severity?: string
        }
        Update: {
          actual_value?: number | null
          alert_threshold?: number | null
          alert_type?: string
          company_id?: number
          created_at?: string
          id?: string
          is_acknowledged?: boolean
          kpi_id?: string
          scope_ref_id?: string | null
          scope_type?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_alerts_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          applicable_periods: string[]
          category: string
          code: string
          company_id: number
          created_at: string
          data_source: string | null
          decimals: number
          description: string | null
          formula_definition: Json
          formula_type: string
          id: string
          is_active: boolean
          multi_scope: boolean
          name: string
          query_template: string | null
          scope_type: string
          subcategory: string | null
          unit: string | null
          updated_at: string
          version: number
        }
        Insert: {
          applicable_periods?: string[]
          category: string
          code: string
          company_id: number
          created_at?: string
          data_source?: string | null
          decimals?: number
          description?: string | null
          formula_definition?: Json
          formula_type: string
          id?: string
          is_active?: boolean
          multi_scope?: boolean
          name: string
          query_template?: string | null
          scope_type: string
          subcategory?: string | null
          unit?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          applicable_periods?: string[]
          category?: string
          code?: string
          company_id?: number
          created_at?: string
          data_source?: string | null
          decimals?: number
          description?: string | null
          formula_definition?: Json
          formula_type?: string
          id?: string
          is_active?: boolean
          multi_scope?: boolean
          name?: string
          query_template?: string | null
          scope_type?: string
          subcategory?: string | null
          unit?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_definitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_snapshots: {
        Row: {
          calculated_at: string | null
          company_id: number
          created_at: string
          data_count: number | null
          formula_version: number
          id: string
          is_complete: boolean
          kpi_id: string
          metric_value: number | null
          period_key: string
          period_type: string
          scope_ref_id: string | null
          scope_type: string
          unit: string | null
        }
        Insert: {
          calculated_at?: string | null
          company_id: number
          created_at?: string
          data_count?: number | null
          formula_version?: number
          id?: string
          is_complete?: boolean
          kpi_id: string
          metric_value?: number | null
          period_key: string
          period_type: string
          scope_ref_id?: string | null
          scope_type: string
          unit?: string | null
        }
        Update: {
          calculated_at?: string | null
          company_id?: number
          created_at?: string
          data_count?: number | null
          formula_version?: number
          id?: string
          is_complete?: boolean
          kpi_id?: string
          metric_value?: number | null
          period_key?: string
          period_type?: string
          scope_ref_id?: string | null
          scope_type?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_snapshots_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      mouvements_bancaires: {
        Row: {
          compte_bancaire: string
          created_at: string
          date_operation: string
          date_valeur: string | null
          id: string
          import_hash: string | null
          libelle: string
          montant: number
          reference_banque: string | null
          solde_apres: number | null
          statut: string
        }
        Insert: {
          compte_bancaire?: string
          created_at?: string
          date_operation: string
          date_valeur?: string | null
          id?: string
          import_hash?: string | null
          libelle: string
          montant: number
          reference_banque?: string | null
          solde_apres?: number | null
          statut?: string
        }
        Update: {
          compte_bancaire?: string
          created_at?: string
          date_operation?: string
          date_valeur?: string | null
          id?: string
          import_hash?: string | null
          libelle?: string
          montant?: number
          reference_banque?: string | null
          solde_apres?: number | null
          statut?: string
        }
        Relationships: []
      }
      mouvements_stock: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          ot_id: string | null
          piece_id: string
          prix_unitaire_ht: number | null
          quantite: number
          type_mouvement: string
          vehicule_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          ot_id?: string | null
          piece_id: string
          prix_unitaire_ht?: number | null
          quantite: number
          type_mouvement: string
          vehicule_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          ot_id?: string | null
          piece_id?: string
          prix_unitaire_ht?: number | null
          quantite?: number
          type_mouvement?: string
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mouvements_stock_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "flotte_entretiens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_stock_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "mouvements_stock_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "stock_pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_stock_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "vue_ruptures_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_stock_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "mouvements_stock_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "mouvements_stock_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_stock_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      objectives: {
        Row: {
          active_from: string
          active_to: string | null
          category: string
          company_id: number
          created_at: string
          created_by: string | null
          description: string | null
          formula: Json
          id: string
          is_active: boolean
          metric_code: string
          name: string
          period_end: string | null
          period_start: string | null
          period_type: string
          scope_ref_id: string | null
          scope_type: string
          target_unit: string | null
          target_value: number
          updated_at: string
          usable_in_bonus: boolean
          weight: number
        }
        Insert: {
          active_from?: string
          active_to?: string | null
          category: string
          company_id: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          formula?: Json
          id?: string
          is_active?: boolean
          metric_code: string
          name: string
          period_end?: string | null
          period_start?: string | null
          period_type: string
          scope_ref_id?: string | null
          scope_type: string
          target_unit?: string | null
          target_value: number
          updated_at?: string
          usable_in_bonus?: boolean
          weight?: number
        }
        Update: {
          active_from?: string
          active_to?: string | null
          category?: string
          company_id?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          formula?: Json
          id?: string
          is_active?: boolean
          metric_code?: string
          name?: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string
          scope_ref_id?: string | null
          scope_type?: string
          target_unit?: string | null
          target_value?: number
          updated_at?: string
          usable_in_bonus?: boolean
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "objectives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      ordres_transport: {
        Row: {
          affreteur_id: string | null
          chargement_site_id: string | null
          client_id: string
          company_id: number
          conducteur_id: string | null
          created_at: string
          date_chargement_prevue: string | null
          date_livraison_prevue: string | null
          date_livraison_reelle: string | null
          distance_km: number | null
          donneur_ordre_id: string | null
          est_affretee: boolean
          exploitant_responsable_id: string | null
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
          service_id: string | null
          source_course: string
          statut: string
          statut_operationnel: string | null
          statut_transport: string | null
          taux_tva: number | null
          temperature_requise: string | null
          transfer_id: string | null
          type_transport: string
          updated_at: string
          vehicule_id: string | null
          volume_m3: number | null
        }
        Insert: {
          affreteur_id?: string | null
          chargement_site_id?: string | null
          client_id: string
          company_id?: number
          conducteur_id?: string | null
          created_at?: string
          date_chargement_prevue?: string | null
          date_livraison_prevue?: string | null
          date_livraison_reelle?: string | null
          distance_km?: number | null
          donneur_ordre_id?: string | null
          est_affretee?: boolean
          exploitant_responsable_id?: string | null
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
          service_id?: string | null
          source_course?: string
          statut?: string
          statut_operationnel?: string | null
          statut_transport?: string | null
          taux_tva?: number | null
          temperature_requise?: string | null
          transfer_id?: string | null
          type_transport?: string
          updated_at?: string
          vehicule_id?: string | null
          volume_m3?: number | null
        }
        Update: {
          affreteur_id?: string | null
          chargement_site_id?: string | null
          client_id?: string
          company_id?: number
          conducteur_id?: string | null
          created_at?: string
          date_chargement_prevue?: string | null
          date_livraison_prevue?: string | null
          date_livraison_reelle?: string | null
          distance_km?: number | null
          donneur_ordre_id?: string | null
          est_affretee?: boolean
          exploitant_responsable_id?: string | null
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
          service_id?: string | null
          source_course?: string
          statut?: string
          statut_operationnel?: string | null
          statut_transport?: string | null
          taux_tva?: number | null
          temperature_requise?: string | null
          transfer_id?: string | null
          type_transport?: string
          updated_at?: string
          vehicule_id?: string | null
          volume_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ot_facture"
            columns: ["facturation_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ot_facture"
            columns: ["facturation_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["facture_id"]
          },
          {
            foreignKeyName: "ordres_transport_chargement_site_id_fkey"
            columns: ["chargement_site_id"]
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
            foreignKeyName: "ordres_transport_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ordres_transport_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vue_scoring_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ordres_transport_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_donneur_ordre_id_fkey"
            columns: ["donneur_ordre_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_donneur_ordre_id_fkey"
            columns: ["donneur_ordre_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ordres_transport_donneur_ordre_id_fkey"
            columns: ["donneur_ordre_id"]
            isOneToOne: false
            referencedRelation: "vue_scoring_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ordres_transport_exploitant_responsable_id_fkey"
            columns: ["exploitant_responsable_id"]
            isOneToOne: false
            referencedRelation: "exploitants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_livraison_site_id_fkey"
            columns: ["livraison_site_id"]
            isOneToOne: false
            referencedRelation: "sites_logistiques"
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
            foreignKeyName: "ordres_transport_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "course_transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      ordres_transport_statut_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          commentaire: string | null
          company_id: number
          id: string
          ot_id: string
          statut_nouveau: string
          statut_precedent: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          commentaire?: string | null
          company_id?: number
          id?: string
          ot_id: string
          statut_nouveau: string
          statut_precedent?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          commentaire?: string | null
          company_id?: number
          id?: string
          ot_id?: string
          statut_nouveau?: string
          statut_precedent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordres_transport_statut_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "v_cout_salarial_ot"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "ordres_transport_statut_history_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_statut_history_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["ot_suivant_id"]
          },
          {
            foreignKeyName: "ordres_transport_statut_history_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_non_affectes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_statut_history_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_statut_history_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["ot_id"]
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
      ot_lignes: {
        Row: {
          company_id: number
          created_at: string
          id: string
          libelle: string
          metrage_ml: number | null
          nombre_colis: number | null
          notes: string | null
          ot_id: string
          poids_kg: number | null
        }
        Insert: {
          company_id?: number
          created_at?: string
          id?: string
          libelle: string
          metrage_ml?: number | null
          nombre_colis?: number | null
          notes?: string | null
          ot_id: string
          poids_kg?: number | null
        }
        Update: {
          company_id?: number
          created_at?: string
          id?: string
          libelle?: string
          metrage_ml?: number | null
          nombre_colis?: number | null
          notes?: string | null
          ot_id?: string
          poids_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ot_lignes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_lignes_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_lignes_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_cout_salarial_ot"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "ot_lignes_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_lignes_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["ot_suivant_id"]
          },
          {
            foreignKeyName: "ot_lignes_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_non_affectes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_lignes_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_lignes_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "ot_lignes_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_marge_ot"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_config_annuel: {
        Row: {
          annee: number
          created_at: string
          mutuelle_pat_mensuelle: number
          mutuelle_sal_mensuelle: number
          pmss: number
          smic_horaire: number
          taux_alloc_fam: number
          taux_at_mp: number
          taux_ceg_pat: number
          taux_ceg_sal: number
          taux_chomage_pat: number
          taux_csg_crds_nd: number
          taux_csg_deductible: number
          taux_fnal: number
          taux_maladie_pat: number
          taux_maladie_sal: number
          taux_retraite_comp_t1_pat: number
          taux_retraite_comp_t1_sal: number
          taux_vieillesse_deplaf_pat: number
          taux_vieillesse_deplaf_sal: number
          taux_vieillesse_plaf_pat: number
          taux_vieillesse_plaf_sal: number
          updated_at: string
        }
        Insert: {
          annee: number
          created_at?: string
          mutuelle_pat_mensuelle?: number
          mutuelle_sal_mensuelle?: number
          pmss?: number
          smic_horaire?: number
          taux_alloc_fam?: number
          taux_at_mp?: number
          taux_ceg_pat?: number
          taux_ceg_sal?: number
          taux_chomage_pat?: number
          taux_csg_crds_nd?: number
          taux_csg_deductible?: number
          taux_fnal?: number
          taux_maladie_pat?: number
          taux_maladie_sal?: number
          taux_retraite_comp_t1_pat?: number
          taux_retraite_comp_t1_sal?: number
          taux_vieillesse_deplaf_pat?: number
          taux_vieillesse_deplaf_sal?: number
          taux_vieillesse_plaf_pat?: number
          taux_vieillesse_plaf_sal?: number
          updated_at?: string
        }
        Update: {
          annee?: number
          created_at?: string
          mutuelle_pat_mensuelle?: number
          mutuelle_sal_mensuelle?: number
          pmss?: number
          smic_horaire?: number
          taux_alloc_fam?: number
          taux_at_mp?: number
          taux_ceg_pat?: number
          taux_ceg_sal?: number
          taux_chomage_pat?: number
          taux_csg_crds_nd?: number
          taux_csg_deductible?: number
          taux_fnal?: number
          taux_maladie_pat?: number
          taux_maladie_sal?: number
          taux_retraite_comp_t1_pat?: number
          taux_retraite_comp_t1_sal?: number
          taux_vieillesse_deplaf_pat?: number
          taux_vieillesse_deplaf_sal?: number
          taux_vieillesse_plaf_pat?: number
          taux_vieillesse_plaf_sal?: number
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          id: number
          label: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          label: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          label?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      planning_custom_blocks: {
        Row: {
          color: string
          created_at: string | null
          date_end: string
          date_start: string
          id: string
          kind: string | null
          label: string
          ot_id: string | null
          row_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          date_end: string
          date_start: string
          id?: string
          kind?: string | null
          label?: string
          ot_id?: string | null
          row_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          date_end?: string
          date_start?: string
          id?: string
          kind?: string | null
          label?: string
          ot_id?: string | null
          row_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_custom_blocks_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_custom_blocks_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_cout_salarial_ot"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "planning_custom_blocks_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_custom_blocks_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["ot_suivant_id"]
          },
          {
            foreignKeyName: "planning_custom_blocks_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_non_affectes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_custom_blocks_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_custom_blocks_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "planning_custom_blocks_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_marge_ot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_custom_blocks_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: false
            referencedRelation: "planning_custom_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_custom_rows: {
        Row: {
          created_at: string | null
          id: string
          label: string
          subtitle: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          subtitle?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          subtitle?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          is_active: boolean
          nom: string | null
          prenom: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean
          nom?: string | null
          prenom?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean
          nom?: string | null
          prenom?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_audit_events: {
        Row: {
          admin_email: string
          admin_user_id: string
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          payload: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          admin_email: string
          admin_user_id: string
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          admin_email?: string
          admin_user_id?: string
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      profils: {
        Row: {
          account_origin: string
          account_status: string
          account_type: string
          archived_at: string | null
          assigned_by_admin: string | null
          company_id: number | null
          created_at: string
          demo_expires_at: string | null
          exploitant_id: string | null
          force_password_reset: boolean
          id: string
          is_active: boolean
          is_demo_account: boolean
          is_investor_account: boolean
          last_role_change_at: string | null
          matricule: string
          max_concurrent_screens: number
          nom: string | null
          notes_admin: string | null
          permissions: Json
          prenom: string | null
          requested_from_public_form: boolean
          role: string
          service_id: string | null
          tenant_key: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_origin?: string
          account_status?: string
          account_type?: string
          archived_at?: string | null
          assigned_by_admin?: string | null
          company_id?: number | null
          created_at?: string
          demo_expires_at?: string | null
          exploitant_id?: string | null
          force_password_reset?: boolean
          id?: string
          is_active?: boolean
          is_demo_account?: boolean
          is_investor_account?: boolean
          last_role_change_at?: string | null
          matricule?: string
          max_concurrent_screens?: number
          nom?: string | null
          notes_admin?: string | null
          permissions?: Json
          prenom?: string | null
          requested_from_public_form?: boolean
          role?: string
          service_id?: string | null
          tenant_key?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_origin?: string
          account_status?: string
          account_type?: string
          archived_at?: string | null
          assigned_by_admin?: string | null
          company_id?: number | null
          created_at?: string
          demo_expires_at?: string | null
          exploitant_id?: string | null
          force_password_reset?: boolean
          id?: string
          is_active?: boolean
          is_demo_account?: boolean
          is_investor_account?: boolean
          last_role_change_at?: string | null
          matricule?: string
          max_concurrent_screens?: number
          nom?: string | null
          notes_admin?: string | null
          permissions?: Json
          prenom?: string | null
          requested_from_public_form?: boolean
          role?: string
          service_id?: string | null
          tenant_key?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profils_assigned_by_admin_fkey"
            columns: ["assigned_by_admin"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profils_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profils_exploitant_id_fkey"
            columns: ["exploitant_id"]
            isOneToOne: false
            referencedRelation: "exploitants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profils_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profils_tenant_key_fk"
            columns: ["tenant_key"]
            isOneToOne: false
            referencedRelation: "erp_v11_tenants"
            referencedColumns: ["tenant_key"]
          },
        ]
      }
      programmes_maintenance_constructeur: {
        Row: {
          created_at: string
          derniere_veille_mois: string | null
          huile_boite_l: number | null
          huile_moteur_l: number | null
          huile_pont_l: number | null
          id: string
          liquide_frein_l: number | null
          marque: string
          modele: string
          motorisation: string | null
          notes: string | null
          periodicite_km: number | null
          periodicite_mois: number | null
          pieces_reference: string | null
          source_constructeur: string | null
          type_entretien: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          derniere_veille_mois?: string | null
          huile_boite_l?: number | null
          huile_moteur_l?: number | null
          huile_pont_l?: number | null
          id?: string
          liquide_frein_l?: number | null
          marque: string
          modele: string
          motorisation?: string | null
          notes?: string | null
          periodicite_km?: number | null
          periodicite_mois?: number | null
          pieces_reference?: string | null
          source_constructeur?: string | null
          type_entretien: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          derniere_veille_mois?: string | null
          huile_boite_l?: number | null
          huile_moteur_l?: number | null
          huile_pont_l?: number | null
          id?: string
          liquide_frein_l?: number | null
          marque?: string
          modele?: string
          motorisation?: string | null
          notes?: string | null
          periodicite_km?: number | null
          periodicite_mois?: number | null
          pieces_reference?: string | null
          source_constructeur?: string | null
          type_entretien?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_access_requests: {
        Row: {
          accepted_policy: boolean
          account_created: boolean
          assigned_by_admin: string | null
          company_name: string
          company_size: string | null
          created_account_email: string | null
          created_at: string
          email: string
          employee_count: number | null
          fleet_size: number | null
          full_name: string
          id: string
          lead_status: string
          linked_profile_id: string | null
          linked_role: string | null
          linked_user_id: string | null
          message: string | null
          need_type: string
          notes_admin: string | null
          phone: string
          request_status: string
          requested_account_type: string
          requested_role: string
          source: string
          updated_at: string
        }
        Insert: {
          accepted_policy?: boolean
          account_created?: boolean
          assigned_by_admin?: string | null
          company_name: string
          company_size?: string | null
          created_account_email?: string | null
          created_at?: string
          email: string
          employee_count?: number | null
          fleet_size?: number | null
          full_name: string
          id?: string
          lead_status?: string
          linked_profile_id?: string | null
          linked_role?: string | null
          linked_user_id?: string | null
          message?: string | null
          need_type: string
          notes_admin?: string | null
          phone: string
          request_status?: string
          requested_account_type?: string
          requested_role?: string
          source?: string
          updated_at?: string
        }
        Update: {
          accepted_policy?: boolean
          account_created?: boolean
          assigned_by_admin?: string | null
          company_name?: string
          company_size?: string | null
          created_account_email?: string | null
          created_at?: string
          email?: string
          employee_count?: number | null
          fleet_size?: number | null
          full_name?: string
          id?: string
          lead_status?: string
          linked_profile_id?: string | null
          linked_role?: string | null
          linked_user_id?: string | null
          message?: string | null
          need_type?: string
          notes_admin?: string | null
          phone?: string
          request_status?: string
          requested_account_type?: string
          requested_role?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_access_requests_assigned_by_admin_fkey"
            columns: ["assigned_by_admin"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_access_requests_linked_profile_id_fkey"
            columns: ["linked_profile_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          ca_annuel_estime: number | null
          code_postal: string | null
          commercial_nom: string | null
          company_id: number
          concurrent_actuel: string | null
          contact_email: string | null
          contact_nom: string | null
          contact_telephone: string | null
          created_at: string
          date_derniere_action: string | null
          date_prochain_contact: string | null
          id: string
          latitude: number | null
          longitude: number | null
          montant_mensuel_estime: number | null
          nb_sites: number | null
          nom_entreprise: string
          notes: string | null
          probabilite_closing: number | null
          secteur: string | null
          siret: string | null
          source_lead: string | null
          statut: string
          type_transport: string | null
          updated_at: string
          ville: string | null
          zones_transport: string | null
        }
        Insert: {
          ca_annuel_estime?: number | null
          code_postal?: string | null
          commercial_nom?: string | null
          company_id?: number
          concurrent_actuel?: string | null
          contact_email?: string | null
          contact_nom?: string | null
          contact_telephone?: string | null
          created_at?: string
          date_derniere_action?: string | null
          date_prochain_contact?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          montant_mensuel_estime?: number | null
          nb_sites?: number | null
          nom_entreprise: string
          notes?: string | null
          probabilite_closing?: number | null
          secteur?: string | null
          siret?: string | null
          source_lead?: string | null
          statut?: string
          type_transport?: string | null
          updated_at?: string
          ville?: string | null
          zones_transport?: string | null
        }
        Update: {
          ca_annuel_estime?: number | null
          code_postal?: string | null
          commercial_nom?: string | null
          company_id?: number
          concurrent_actuel?: string | null
          contact_email?: string | null
          contact_nom?: string | null
          contact_telephone?: string | null
          created_at?: string
          date_derniere_action?: string | null
          date_prochain_contact?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          montant_mensuel_estime?: number | null
          nb_sites?: number | null
          nom_entreprise?: string
          notes?: string | null
          probabilite_closing?: number | null
          secteur?: string | null
          siret?: string | null
          source_lead?: string | null
          statut?: string
          type_transport?: string | null
          updated_at?: string
          ville?: string | null
          zones_transport?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rapports_conducteurs: {
        Row: {
          company_id: number
          conducteur_id: string
          contenu: Json
          created_at: string | null
          created_by: string | null
          envoye_at: string | null
          id: string
          periode_debut: string
          periode_fin: string
          periode_label: string
          signe_at: string | null
          statut: string
          type: string
        }
        Insert: {
          company_id?: number
          conducteur_id: string
          contenu?: Json
          created_at?: string | null
          created_by?: string | null
          envoye_at?: string | null
          id?: string
          periode_debut: string
          periode_fin: string
          periode_label: string
          signe_at?: string | null
          statut?: string
          type: string
        }
        Update: {
          company_id?: number
          conducteur_id?: string
          contenu?: Json
          created_at?: string | null
          created_by?: string | null
          envoye_at?: string | null
          id?: string
          periode_debut?: string
          periode_fin?: string
          periode_label?: string
          signe_at?: string | null
          statut?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rapports_conducteurs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapports_conducteurs_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapports_conducteurs_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "rapports_conducteurs_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapports_conducteurs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      rapprochements_bancaires: {
        Row: {
          commentaire: string | null
          created_at: string
          created_by: string | null
          ecart: number
          ecriture_id: string | null
          facture_fournisseur_id: string | null
          facture_id: string | null
          id: string
          mode: string
          montant_rapproche: number
          mouvement_bancaire_id: string
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          ecart?: number
          ecriture_id?: string | null
          facture_fournisseur_id?: string | null
          facture_id?: string | null
          id?: string
          mode?: string
          montant_rapproche: number
          mouvement_bancaire_id: string
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          ecart?: number
          ecriture_id?: string | null
          facture_fournisseur_id?: string | null
          facture_id?: string | null
          id?: string
          mode?: string
          montant_rapproche?: number
          mouvement_bancaire_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rapprochements_bancaires_ecriture_id_fkey"
            columns: ["ecriture_id"]
            isOneToOne: false
            referencedRelation: "compta_ecritures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapprochements_bancaires_facture_fournisseur_id_fkey"
            columns: ["facture_fournisseur_id"]
            isOneToOne: false
            referencedRelation: "compta_factures_fournisseurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapprochements_bancaires_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapprochements_bancaires_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["facture_id"]
          },
          {
            foreignKeyName: "rapprochements_bancaires_mouvement_bancaire_id_fkey"
            columns: ["mouvement_bancaire_id"]
            isOneToOne: false
            referencedRelation: "mouvements_bancaires"
            referencedColumns: ["id"]
          },
        ]
      }
      relances_commerciales: {
        Row: {
          commercial_nom: string | null
          created_at: string
          date_prevue: string
          devis_id: string | null
          id: string
          notes: string | null
          priorite: string
          prospect_id: string
          statut: string
          type_relance: string
        }
        Insert: {
          commercial_nom?: string | null
          created_at?: string
          date_prevue: string
          devis_id?: string | null
          id?: string
          notes?: string | null
          priorite?: string
          prospect_id: string
          statut?: string
          type_relance?: string
        }
        Update: {
          commercial_nom?: string | null
          created_at?: string
          date_prevue?: string
          devis_id?: string | null
          id?: string
          notes?: string | null
          priorite?: string
          prospect_id?: string
          statut?: string
          type_relance?: string
        }
        Relationships: [
          {
            foreignKeyName: "relances_commerciales_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relances_commerciales_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      relances_historique: {
        Row: {
          created_by: string | null
          date_envoi: string
          facture_id: string
          id: string
          mode: string
          montant_relance: number
          niveau: number
          notes: string | null
          scenario_id: string | null
          statut: string
        }
        Insert: {
          created_by?: string | null
          date_envoi?: string
          facture_id: string
          id?: string
          mode?: string
          montant_relance?: number
          niveau: number
          notes?: string | null
          scenario_id?: string | null
          statut?: string
        }
        Update: {
          created_by?: string | null
          date_envoi?: string
          facture_id?: string
          id?: string
          mode?: string
          montant_relance?: number
          niveau?: number
          notes?: string | null
          scenario_id?: string | null
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "relances_historique_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relances_historique_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["facture_id"]
          },
          {
            foreignKeyName: "relances_historique_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "relances_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      relances_scenarios: {
        Row: {
          actif: boolean
          corps_template: string | null
          created_at: string
          delai_apres_echeance: number
          id: string
          niveau: number
          nom: string
          sujet_template: string | null
          type: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          corps_template?: string | null
          created_at?: string
          delai_apres_echeance: number
          id?: string
          niveau: number
          nom: string
          sujet_template?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          corps_template?: string | null
          created_at?: string
          delai_apres_echeance?: number
          id?: string
          niveau?: number
          nom?: string
          sujet_template?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      remorque_releves_km: {
        Row: {
          company_id: number
          created_at: string
          created_by: string | null
          id: string
          km_compteur: number
          notes: string | null
          reading_date: string
          remorque_id: string
          source: string | null
          updated_at: string
        }
        Insert: {
          company_id?: number
          created_at?: string
          created_by?: string | null
          id?: string
          km_compteur: number
          notes?: string | null
          reading_date: string
          remorque_id: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: number
          created_at?: string
          created_by?: string | null
          id?: string
          km_compteur?: number
          notes?: string | null
          reading_date?: string
          remorque_id?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remorque_releves_km_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remorque_releves_km_remorque_id_fkey"
            columns: ["remorque_id"]
            isOneToOne: false
            referencedRelation: "remorques"
            referencedColumns: ["id"]
          },
        ]
      }
      remorques: {
        Row: {
          assurance_expiration: string | null
          charge_utile_kg: number | null
          company_id: number
          contrat_entretien: boolean
          cout_achat_ht: number | null
          created_at: string
          ct_expiration: string | null
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
          type_propriete: string | null
          type_remorque: string
          updated_at: string
          vin: string | null
        }
        Insert: {
          assurance_expiration?: string | null
          charge_utile_kg?: number | null
          company_id?: number
          contrat_entretien?: boolean
          cout_achat_ht?: number | null
          created_at?: string
          ct_expiration?: string | null
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
          type_propriete?: string | null
          type_remorque?: string
          updated_at?: string
          vin?: string | null
        }
        Update: {
          assurance_expiration?: string | null
          charge_utile_kg?: number | null
          company_id?: number
          contrat_entretien?: boolean
          cout_achat_ht?: number | null
          created_at?: string
          ct_expiration?: string | null
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
          type_propriete?: string | null
          type_remorque?: string
          updated_at?: string
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remorques_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: number
          role_id: number
        }
        Insert: {
          permission_id: number
          role_id: number
        }
        Update: {
          permission_id?: number
          role_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          company_id: number
          created_at: string
          description: string | null
          id: number
          is_system: boolean
          label: string
          name: string
        }
        Insert: {
          company_id?: number
          created_at?: string
          description?: string | null
          id?: number
          is_system?: boolean
          label: string
          name: string
        }
        Update: {
          company_id?: number
          created_at?: string
          description?: string | null
          id?: number
          is_system?: boolean
          label?: string
          name?: string
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
      services: {
        Row: {
          archived_at: string | null
          code: string
          color: string | null
          company_id: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_service_id: string | null
          updated_at: string
          visual_marker: string | null
        }
        Insert: {
          archived_at?: string | null
          code: string
          color?: string | null
          company_id: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_service_id?: string | null
          updated_at?: string
          visual_marker?: string | null
        }
        Update: {
          archived_at?: string | null
          code?: string
          color?: string | null
          company_id?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_service_id?: string | null
          updated_at?: string
          visual_marker?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_parent_service_id_fkey"
            columns: ["parent_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      sites_logistiques: {
        Row: {
          adresse: string
          capacite_m3: number | null
          code_postal: string | null
          company_id: number
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
          capacite_m3?: number | null
          code_postal?: string | null
          company_id?: number
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
          capacite_m3?: number | null
          code_postal?: string | null
          company_id?: number
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
            foreignKeyName: "sites_logistiques_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_logistiques_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_logistiques_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "sites_logistiques_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "vue_scoring_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      soldes_absences: {
        Row: {
          annee: number
          company_id: number | null
          cp_acquis: number
          cp_pris: number
          created_at: string
          employe_id: string
          id: string
          rtt_acquis: number
          rtt_pris: number
          updated_at: string
        }
        Insert: {
          annee: number
          company_id?: number | null
          cp_acquis?: number
          cp_pris?: number
          created_at?: string
          employe_id: string
          id?: string
          rtt_acquis?: number
          rtt_pris?: number
          updated_at?: string
        }
        Update: {
          annee?: number
          company_id?: number | null
          cp_acquis?: number
          cp_pris?: number
          created_at?: string
          employe_id?: string
          id?: string
          rtt_acquis?: number
          rtt_pris?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "soldes_absences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soldes_absences_employe_id_fkey"
            columns: ["employe_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_pieces: {
        Row: {
          categorie: string | null
          compatibilite: string | null
          created_at: string
          designation: string
          emplacement: string | null
          fournisseur_nom: string | null
          id: string
          prix_unitaire_ht: number | null
          reference: string
          stock_actuel: number
          stock_minimum: number
          updated_at: string
        }
        Insert: {
          categorie?: string | null
          compatibilite?: string | null
          created_at?: string
          designation: string
          emplacement?: string | null
          fournisseur_nom?: string | null
          id?: string
          prix_unitaire_ht?: number | null
          reference: string
          stock_actuel?: number
          stock_minimum?: number
          updated_at?: string
        }
        Update: {
          categorie?: string | null
          compatibilite?: string | null
          created_at?: string
          designation?: string
          emplacement?: string | null
          fournisseur_nom?: string | null
          id?: string
          prix_unitaire_ht?: number | null
          reference?: string
          stock_actuel?: number
          stock_minimum?: number
          updated_at?: string
        }
        Relationships: []
      }
      tachygraphe_entrees: {
        Row: {
          company_id: number
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
          company_id?: number
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
          company_id?: number
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
            foreignKeyName: "tachygraphe_entrees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tachygraphe_entrees_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tachygraphe_entrees_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "tachygraphe_entrees_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
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
            referencedRelation: "v_cout_salarial_ot"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "tachygraphe_entrees_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tachygraphe_entrees_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["ot_suivant_id"]
          },
          {
            foreignKeyName: "tachygraphe_entrees_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_non_affectes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tachygraphe_entrees_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tachygraphe_entrees_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["ot_id"]
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
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "tachygraphe_entrees_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "tachygraphe_entrees_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tachygraphe_entrees_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      tasks: {
        Row: {
          company_id: number
          completed: boolean
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          priority: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: number
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: number
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: number
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          company_id?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          company_id?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tchat_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tchat_messages: {
        Row: {
          company_id: number
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          company_id?: number
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          company_id?: number
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tchat_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tchat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "tchat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tchat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      tchat_participants: {
        Row: {
          company_id: number
          conversation_id: string
          id: string
          profil_id: string
        }
        Insert: {
          company_id?: number
          conversation_id: string
          id?: string
          profil_id: string
        }
        Update: {
          company_id?: number
          conversation_id?: string
          id?: string
          profil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tchat_participants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tchat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "tchat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tchat_participants_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_cnr_indices: {
        Row: {
          annee: number
          created_at: string
          id: string
          indice_gazole: number
          indice_reference: number
          mois: number
        }
        Insert: {
          annee: number
          created_at?: string
          id?: string
          indice_gazole: number
          indice_reference?: number
          mois: number
        }
        Update: {
          annee?: number
          created_at?: string
          id?: string
          indice_gazole?: number
          indice_reference?: number
          mois?: number
        }
        Relationships: []
      }
      transport_missions_couts: {
        Row: {
          cout_amortissement: number | null
          cout_autres: number | null
          cout_carburant: number | null
          cout_conducteur: number | null
          cout_peages: number | null
          cout_sous_traitance: number | null
          created_at: string
          created_by: string | null
          id: string
          km_reels: number | null
          notes: string | null
          ot_id: string
          prix_vente_ht: number | null
          updated_at: string
        }
        Insert: {
          cout_amortissement?: number | null
          cout_autres?: number | null
          cout_carburant?: number | null
          cout_conducteur?: number | null
          cout_peages?: number | null
          cout_sous_traitance?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          km_reels?: number | null
          notes?: string | null
          ot_id: string
          prix_vente_ht?: number | null
          updated_at?: string
        }
        Update: {
          cout_amortissement?: number | null
          cout_autres?: number | null
          cout_carburant?: number | null
          cout_conducteur?: number | null
          cout_peages?: number | null
          cout_sous_traitance?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          km_reels?: number | null
          notes?: string | null
          ot_id?: string
          prix_vente_ht?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_missions_couts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: true
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_missions_couts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: true
            referencedRelation: "v_cout_salarial_ot"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "transport_missions_couts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: true
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_missions_couts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: true
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["ot_suivant_id"]
          },
          {
            foreignKeyName: "transport_missions_couts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: true
            referencedRelation: "v_war_room_ot_non_affectes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_missions_couts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: true
            referencedRelation: "v_war_room_ot_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_missions_couts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: true
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "transport_missions_couts_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: true
            referencedRelation: "vue_marge_ot"
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
            foreignKeyName: "transport_relais_conducteur_depose_id_fkey"
            columns: ["conducteur_depose_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_conducteur_depose_id_fkey"
            columns: ["conducteur_depose_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "transport_relais_conducteur_depose_id_fkey"
            columns: ["conducteur_depose_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_conducteur_reprise_id_fkey"
            columns: ["conducteur_reprise_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_conducteur_reprise_id_fkey"
            columns: ["conducteur_reprise_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "transport_relais_conducteur_reprise_id_fkey"
            columns: ["conducteur_reprise_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordres_transport"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_cout_salarial_ot"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "transport_relais_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_radar_km_vide"
            referencedColumns: ["ot_suivant_id"]
          },
          {
            foreignKeyName: "transport_relais_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_non_affectes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "v_war_room_ot_retard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["ot_id"]
          },
          {
            foreignKeyName: "transport_relais_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "vue_marge_ot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_remorque_depose_id_fkey"
            columns: ["remorque_depose_id"]
            isOneToOne: false
            referencedRelation: "remorques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_remorque_reprise_id_fkey"
            columns: ["remorque_reprise_id"]
            isOneToOne: false
            referencedRelation: "remorques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_logistiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_vehicule_depose_id_fkey"
            columns: ["vehicule_depose_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "transport_relais_vehicule_depose_id_fkey"
            columns: ["vehicule_depose_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "transport_relais_vehicule_depose_id_fkey"
            columns: ["vehicule_depose_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_vehicule_depose_id_fkey"
            columns: ["vehicule_depose_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "transport_relais_vehicule_reprise_id_fkey"
            columns: ["vehicule_reprise_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "transport_relais_vehicule_reprise_id_fkey"
            columns: ["vehicule_reprise_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "transport_relais_vehicule_reprise_id_fkey"
            columns: ["vehicule_reprise_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_relais_vehicule_reprise_id_fkey"
            columns: ["vehicule_reprise_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      transport_tarifs_clients: {
        Row: {
          actif: boolean
          client_id: string
          coeff_gazole: boolean
          created_at: string
          created_by: string | null
          date_debut: string
          date_fin: string | null
          forfait_minimum: number | null
          id: string
          libelle: string
          notes: string | null
          peages_refactures: boolean
          tarif_km: number
          updated_at: string
        }
        Insert: {
          actif?: boolean
          client_id: string
          coeff_gazole?: boolean
          created_at?: string
          created_by?: string | null
          date_debut?: string
          date_fin?: string | null
          forfait_minimum?: number | null
          id?: string
          libelle?: string
          notes?: string | null
          peages_refactures?: boolean
          tarif_km?: number
          updated_at?: string
        }
        Update: {
          actif?: boolean
          client_id?: string
          coeff_gazole?: boolean
          created_at?: string
          created_by?: string | null
          date_debut?: string
          date_fin?: string | null
          forfait_minimum?: number | null
          id?: string
          libelle?: string
          notes?: string | null
          peages_refactures?: boolean
          tarif_km?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_tarifs_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_tarifs_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vue_analytique_missions"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "transport_tarifs_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vue_scoring_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      treso_flux_previsionnels: {
        Row: {
          created_at: string
          created_by: string | null
          date_flux: string
          id: string
          libelle: string
          montant: number
          probabilite: number
          realise: boolean
          source: string
          source_id: string | null
          type_flux: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_flux: string
          id?: string
          libelle: string
          montant: number
          probabilite?: number
          realise?: boolean
          source?: string
          source_id?: string | null
          type_flux?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_flux?: string
          id?: string
          libelle?: string
          montant?: number
          probabilite?: number
          realise?: boolean
          source?: string
          source_id?: string | null
          type_flux?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_role_change_log: {
        Row: {
          actor_profile_id: string | null
          change_reason: string | null
          changed_at: string
          id: string
          new_role: string
          previous_role: string
          source: string
          target_profile_id: string
        }
        Insert: {
          actor_profile_id?: string | null
          change_reason?: string | null
          changed_at?: string
          id?: string
          new_role: string
          previous_role: string
          source?: string
          target_profile_id: string
        }
        Update: {
          actor_profile_id?: string | null
          change_reason?: string | null
          changed_at?: string
          id?: string
          new_role?: string
          previous_role?: string
          source?: string
          target_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_change_log_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_change_log_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: number
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          role_id: number
          user_profile_id: string
        }
        Insert: {
          company_id?: number
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          role_id: number
          user_profile_id: string
        }
        Update: {
          company_id?: number
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          role_id?: number
          user_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
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
            foreignKeyName: "user_roles_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      user_screen_sessions: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          label: string | null
          last_seen_at: string
          profil_id: string | null
          screen_id: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          label?: string | null
          last_seen_at?: string
          profil_id?: string | null
          screen_id: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          label?: string | null
          last_seen_at?: string
          profil_id?: string | null
          screen_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_screen_sessions_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicule_releves_km: {
        Row: {
          company_id: number
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
          company_id?: number
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
          company_id?: number
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
            foreignKeyName: "vehicule_releves_km_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicule_releves_km_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "vehicule_releves_km_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "vehicule_releves_km_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicule_releves_km_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      vehicules: {
        Row: {
          annee: number | null
          assurance_expiration: string | null
          capacite_charge_kg: number | null
          capacite_volume_m3: number | null
          company_id: number
          contrat_entretien: boolean
          cout_achat_ht: number | null
          created_at: string
          ct_expiration: string | null
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
          numero_parc: string | null
          preferences: string | null
          prestataire_entretien: string | null
          primary_service_id: string | null
          ptac_kg: number | null
          statut: string
          tachy_etalonnage_prochain: string | null
          tachy_serie: string | null
          type_propriete: string | null
          type_vehicule: string
          updated_at: string
          vignette_expiration: string | null
          vin: string | null
        }
        Insert: {
          annee?: number | null
          assurance_expiration?: string | null
          capacite_charge_kg?: number | null
          capacite_volume_m3?: number | null
          company_id?: number
          contrat_entretien?: boolean
          cout_achat_ht?: number | null
          created_at?: string
          ct_expiration?: string | null
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
          numero_parc?: string | null
          preferences?: string | null
          prestataire_entretien?: string | null
          primary_service_id?: string | null
          ptac_kg?: number | null
          statut?: string
          tachy_etalonnage_prochain?: string | null
          tachy_serie?: string | null
          type_propriete?: string | null
          type_vehicule?: string
          updated_at?: string
          vignette_expiration?: string | null
          vin?: string | null
        }
        Update: {
          annee?: number | null
          assurance_expiration?: string | null
          capacite_charge_kg?: number | null
          capacite_volume_m3?: number | null
          company_id?: number
          contrat_entretien?: boolean
          cout_achat_ht?: number | null
          created_at?: string
          ct_expiration?: string | null
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
          numero_parc?: string | null
          preferences?: string | null
          prestataire_entretien?: string | null
          primary_service_id?: string | null
          ptac_kg?: number | null
          statut?: string
          tachy_etalonnage_prochain?: string | null
          tachy_serie?: string | null
          type_propriete?: string | null
          type_vehicule?: string
          updated_at?: string
          vignette_expiration?: string | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicules_primary_service_id_fkey"
            columns: ["primary_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_capacite_disponible_aujourd_hui: {
        Row: {
          capacite_charge_kg: number | null
          capacite_volume_m3: number | null
          marque: string | null
          modele: string | null
          nb_ot_actifs: number | null
          poids_charge_kg: number | null
          poids_disponible_kg: number | null
          taux_remplissage_pct: number | null
          vehicule_id: string | null
          vehicule_immat: string | null
          vehicule_statut: string | null
          volume_charge_m3: number | null
          volume_disponible_m3: number | null
        }
        Relationships: []
      }
      v_capacite_disponible_semaine: {
        Row: {
          capacite_charge_kg: number | null
          jour: string | null
          poids_charge_kg: number | null
          poids_disponible_kg: number | null
          taux_remplissage_pct: number | null
          vehicule_id: string | null
          vehicule_immat: string | null
        }
        Relationships: []
      }
      v_cout_salarial_ot: {
        Row: {
          ca_ot: number | null
          conducteur_id: string | null
          cout_journalier_estime: number | null
          cout_mensuel_conducteur: number | null
          cout_salarial_ot_estime: number | null
          date_chargement_prevue: string | null
          date_livraison_prevue: string | null
          duree_ot_jours: number | null
          jours_paie: number | null
          ot_id: string | null
          ot_reference: string | null
          periode_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_radar_km_vide: {
        Row: {
          client_nom: string | null
          conducteur_id: string | null
          date_chargement_prevue: string | null
          date_livraison_prevue: string | null
          id: string | null
          km_charge: number | null
          km_vide_estime: number | null
          livraison_ville: string | null
          ot_suivant_id: string | null
          ot_suivant_reference: string | null
          reference: string | null
          statut: string | null
          statut_transport: string | null
          suivant_chargement_ville: string | null
          suivant_date_chargement: string | null
          vehicule_id: string | null
          vehicule_immat: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      v_radar_km_vide_synthese: {
        Row: {
          nb_missions: number | null
          taux_charge_pct: number | null
          total_km_charge: number | null
          total_km_vide_estime: number | null
          vehicule_id: string | null
          vehicule_immat: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      v_war_room_ot_non_affectes: {
        Row: {
          age_heures: number | null
          client_nom: string | null
          date_chargement_prevue: string | null
          date_livraison_prevue: string | null
          id: string | null
          nature_marchandise: string | null
          poids_kg: number | null
          reference: string | null
          statut_transport: string | null
          type_transport: string | null
        }
        Relationships: []
      }
      v_war_room_ot_retard: {
        Row: {
          client_nom: string | null
          conducteur_id: string | null
          conducteur_nom: string | null
          date_chargement_prevue: string | null
          date_livraison_prevue: string | null
          id: string | null
          nature_marchandise: string | null
          poids_kg: number | null
          reference: string | null
          statut_operationnel: string | null
          statut_transport: string | null
          vehicule_id: string | null
          vehicule_immat: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
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
      vue_analytique_missions: {
        Row: {
          client_id: string | null
          client_nom: string | null
          conducteur_id: string | null
          cout_amortissement: number | null
          cout_autres: number | null
          cout_carburant: number | null
          cout_conducteur: number | null
          cout_id: string | null
          cout_km: number | null
          cout_peages: number | null
          cout_sous_traitance: number | null
          cout_total: number | null
          created_at: string | null
          date_chargement: string | null
          facture_id: string | null
          facture_statut: string | null
          km_reels: number | null
          marge_nette: number | null
          marge_pct: number | null
          ot_id: string | null
          prix_vente_ht: number | null
          reference: string | null
          statut: string | null
          vehicule_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "conducteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["conducteur_id"]
          },
          {
            foreignKeyName: "ordres_transport_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "vue_conducteur_alertes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_aujourd_hui"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "v_capacite_disponible_semaine"
            referencedColumns: ["vehicule_id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordres_transport_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vue_immobilisations"
            referencedColumns: ["vehicule_id"]
          },
        ]
      }
      vue_compta_balance: {
        Row: {
          compte_code: string | null
          compte_libelle: string | null
          exercice: number | null
          solde: number | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compta_ecriture_lignes_compte_code_fkey"
            columns: ["compte_code"]
            isOneToOne: false
            referencedRelation: "compta_plan_comptable"
            referencedColumns: ["code_compte"]
          },
        ]
      }
      vue_compta_bilan: {
        Row: {
          compte_code: string | null
          compte_libelle: string | null
          exercice: number | null
          montant: number | null
          section_bilan: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compta_ecriture_lignes_compte_code_fkey"
            columns: ["compte_code"]
            isOneToOne: false
            referencedRelation: "compta_plan_comptable"
            referencedColumns: ["code_compte"]
          },
        ]
      }
      vue_compta_bilan_synthese: {
        Row: {
          ecart: number | null
          exercice: number | null
          total_actif: number | null
          total_passif: number | null
        }
        Relationships: []
      }
      vue_compta_compte_resultat: {
        Row: {
          categorie: string | null
          compte_code: string | null
          compte_libelle: string | null
          credit: number | null
          debit: number | null
          exercice: number | null
          solde_gestion: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compta_ecriture_lignes_compte_code_fkey"
            columns: ["compte_code"]
            isOneToOne: false
            referencedRelation: "compta_plan_comptable"
            referencedColumns: ["code_compte"]
          },
        ]
      }
      vue_compta_compte_resultat_synthese: {
        Row: {
          exercice: number | null
          resultat_net: number | null
          total_charges: number | null
          total_produits: number | null
        }
        Relationships: []
      }
      vue_compta_fec_v1: {
        Row: {
          comp_aux_lib: string | null
          compte_lib: string | null
          compte_num: string | null
          credit: number | null
          debit: number | null
          devise: string | null
          ecriture_date: string | null
          ecriture_lib: string | null
          ecriture_num: string | null
          i_piece: string | null
          journal_code: string | null
          journal_code_exercice: string | null
          journal_lib: string | null
          piece_date: string | null
          piece_ref: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compta_ecriture_lignes_compte_code_fkey"
            columns: ["compte_num"]
            isOneToOne: false
            referencedRelation: "compta_plan_comptable"
            referencedColumns: ["code_compte"]
          },
        ]
      }
      vue_compta_grand_livre: {
        Row: {
          code_journal: string | null
          compte_code: string | null
          compte_libelle: string | null
          credit: number | null
          date_ecriture: string | null
          debit: number | null
          ecriture_libelle: string | null
          exercice: number | null
          libelle_ligne: string | null
          numero_mouvement: number | null
          ordre: number | null
          solde_cumule: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compta_ecriture_lignes_compte_code_fkey"
            columns: ["compte_code"]
            isOneToOne: false
            referencedRelation: "compta_plan_comptable"
            referencedColumns: ["code_compte"]
          },
        ]
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
      vue_immobilisations: {
        Row: {
          cout_entretien_ht: number | null
          cout_immobilisation_estime: number | null
          cout_total_reel_estime: number | null
          created_at: string | null
          date_debut_reelle: string | null
          date_fin_reelle: string | null
          duree_immobilisation_h: number | null
          garage: string | null
          immatriculation: string | null
          maintenance_type: string | null
          marque: string | null
          modele: string | null
          notes: string | null
          ot_id: string | null
          prestataire: string | null
          priority: string | null
          statut: string | null
          vehicule_id: string | null
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
      vue_ruptures_stock: {
        Row: {
          categorie: string | null
          deficit: number | null
          designation: string | null
          emplacement: string | null
          fournisseur_nom: string | null
          id: string | null
          prix_unitaire_ht: number | null
          reference: string | null
          stock_actuel: number | null
          stock_minimum: number | null
        }
        Insert: {
          categorie?: string | null
          deficit?: never
          designation?: string | null
          emplacement?: string | null
          fournisseur_nom?: string | null
          id?: string | null
          prix_unitaire_ht?: number | null
          reference?: string | null
          stock_actuel?: number | null
          stock_minimum?: number | null
        }
        Update: {
          categorie?: string | null
          deficit?: never
          designation?: string | null
          emplacement?: string | null
          fournisseur_nom?: string | null
          id?: string | null
          prix_unitaire_ht?: number | null
          reference?: string | null
          stock_actuel?: number | null
          stock_minimum?: number | null
        }
        Relationships: []
      }
      vue_scoring_clients: {
        Row: {
          ca_total: number | null
          categorie_risque: string | null
          client_id: string | null
          client_nom: string | null
          encours_retard: number | null
          encours_total: number | null
          nb_factures: number | null
          nb_factures_retard: number | null
          retard_moyen_jours: number | null
          score_paiement: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_updated_at_trigger: { Args: { tbl: string }; Returns: undefined }
      admin_can_manage_accounts: { Args: never; Returns: boolean }
      cleanup_expired_impersonation_sessions: {
        Args: never
        Returns: undefined
      }
      compta_export_fec_v1: {
        Args: { p_exercice: number }
        Returns: {
          comp_aux_lib: string
          compte_lib: string
          compte_num: string
          credit: number
          debit: number
          devise: string
          ecriture_date: string
          ecriture_lib: string
          ecriture_num: string
          i_piece: string
          journal_code: string
          journal_code_exercice: string
          journal_lib: string
          piece_date: string
          piece_ref: string
        }[]
      }
      compta_generer_ecriture_facture: {
        Args: { p_facture_id: string }
        Returns: string
      }
      compta_generer_ecriture_facture_fournisseur: {
        Args: { p_facture_id: string }
        Returns: string
      }
      compta_is_balancee: { Args: { p_ecriture_id: string }; Returns: boolean }
      compta_log_event: {
        Args: {
          p_entity: string
          p_entity_id: string
          p_event_type: string
          p_payload: Json
        }
        Returns: undefined
      }
      compta_valider_ecriture: {
        Args: { p_ecriture_id: string }
        Returns: {
          company_id: number
          created_at: string
          created_by: string | null
          date_ecriture: string
          exercice: number
          id: string
          journal_id: string
          libelle: string
          numero_mouvement: number
          piece_id: string | null
          statut: string
          updated_at: string
          valide_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "compta_ecritures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_profil_id: { Args: never; Returns: string }
      fn_controle_conformite_paie: {
        Args: {
          p_annee?: number
          p_brut_mensuel: number
          p_coefficient: string
          p_indemnite_gr_journalier: number
          p_indemnite_repas: number
          p_nb_jours_gr: number
          p_nb_repas: number
          p_taux_horaire: number
        }
        Returns: Json
      }
      get_tenant_modules: { Args: { p_company_id: number }; Returns: Json }
      get_user_company_id: { Args: never; Returns: number }
      get_user_role: { Args: never; Returns: string }
      has_permission: { Args: { p_permission_name: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_tenant_admin: { Args: never; Returns: boolean }
      my_company_id: { Args: never; Returns: number }
      my_login_enabled: { Args: never; Returns: boolean }
      upsert_my_profile: { Args: never; Returns: Json }
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
