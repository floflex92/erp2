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
          nom: string | null
          prenom: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: string
          nom?: string | null
          prenom?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          nom?: string | null
          prenom?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
          code_postal: string | null
          conditions_paiement: number | null
          created_at: string
          email: string | null
          encours_max: number | null
          id: string
          nom: string
          notes: string | null
          pays: string | null
          siret: string | null
          site_web: string | null
          taux_tva_defaut: number | null
          telephone: string | null
          tva_intra: string | null
          type_client: string
          updated_at: string
          ville: string | null
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          code_postal?: string | null
          conditions_paiement?: number | null
          created_at?: string
          email?: string | null
          encours_max?: number | null
          id?: string
          nom: string
          notes?: string | null
          pays?: string | null
          siret?: string | null
          site_web?: string | null
          taux_tva_defaut?: number | null
          telephone?: string | null
          tva_intra?: string | null
          type_client?: string
          updated_at?: string
          ville?: string | null
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          code_postal?: string | null
          conditions_paiement?: number | null
          created_at?: string
          email?: string | null
          encours_max?: number | null
          id?: string
          nom?: string
          notes?: string | null
          pays?: string | null
          siret?: string | null
          site_web?: string | null
          taux_tva_defaut?: number | null
          telephone?: string | null
          tva_intra?: string | null
          type_client?: string
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      conducteurs: {
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
          preferences: string | null
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
          preferences?: string | null
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
          preferences?: string | null
          prenom?: string
          statut?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
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
      ordres_transport: {
        Row: {
          client_id: string
          conducteur_id: string | null
          created_at: string
          date_chargement_prevue: string | null
          date_livraison_prevue: string | null
          date_livraison_reelle: string | null
          distance_km: number | null
          facturation_id: string | null
          id: string
          instructions: string | null
          nature_marchandise: string | null
          nombre_colis: number | null
          notes_internes: string | null
          numero_bl: string | null
          numero_cmr: string | null
          poids_kg: number | null
          prix_ht: number | null
          reference: string
          remorque_id: string | null
          statut: string
          statut_operationnel: string | null
          taux_tva: number | null
          temperature_requise: string | null
          type_transport: string
          updated_at: string
          vehicule_id: string | null
          volume_m3: number | null
        }
        Insert: {
          client_id: string
          conducteur_id?: string | null
          created_at?: string
          date_chargement_prevue?: string | null
          date_livraison_prevue?: string | null
          date_livraison_reelle?: string | null
          distance_km?: number | null
          facturation_id?: string | null
          id?: string
          instructions?: string | null
          nature_marchandise?: string | null
          nombre_colis?: number | null
          notes_internes?: string | null
          numero_bl?: string | null
          numero_cmr?: string | null
          poids_kg?: number | null
          prix_ht?: number | null
          reference?: string
          remorque_id?: string | null
          statut?: string
          statut_operationnel?: string | null
          taux_tva?: number | null
          temperature_requise?: string | null
          type_transport?: string
          updated_at?: string
          vehicule_id?: string | null
          volume_m3?: number | null
        }
        Update: {
          client_id?: string
          conducteur_id?: string | null
          created_at?: string
          date_chargement_prevue?: string | null
          date_livraison_prevue?: string | null
          date_livraison_reelle?: string | null
          distance_km?: number | null
          facturation_id?: string | null
          id?: string
          instructions?: string | null
          nature_marchandise?: string | null
          nombre_colis?: number | null
          notes_internes?: string | null
          numero_bl?: string | null
          numero_cmr?: string | null
          poids_kg?: number | null
          prix_ht?: number | null
          reference?: string
          remorque_id?: string | null
          statut?: string
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
            foreignKeyName: "fk_ot_facture"
            columns: ["facturation_id"]
            isOneToOne: false
            referencedRelation: "factures"
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
      remorques: {
        Row: {
          assurance_expiration: string | null
          charge_utile_kg: number | null
          created_at: string
          ct_expiration: string | null
          id: string
          immatriculation: string
          longueur_m: number | null
          marque: string | null
          notes: string | null
          preferences: string | null
          statut: string
          type_remorque: string
          updated_at: string
        }
        Insert: {
          assurance_expiration?: string | null
          charge_utile_kg?: number | null
          created_at?: string
          ct_expiration?: string | null
          id?: string
          immatriculation: string
          longueur_m?: number | null
          marque?: string | null
          notes?: string | null
          preferences?: string | null
          statut?: string
          type_remorque?: string
          updated_at?: string
        }
        Update: {
          assurance_expiration?: string | null
          charge_utile_kg?: number | null
          created_at?: string
          ct_expiration?: string | null
          id?: string
          immatriculation?: string
          longueur_m?: number | null
          marque?: string | null
          notes?: string | null
          preferences?: string | null
          statut?: string
          type_remorque?: string
          updated_at?: string
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
          assurance_expiration: string | null
          created_at: string
          ct_expiration: string | null
          id: string
          immatriculation: string
          km_actuel: number | null
          marque: string | null
          modele: string | null
          notes: string | null
          preferences: string | null
          ptac_kg: number | null
          statut: string
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
          ct_expiration?: string | null
          id?: string
          immatriculation: string
          km_actuel?: number | null
          marque?: string | null
          modele?: string | null
          notes?: string | null
          preferences?: string | null
          ptac_kg?: number | null
          statut?: string
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
          ct_expiration?: string | null
          id?: string
          immatriculation?: string
          km_actuel?: number | null
          marque?: string | null
          modele?: string | null
          notes?: string | null
          preferences?: string | null
          ptac_kg?: number | null
          statut?: string
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
