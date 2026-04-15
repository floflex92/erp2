import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'
import { listAssets } from '@/lib/services/assetsService'
import { listPersonsForDirectory } from '@/lib/services/personsService'
import { ST_PLANIFIE, ST_EN_COURS } from '@/lib/transportCourses'
import type { Tables, TablesInsert } from '@/lib/database.types'
import { INTERVIEW_STATUS_LABELS, listInterviewsForEmployee, type InterviewRow } from '@/lib/hrInterviewsModule'
import type { Service } from '@/domains/services/domain'
import type { Exploitant } from '@/domains/exploitants/domain'

type Conducteur = Tables<'conducteurs'>
type Vehicule = Tables<'vehicules'>
type Remorque = Tables<'remorques'>
type Affectation = Tables<'affectations'>
type ConducteurDocument = Tables<'conducteur_documents'>
type ConducteurEvent = Tables<'conducteur_evenements_rh'>
type RhEventForm = Omit<TablesInsert<'conducteur_evenements_rh'>, 'conducteur_id'>
type OtLite = Pick<Tables<'ordres_transport'>, 'id' | 'conducteur_id' | 'reference' | 'statut' | 'statut_transport' | 'date_chargement_prevue' | 'date_livraison_prevue'>

const LICENSE_CATEGORIES = ['B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE'] as const
const RH_EVENT_TYPES = ['arret_maladie', 'avertissement', 'mise_a_pied', 'visite_medicale', 'entretien', 'accident_travail', 'retour_poste', 'autre'] as const
const RH_DOC_CATEGORIES = ['contrat', 'avenant', 'permis', 'fimo_fco', 'visite_medicale', 'tachygraphe', 'disciplinaire', 'autre'] as const
const RH_EVENT_TYPE_LABELS: Record<(typeof RH_EVENT_TYPES)[number], string> = {
  arret_maladie: 'Arret maladie',
  avertissement: 'Avertissement',
  mise_a_pied: 'Mise a pied',
  visite_medicale: 'Visite medicale',
  entretien: 'Entretien',
  accident_travail: 'Accident du travail',
  retour_poste: 'Retour poste',
  autre: 'Autre',
}
const SEVERITY_LABELS: Record<'info' | 'warning' | 'critical', string> = {
  info: 'Info',
  warning: 'A surveiller',
  critical: 'Critique',
}

const STATUT_COLORS: Record<string, string> = {
  actif:          'bg-green-100 text-green-700',
  inactif:        'bg-slate-100 text-slate-600',
  conge:          'bg-blue-100 text-blue-700',
  arret_maladie:  'bg-red-100 text-red-700',
}
const STATUT_LABELS: Record<string, string> = {
  actif: 'Actif', inactif: 'Inactif', conge: 'Congé', arret_maladie: 'Arrêt maladie',
}

function expColor(date: string | null) {
  if (!date) return 'text-slate-400'
  const d = (new Date(date).getTime() - Date.now()) / 86400000
  return d < 0 ? 'text-red-600 font-semibold' : d < 60 ? 'text-orange-500 font-semibold' : 'text-slate-600'
}

function countExpiringSoon(dates: Array<string | null>) {
  return dates.filter(date => {
    if (!date) return false
    const delta = (new Date(date).getTime() - Date.now()) / 86400000
    return delta >= 0 && delta < 60
  }).length
}

function formatDate(date: string | null) {
  return date ? new Date(date).toLocaleDateString('fr-FR') : 'Non renseigne'
}

function formatDateTimeShort(date: string | null) {
  if (!date) return 'Non planifie'
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function rhFeatureError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback
  if (message.includes('conducteur_evenements_rh') || message.includes('conducteur_documents')) {
    return 'Le dossier RH necessite la migration Supabase conducteurs RH avant utilisation.'
  }
  if (message.includes('Bucket not found')) {
    return 'Le bucket Supabase `conducteur-documents` est introuvable.'
  }
  return message || fallback
}

function normalizeConducteurPayload(form: TablesInsert<'conducteurs'>): TablesInsert<'conducteurs'> {
  return {
    ...form,
    nom: form.nom.trim(),
    prenom: form.prenom.trim(),
    telephone: form.telephone?.trim() || null,
    email: form.email?.trim().toLowerCase() || null,
    adresse: form.adresse?.trim() || null,
    matricule: form.matricule?.trim() || null,
    poste: form.poste?.trim() || null,
    type_contrat: form.type_contrat?.trim() || null,
    motif_sortie: form.motif_sortie?.trim() || null,
    contact_urgence_nom: form.contact_urgence_nom?.trim() || null,
    contact_urgence_telephone: form.contact_urgence_telephone?.trim() || null,
    numero_permis: form.numero_permis?.trim() || null,
    permis_categories: form.permis_categories ?? [],
    notes: form.notes?.trim() || null,
    preferences: form.preferences?.trim() || null,
  }
}

const EMPTY: TablesInsert<'conducteurs'> = {
  nom: '', prenom: '', telephone: null, email: null, adresse: null,
  matricule: null, poste: null, type_contrat: null, date_entree: null, date_sortie: null, motif_sortie: null,
  contact_urgence_nom: null, contact_urgence_telephone: null,
  date_naissance: null, numero_permis: null, permis_categories: [],
  permis_expiration: null, fimo_date: null, fco_date: null, fco_expiration: null,
  visite_medicale_date: null, visite_medicale_expiration: null,
  recyclage_date: null, recyclage_expiration: null,
  carte_tachy_numero: null, carte_tachy_expiration: null, statut: 'actif',
  notes: null, preferences: null,
}

const EMPTY_AFF: TablesInsert<'affectations'> & { conducteur_id: string } = {
  conducteur_id: '',
  vehicule_id: null,
  remorque_id: null,
  type_affectation: 'fixe',
  date_debut: null,
  date_fin: null,
  notes: null,
  exploitant_responsable_id: null,
  motif_affectation: null,
  est_exclusive: false,
}

const EMPTY_EVENT: RhEventForm = {
  event_type: 'autre',
  title: '',
  description: null,
  severity: 'info',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: null,
  reminder_at: null,
  document_id: null,
}

const EMPTY_DOCUMENT = {
  category: 'autre',
  title: '',
  issued_at: '',
  expires_at: '',
  is_mandatory: false,
  notes: '',
}

export default function Chauffeurs() {
  const [list, setList] = useState<Conducteur[]>([])
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [remorques, setRemorques] = useState<Remorque[]>([])
  const [affectations, setAffectations] = useState<Affectation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TablesInsert<'conducteurs'>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [rhEvents, setRhEvents] = useState<ConducteurEvent[]>([])
  const [rhDocuments, setRhDocuments] = useState<ConducteurDocument[]>([])
  const [canonicalInterviews, setCanonicalInterviews] = useState<InterviewRow[]>([])
  const [mappedProfileLabel, setMappedProfileLabel] = useState<string | null>(null)
  const [activeOrdersByConducteur, setActiveOrdersByConducteur] = useState<Record<string, OtLite[]>>({})
  const [rhLoading, setRhLoading] = useState(false)
  const [rhError, setRhError] = useState<string | null>(null)
  const [eventForm, setEventForm] = useState<RhEventForm>(EMPTY_EVENT)
  const [savingEvent, setSavingEvent] = useState(false)
  const [documentForm, setDocumentForm] = useState(EMPTY_DOCUMENT)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [savingDocument, setSavingDocument] = useState(false)

  // Affectation modal state
  const [affModal, setAffModal] = useState<string | null>(null) // conducteur_id
  const [affForm, setAffForm] = useState(EMPTY_AFF)
  const [affSaving, setAffSaving] = useState(false)
  const [affConducteurServiceId, setAffConducteurServiceId] = useState<string | null>(null)

  // Services & Exploitants (chargés au mount)
  const [services, setServices] = useState<Service[]>([])
  const [exploitants, setExploitants] = useState<Exploitant[]>([])

  async function load() {
    setLoading(true)
    setError(null)

    try {
      const [condRes, vehRes, remRes, affRes, otRes, svcRes, expRes] = await Promise.all([
        supabase.from('conducteurs').select('*').order('nom').order('prenom'),
        supabase.from('vehicules').select('*').order('immatriculation'),
        supabase.from('remorques').select('*').order('immatriculation'),
        supabase.from('affectations').select('*').eq('actif', true),
        supabase
          .from('ordres_transport')
          .select('id,conducteur_id,reference,statut,statut_transport,date_chargement_prevue,date_livraison_prevue')
          .in('statut_transport', [...ST_PLANIFIE, ...ST_EN_COURS])
          .not('conducteur_id', 'is', null)
          .order('date_chargement_prevue', { ascending: true, nullsFirst: false }),
        looseSupabase
          .from('services')
          .select('id,company_id,name,code,color,visual_marker,parent_service_id,is_active,created_at,updated_at,archived_at,description')
          .eq('is_active', true)
          .order('name'),
        looseSupabase
          .from('exploitants')
          .select('id,company_id,service_id,profil_id,name,type_exploitant,company_department,is_manager,manager_level,is_active,created_at,updated_at,archived_at')
          .eq('is_active', true)
          .order('name'),
      ])

      if (condRes.error) throw condRes.error
      if (vehRes.error) throw vehRes.error
      if (remRes.error) throw remRes.error
      if (affRes.error) throw affRes.error
      if (otRes.error) throw otRes.error

      let conducteurs = (condRes.data ?? []) as Conducteur[]
      let vehicules = (vehRes.data ?? []) as Vehicule[]
      let remorques = (remRes.data ?? []) as Remorque[]

      if (conducteurs.length === 0) {
        const persons = await listPersonsForDirectory()
        conducteurs = persons
          .filter(person => ['driver', 'conducteur', 'chauffeur'].includes((person.person_type ?? '').toLowerCase()))
          .map(person => ({
            id: person.legacy_conducteur_id ?? person.id,
            nom: person.last_name ?? '-',
            prenom: person.first_name ?? '',
            telephone: person.phone ?? null,
            email: person.email ?? null,
            statut: (person.status as Conducteur['statut']) ?? 'actif',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })) as Conducteur[]
      }

      if (vehicules.length === 0 || remorques.length === 0) {
        const assets = await listAssets()

        if (vehicules.length === 0) {
          vehicules = assets
            .filter(asset => asset.type === 'vehicle')
            .map(asset => ({
              id: asset.legacy_vehicule_id ?? asset.id,
              immatriculation: asset.registration ?? '-',
              marque: null,
              modele: null,
              statut: (asset.status as Vehicule['statut']) ?? 'disponible',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })) as Vehicule[]
        }

        if (remorques.length === 0) {
          remorques = assets
            .filter(asset => asset.type === 'trailer')
            .map(asset => ({
              id: asset.legacy_remorque_id ?? asset.id,
              immatriculation: asset.registration ?? '-',
              type_remorque: 'standard',
              statut: (asset.status as Remorque['statut']) ?? 'disponible',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })) as Remorque[]
        }
      }

      const groupedOrders: Record<string, OtLite[]> = {}
      for (const order of (otRes.data ?? []) as OtLite[]) {
        if (!order.conducteur_id) continue
        groupedOrders[order.conducteur_id] = [...(groupedOrders[order.conducteur_id] ?? []), order]
      }
      for (const conducteurId of Object.keys(groupedOrders)) {
        groupedOrders[conducteurId].sort((left, right) => {
          const isEnCours = (st: string | null) => ST_EN_COURS.includes(st as never)
          if (isEnCours(left.statut_transport) && !isEnCours(right.statut_transport)) return -1
          if (isEnCours(right.statut_transport) && !isEnCours(left.statut_transport)) return 1
          const leftTs = new Date(left.date_chargement_prevue ?? left.date_livraison_prevue ?? 0).getTime()
          const rightTs = new Date(right.date_chargement_prevue ?? right.date_livraison_prevue ?? 0).getTime()
          return leftTs - rightTs
        })
      }

      setList(conducteurs)
      setVehicules(vehicules)
      setRemorques(remorques)
      setAffectations(affRes.data ?? [])
      setActiveOrdersByConducteur(groupedOrders)
      setServices((svcRes.data as Service[] | null) ?? [])
      setExploitants((expRes.data as Exploitant[] | null) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const conducteurMap = useMemo(
    () => Object.fromEntries(list.map(conducteur => [conducteur.id, conducteur])),
    [list],
  )

  const filtered = list.filter(c => {
    const haystack = [
      c.nom,
      c.prenom,
      c.telephone,
      c.email,
      c.matricule,
      c.poste,
      c.type_contrat,
      c.numero_permis,
      c.preferences,
      c.notes,
      ...(c.permis_categories ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(search.toLowerCase().trim())
  })

  const stats = {
    actifs: list.filter(c => c.statut === 'actif').length,
    permisExpirent: countExpiringSoon(list.map(c => c.permis_expiration)),
    fcoExpirent: countExpiringSoon(list.map(c => c.fco_expiration)),
    tachyExpirent: countExpiringSoon(list.map(c => c.carte_tachy_expiration)),
  }

  function resetFeedback() {
    setError(null)
    setNotice(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY)
    setRhEvents([])
    setRhDocuments([])
    setCanonicalInterviews([])
    setMappedProfileLabel(null)
    setRhError(null)
    setEventForm(EMPTY_EVENT)
    setDocumentForm(EMPTY_DOCUMENT)
    setDocumentFile(null)
  }

  function openCreate() {
    resetFeedback()
    setEditingId(null)
    setForm(EMPTY)
    setRhEvents([])
    setRhDocuments([])
    setCanonicalInterviews([])
    setMappedProfileLabel(null)
    setRhError(null)
    setShowForm(true)
  }

  function openEdit(conducteur: Conducteur) {
    resetFeedback()
    setEditingId(conducteur.id)
    setRhError(null)
    setEventForm(EMPTY_EVENT)
    setDocumentForm(EMPTY_DOCUMENT)
    setDocumentFile(null)
    setCanonicalInterviews([])
    setMappedProfileLabel(null)
    setForm({
      nom: conducteur.nom,
      prenom: conducteur.prenom,
      telephone: conducteur.telephone,
      email: conducteur.email,
      adresse: conducteur.adresse,
      matricule: conducteur.matricule,
      poste: conducteur.poste,
      type_contrat: conducteur.type_contrat,
      date_entree: conducteur.date_entree,
      date_sortie: conducteur.date_sortie,
      motif_sortie: conducteur.motif_sortie,
      contact_urgence_nom: conducteur.contact_urgence_nom,
      contact_urgence_telephone: conducteur.contact_urgence_telephone,
      date_naissance: conducteur.date_naissance,
      numero_permis: conducteur.numero_permis,
      permis_categories: conducteur.permis_categories ?? [],
      permis_expiration: conducteur.permis_expiration,
      fimo_date: conducteur.fimo_date,
      fco_date: conducteur.fco_date,
      fco_expiration: conducteur.fco_expiration,
      visite_medicale_date: conducteur.visite_medicale_date,
      visite_medicale_expiration: conducteur.visite_medicale_expiration,
      recyclage_date: conducteur.recyclage_date,
      recyclage_expiration: conducteur.recyclage_expiration,
      carte_tachy_numero: conducteur.carte_tachy_numero,
      carte_tachy_expiration: conducteur.carte_tachy_expiration,
      statut: conducteur.statut,
      notes: conducteur.notes,
      preferences: conducteur.preferences,
    })
    setShowForm(true)
    void loadRhDossier(conducteur.id, conducteur)
  }

  function set<K extends keyof TablesInsert<'conducteurs'>>(k: K, v: TablesInsert<'conducteurs'>[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function resolveProfileForConducteur(conducteur: Conducteur): Promise<{ id: string; label: string } | null> {
    if (conducteur.matricule) {
      const byMatricule = await (supabase as any)
        .from('profils')
        .select('id, nom, prenom, matricule')
        .eq('matricule', conducteur.matricule)
        .limit(1)
      const row = byMatricule.data?.[0]
      if (row?.id) {
        const label = [row.prenom, row.nom].filter(Boolean).join(' ').trim() || row.matricule || row.id
        return { id: row.id as string, label }
      }
    }

    const byIdentity = await (supabase as any)
      .from('profils')
      .select('id, nom, prenom, matricule')
      .ilike('nom', conducteur.nom)
      .ilike('prenom', conducteur.prenom)
      .limit(1)
    const row = byIdentity.data?.[0]
    if (row?.id) {
      const label = [row.prenom, row.nom].filter(Boolean).join(' ').trim() || row.matricule || row.id
      return { id: row.id as string, label }
    }

    return null
  }

  async function loadRhDossier(conducteurId: string, conducteur?: Conducteur) {
    setRhLoading(true)
    setRhError(null)

    try {
      const [eventsRes, documentsRes] = await Promise.all([
        supabase
          .from('conducteur_evenements_rh')
          .select('*')
          .eq('conducteur_id', conducteurId)
          .order('start_date', { ascending: false }),
        supabase
          .from('conducteur_documents')
          .select('*')
          .eq('conducteur_id', conducteurId)
          .is('archived_at', null)
          .order('created_at', { ascending: false }),
      ])

      if (eventsRes.error) throw eventsRes.error
      if (documentsRes.error) throw documentsRes.error

      setRhEvents(eventsRes.data ?? [])
      setRhDocuments(documentsRes.data ?? [])

      if (conducteur) {
        const mapped = await resolveProfileForConducteur(conducteur)
        if (mapped) {
          const interviews = await listInterviewsForEmployee(mapped.id)
          setCanonicalInterviews(interviews)
          setMappedProfileLabel(mapped.label)
        } else {
          setCanonicalInterviews([])
          setMappedProfileLabel(null)
        }
      }
    } catch (err) {
      setRhEvents([])
      setRhDocuments([])
      setCanonicalInterviews([])
      setMappedProfileLabel(null)
      setRhError(rhFeatureError(err, 'Chargement du dossier RH impossible.'))
    } finally {
      setRhLoading(false)
    }
  }

  function toggleCategory(category: (typeof LICENSE_CATEGORIES)[number]) {
    const categories = form.permis_categories ?? []
    set('permis_categories', categories.includes(category)
      ? categories.filter(current => current !== category)
      : [...categories, category])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    resetFeedback()

    const payload = normalizeConducteurPayload(form)
    if (!payload.nom || !payload.prenom) {
      setError('Nom et prenom sont obligatoires.')
      return
    }

    setSaving(true)

    try {
      const query = editingId
        ? supabase.from('conducteurs').update(payload).eq('id', editingId)
        : supabase.from('conducteurs').insert(payload)

      const { error: saveError } = await query
      if (saveError) throw saveError

      setNotice(editingId ? 'Conducteur mis a jour.' : 'Conducteur ajoute.')
      closeForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function del(id: string) {
    resetFeedback()
    if (currentAff(id)) {
      setError("Retire d'abord l'affectation active avant de supprimer ce conducteur.")
      return
    }
    if (!confirm('Supprimer ce conducteur ?')) return

    try {
      const { error: deleteError } = await supabase.from('conducteurs').delete().eq('id', id)
      if (deleteError) throw deleteError
      setNotice('Conducteur supprime.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.')
    }
  }

  // --- Affectation helpers ---
  function currentAff(conducteurId: string) {
    return affectations.find(a => a.conducteur_id === conducteurId) ?? null
  }

  function openAffModal(c: Conducteur) {
    resetFeedback()
    const existing = currentAff(c.id)
    setAffForm(existing
      ? {
          conducteur_id: c.id,
          vehicule_id: existing.vehicule_id,
          remorque_id: existing.remorque_id,
          type_affectation: existing.type_affectation,
          date_debut: existing.date_debut,
          date_fin: existing.date_fin,
          notes: existing.notes,
          exploitant_responsable_id: existing.exploitant_responsable_id,
          motif_affectation: existing.motif_affectation,
          est_exclusive: existing.est_exclusive ?? false,
        }
      : { ...EMPTY_AFF, conducteur_id: c.id }
    )
    setAffConducteurServiceId(c.primary_service_id ?? null)
    setAffModal(c.id)
  }

  async function saveAff(e: React.FormEvent) {
    e.preventDefault()
    resetFeedback()
    if (!affModal) return

    if (
      affForm.type_affectation === 'temporaire' &&
      affForm.date_debut &&
      affForm.date_fin &&
      new Date(affForm.date_fin).getTime() < new Date(affForm.date_debut).getTime()
    ) {
      setError("La date de fin doit etre posterieure a la date de debut.")
      return
    }

    const conflictingVehicule = affectations.find(a =>
      a.conducteur_id !== affModal &&
      a.vehicule_id &&
      a.vehicule_id === affForm.vehicule_id,
    )
    if (conflictingVehicule) {
      const conducteur = conducteurMap[conflictingVehicule.conducteur_id]
      setError(
        `Le vehicule est deja affecte a ${conducteur ? `${conducteur.prenom} ${conducteur.nom}` : 'un autre conducteur'}.`,
      )
      return
    }

    const conflictingRemorque = affectations.find(a =>
      a.conducteur_id !== affModal &&
      a.remorque_id &&
      a.remorque_id === affForm.remorque_id,
    )
    if (conflictingRemorque) {
      const conducteur = conducteurMap[conflictingRemorque.conducteur_id]
      setError(
        `La remorque est deja affectee a ${conducteur ? `${conducteur.prenom} ${conducteur.nom}` : 'un autre conducteur'}.`,
      )
      return
    }
    setAffSaving(true)

    // Désactiver l'affectation précédente si elle existe
    const { error: disableError } = await supabase
      .from('affectations')
      .update({ actif: false })
      .eq('conducteur_id', affModal)
      .eq('actif', true)

    if (disableError) {
      setAffSaving(false)
      setError(disableError.message)
      return
    }

    // Si camion ET remorque vides → juste désaffectation
    if (!affForm.vehicule_id && !affForm.remorque_id) {
      // Mettre à jour le service du conducteur si modifié
      const conducteur = list.find(c => c.id === affModal)
      if (conducteur && affConducteurServiceId !== (conducteur.primary_service_id ?? null)) {
        await supabase.from('conducteurs').update({ primary_service_id: affConducteurServiceId }).eq('id', affModal)
      }
      setAffSaving(false)
      setNotice('Affectation retiree.')
      setAffModal(null)
      await load()
      return
    }

    const { error: insertError } = await supabase
      .from('affectations')
      .insert({
        ...affForm,
        conducteur_id: affModal,
        actif: true,
      })

    if (insertError) {
      setAffSaving(false)
      setError(insertError.message)
      return
    }

    // Mettre à jour le service du conducteur si modifié
    const conducteur = list.find(c => c.id === affModal)
    if (conducteur && affConducteurServiceId !== (conducteur.primary_service_id ?? null)) {
      await supabase.from('conducteurs').update({ primary_service_id: affConducteurServiceId }).eq('id', affModal)
    }

    setAffSaving(false)
    setNotice('Affectation enregistree.')
    setAffModal(null)
    await load()
  }

  async function saveRhEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return

    setSavingEvent(true)
    setRhError(null)

    try {
      const payload: TablesInsert<'conducteur_evenements_rh'> = {
        conducteur_id: editingId,
        event_type: eventForm.event_type,
        title: eventForm.title?.trim() || 'Evenement RH',
        description: eventForm.description?.trim() || null,
        severity: eventForm.severity || 'info',
        start_date: eventForm.start_date,
        end_date: eventForm.end_date || null,
        reminder_at: eventForm.reminder_at || null,
        document_id: eventForm.document_id || null,
      }

      const { error: insertError } = await supabase.from('conducteur_evenements_rh').insert(payload)
      if (insertError) throw insertError

      setNotice('Evenement RH enregistre.')
      setEventForm(EMPTY_EVENT)
      await loadRhDossier(editingId)
    } catch (err) {
      setRhError(rhFeatureError(err, "Enregistrement de l'evenement RH impossible."))
    } finally {
      setSavingEvent(false)
    }
  }

  async function deleteRhEvent(id: string) {
    if (!editingId) return

    try {
      const { error: deleteError } = await supabase.from('conducteur_evenements_rh').delete().eq('id', id)
      if (deleteError) throw deleteError
      setNotice('Evenement RH supprime.')
      await loadRhDossier(editingId)
    } catch (err) {
      setRhError(rhFeatureError(err, "Suppression de l'evenement RH impossible."))
    }
  }

  async function saveRhDocument(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId || !documentFile) return

    setSavingDocument(true)
    setRhError(null)

    const safeName = sanitizeFilename(documentFile.name)
    const storagePath = `${editingId}/${Date.now()}-${safeName}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('conducteur-documents')
        .upload(storagePath, documentFile, {
          contentType: documentFile.type || 'application/pdf',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { error: insertError } = await supabase.from('conducteur_documents').insert({
        conducteur_id: editingId,
        category: documentForm.category,
        title: documentForm.title.trim() || documentFile.name,
        file_name: documentFile.name,
        file_path: storagePath,
        mime_type: documentFile.type || 'application/pdf',
        storage_bucket: 'conducteur-documents',
        storage_path: storagePath,
        issued_at: documentForm.issued_at || null,
        expires_at: documentForm.expires_at || null,
        is_mandatory: documentForm.is_mandatory,
        notes: documentForm.notes.trim() || null,
      })

      if (insertError) throw insertError

      setNotice('Document RH televerse.')
      setDocumentForm(EMPTY_DOCUMENT)
      setDocumentFile(null)
      await loadRhDossier(editingId)
    } catch (err) {
      setRhError(rhFeatureError(err, 'Televersement du document RH impossible.'))
    } finally {
      setSavingDocument(false)
    }
  }

  async function archiveRhDocument(id: string) {
    if (!editingId) return

    try {
      const { error: updateError } = await supabase
        .from('conducteur_documents')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)

      if (updateError) throw updateError

      setNotice('Document RH archive.')
      await loadRhDossier(editingId)
    } catch (err) {
      setRhError(rhFeatureError(err, "Archivage du document RH impossible."))
    }
  }

  async function openRhDocument(doc: ConducteurDocument) {
    const bucket = doc.storage_bucket || 'conducteur-documents'
    const path = doc.storage_path || (doc as ConducteurDocument & { file_path?: string }).file_path
    if (!path) {
      setRhError('Document RH invalide: chemin de stockage manquant.')
      return
    }

    try {
      const { data, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60)

      if (urlError) throw urlError
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setRhError(rhFeatureError(err, "Ouverture du document RH impossible."))
    }
  }

  const vehMap = Object.fromEntries(vehicules.map(v => [v.id, v]))
  const remMap = Object.fromEntries(remorques.map(r => [r.id, r]))
  const occupiedVehiculeIds = useMemo(
    () => new Set(
      affectations
        .filter(a => a.conducteur_id !== affModal && a.vehicule_id)
        .map(a => a.vehicule_id as string),
    ),
    [affectations, affModal],
  )
  const occupiedRemorqueIds = useMemo(
    () => new Set(
      affectations
        .filter(a => a.conducteur_id !== affModal && a.remorque_id)
        .map(a => a.remorque_id as string),
    ),
    [affectations, affModal],
  )
  const availableVehicules = useMemo(
    () => vehicules.filter(v =>
      (!occupiedVehiculeIds.has(v.id) || v.id === affForm.vehicule_id),
    ),
    [vehicules, affForm.vehicule_id, occupiedVehiculeIds],
  )
  const availableRemorques = useMemo(
    () => remorques.filter(r =>
      (!occupiedRemorqueIds.has(r.id) || r.id === affForm.remorque_id),
    ),
    [remorques, affForm.remorque_id, occupiedRemorqueIds],
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Conducteurs</h2>
          <p className="text-slate-500 text-sm">{list.length} conducteur{list.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 sm:w-auto"
        >
          + Ajouter
        </button>
      </div>

      {(error || notice) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error ?? notice}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Actifs" value={stats.actifs} tone="emerald" />
        <StatCard label="Permis < 60 j" value={stats.permisExpirent} tone="amber" />
        <StatCard label="FCO < 60 j" value={stats.fcoExpirent} tone="amber" />
        <StatCard label="Tachy < 60 j" value={stats.tachyExpirent} tone="amber" />
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Rechercher par nom, contact, permis ou categorie..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 sm:w-72"
      />

      {/* Table */}
      <div className="nx-table-shell">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {search ? 'Aucun résultat' : 'Aucun conducteur enregistré'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1160px] text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Conducteur', 'Contact', 'Permis', 'FCO exp.', 'Carte tachy', 'OT en cours / a venir', 'Preferences', 'Affectation', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const aff = currentAff(c.id)
                const veh = aff?.vehicule_id ? vehMap[aff.vehicule_id] : null
                const rem = aff?.remorque_id ? remMap[aff.remorque_id] : null
                const otList = activeOrdersByConducteur[c.id] ?? []
                const firstOt = otList[0] ?? null
                const svcConducteur = services.find(s => s.id === c.primary_service_id) ?? null
                const expCond = aff?.exploitant_responsable_id
                  ? exploitants.find(ex => ex.id === aff.exploitant_responsable_id)
                  : null
                return (
                  <tr key={c.id} className={`border-t border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{c.nom} {c.prenom}</div>
                      <div className="text-xs text-slate-400">Ne le {formatDate(c.date_naissance)}</div>
                      {c.matricule && <div className="text-xs text-slate-400 font-mono mt-0.5">{c.matricule}</div>}
                      {svcConducteur && (
                        <span
                          className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                          style={{ backgroundColor: svcConducteur.color ?? '#475569' }}
                        >
                          {svcConducteur.code ? svcConducteur.code : svcConducteur.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{c.poste ?? 'Poste non renseigne'}</div>
                      <div className="text-xs text-slate-400">{c.type_contrat ?? 'Contrat non renseigne'}</div>
                      <div className="text-xs text-slate-400 mt-1">Entree: {formatDate(c.date_entree)}</div>
                      {c.date_sortie && <div className="text-xs text-slate-400">Sortie: {formatDate(c.date_sortie)}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-600">{c.telephone ?? '—'}</div>
                      <div className="text-xs text-slate-400">{c.email ?? ''}</div>
                      {c.contact_urgence_nom && (
                        <div className="text-xs text-slate-400 mt-1">
                          Urgence: {c.contact_urgence_nom}{c.contact_urgence_telephone ? ` · ${c.contact_urgence_telephone}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>{c.numero_permis ?? '—'}</div>
                      <div className={`text-xs ${expColor(c.permis_expiration)}`}>
                        {c.permis_expiration ? `exp. ${new Date(c.permis_expiration).toLocaleDateString('fr-FR')}` : ''}
                      </div>
                      {c.permis_categories && c.permis_categories.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {c.permis_categories.map(cat => (
                            <span key={cat} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{cat}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${expColor(c.fco_expiration)}`}>
                        {c.fco_expiration ? new Date(c.fco_expiration).toLocaleDateString('fr-FR') : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>{c.carte_tachy_numero ?? '—'}</div>
                      <div className={`text-xs ${expColor(c.carte_tachy_expiration)}`}>
                        {c.carte_tachy_expiration ? `exp. ${new Date(c.carte_tachy_expiration).toLocaleDateString('fr-FR')}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[220px]">
                      {firstOt ? (
                        <div>
                          <div className="text-xs font-semibold text-slate-700">{firstOt.reference}</div>
                          <div className="text-xs text-slate-500">
                            {ST_EN_COURS.includes(firstOt.statut_transport as never) ? 'En cours' : 'Planifie'} · {formatDateTimeShort(firstOt.date_chargement_prevue ?? firstOt.date_livraison_prevue)}
                          </div>
                          {otList.length > 1 && (
                            <div className="mt-1 text-[11px] text-slate-400">+{otList.length - 1} autre{otList.length - 1 > 1 ? 's' : ''} mission{otList.length - 1 > 1 ? 's' : ''}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Aucune mission active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      {c.preferences
                        ? <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 whitespace-pre-line">{c.preferences}</p>
                        : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 min-w-[180px]">
                      {aff ? (
                        <div className="space-y-1">
                          {veh && <div className="text-slate-700 font-medium">{veh.immatriculation}</div>}
                          {rem && <div className="text-slate-500 text-xs">{rem.immatriculation}</div>}
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${aff.type_affectation === 'fixe' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {aff.type_affectation === 'fixe' ? 'Fixe' : 'Temp.'}
                            </span>
                            {aff.est_exclusive && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700">Exclu.</span>
                            )}
                          </div>
                          {aff.type_affectation === 'temporaire' && aff.date_fin && (
                            <div className="text-xs text-slate-400">jusqu'au {new Date(aff.date_fin).toLocaleDateString('fr-FR')}</div>
                          )}
                          {expCond && (
                            <div className="text-[11px] text-slate-400">{expCond.name}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                      <button
                        onClick={() => openAffModal(c)}
                        className="mt-1 text-xs text-slate-500 underline hover:text-slate-800 block"
                      >
                        {aff ? 'Modifier' : 'Affecter'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUT_COLORS[c.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                        {STATUT_LABELS[c.statut] ?? c.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => openEdit(c)} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">Modifier</button>
                        <button onClick={() => del(c.id)} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Suppr.</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal ajout conducteur */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl sm:max-h-[90vh]">
            <div className="flex items-center justify-between border-b p-4 sm:p-6">
              <h3 className="text-lg font-semibold">{editingId ? 'Modifier un conducteur' : 'Ajouter un conducteur'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={submit} className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nom *"><input className={inp} value={form.nom} onChange={e => set('nom', e.target.value)} required /></Field>
                <Field label="Prénom *"><input className={inp} value={form.prenom} onChange={e => set('prenom', e.target.value)} required /></Field>
                <Field label="Téléphone"><input className={inp} value={form.telephone ?? ''} onChange={e => set('telephone', e.target.value || null)} /></Field>
                <Field label="Email"><input className={inp} type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value || null)} /></Field>
                <Field label="Date de naissance"><input className={inp} type="date" value={form.date_naissance ?? ''} onChange={e => set('date_naissance', e.target.value || null)} /></Field>
                <Field label="Statut">
                  <select className={inp} value={form.statut ?? 'actif'} onChange={e => set('statut', e.target.value)}>
                    {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Adresse"><input className={inp} value={form.adresse ?? ''} onChange={e => set('adresse', e.target.value || null)} /></Field>
                </div>

                <div className="mt-2 border-t pt-4 sm:col-span-2">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Contrat et dossier RH</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Matricule"><input className={inp} value={form.matricule ?? ''} onChange={e => set('matricule', e.target.value || null)} /></Field>
                    <Field label="Poste"><input className={inp} value={form.poste ?? ''} onChange={e => set('poste', e.target.value || null)} /></Field>
                    <Field label="Type de contrat"><input className={inp} value={form.type_contrat ?? ''} onChange={e => set('type_contrat', e.target.value || null)} placeholder="CDI, CDD, interim..." /></Field>
                    <Field label="Date d'entree"><input className={inp} type="date" value={form.date_entree ?? ''} onChange={e => set('date_entree', e.target.value || null)} /></Field>
                    <Field label="Date de sortie"><input className={inp} type="date" value={form.date_sortie ?? ''} onChange={e => set('date_sortie', e.target.value || null)} /></Field>
                    <Field label="Motif de sortie"><input className={inp} value={form.motif_sortie ?? ''} onChange={e => set('motif_sortie', e.target.value || null)} /></Field>
                    <Field label="Contact urgence"><input className={inp} value={form.contact_urgence_nom ?? ''} onChange={e => set('contact_urgence_nom', e.target.value || null)} /></Field>
                    <Field label="Tel urgence"><input className={inp} value={form.contact_urgence_telephone ?? ''} onChange={e => set('contact_urgence_telephone', e.target.value || null)} /></Field>
                  </div>
                </div>

                <div className="border-t pt-4 sm:col-span-2">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Permis de conduire</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Numéro"><input className={inp} value={form.numero_permis ?? ''} onChange={e => set('numero_permis', e.target.value || null)} /></Field>
                    <Field label="Expiration"><input className={inp} type="date" value={form.permis_expiration ?? ''} onChange={e => set('permis_expiration', e.target.value || null)} /></Field>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-medium text-slate-600 mb-2">Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {LICENSE_CATEGORIES.map(category => {
                        const active = (form.permis_categories ?? []).includes(category)
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => toggleCategory(category)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                          >
                            {category}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 sm:col-span-2">
                  <p className="text-sm font-semibold text-slate-700 mb-3">FCO / FIMO</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Date FIMO"><input className={inp} type="date" value={form.fimo_date ?? ''} onChange={e => set('fimo_date', e.target.value || null)} /></Field>
                    <Field label="Date FCO"><input className={inp} type="date" value={form.fco_date ?? ''} onChange={e => set('fco_date', e.target.value || null)} /></Field>
                    <Field label="Expiration FCO"><input className={inp} type="date" value={form.fco_expiration ?? ''} onChange={e => set('fco_expiration', e.target.value || null)} /></Field>
                    <Field label="Date recyclage"><input className={inp} type="date" value={form.recyclage_date ?? ''} onChange={e => set('recyclage_date', e.target.value || null)} /></Field>
                    <Field label="Expiration recyclage"><input className={inp} type="date" value={form.recyclage_expiration ?? ''} onChange={e => set('recyclage_expiration', e.target.value || null)} /></Field>
                  </div>
                </div>

                <div className="border-t pt-4 sm:col-span-2">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Visite medicale</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Date visite"><input className={inp} type="date" value={form.visite_medicale_date ?? ''} onChange={e => set('visite_medicale_date', e.target.value || null)} /></Field>
                    <Field label="Expiration visite"><input className={inp} type="date" value={form.visite_medicale_expiration ?? ''} onChange={e => set('visite_medicale_expiration', e.target.value || null)} /></Field>
                  </div>
                </div>

                <div className="border-t pt-4 sm:col-span-2">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Carte conducteur tachygraphe</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Numéro carte"><input className={inp} value={form.carte_tachy_numero ?? ''} onChange={e => set('carte_tachy_numero', e.target.value || null)} /></Field>
                    <Field label="Expiration"><input className={inp} type="date" value={form.carte_tachy_expiration ?? ''} onChange={e => set('carte_tachy_expiration', e.target.value || null)} /></Field>
                  </div>
                </div>

                <div className="border-t pt-4 sm:col-span-2">
                  <p className="text-sm font-semibold text-slate-700 mb-1">Préférences / Habitudes</p>
                  <p className="text-xs text-slate-400 mb-3">Zones habituelles, types de fret, horaires préférés, langues parlées…</p>
                  <textarea
                    className={`${inp} resize-none`}
                    rows={3}
                    value={form.preferences ?? ''}
                    onChange={e => set('preferences', e.target.value || null)}
                    placeholder="Ex : préfère les trajets nord-est, évite les livraisons nocturnes, parle anglais et allemand"
                  />
                </div>
              </div>

              {editingId && (
                <div className="mt-6 border-t pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Dossier RH</p>
                      <p className="text-xs text-slate-400">Evenements RH, disciplinaire et documents PDF.</p>
                    </div>
                    {rhLoading && <span className="text-xs text-slate-400">Chargement...</span>}
                  </div>

                  {rhError && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      {rhError}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-semibold text-slate-800">Evenements RH / disciplinaire</h4>
                      <form onSubmit={saveRhEvent} className="mt-4 space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Field label="Type">
                            <select className={inp} value={eventForm.event_type ?? 'autre'} onChange={e => setEventForm(current => ({ ...current, event_type: e.target.value }))}>
                              {RH_EVENT_TYPES.map(type => <option key={type} value={type}>{RH_EVENT_TYPE_LABELS[type]}</option>)}
                            </select>
                          </Field>
                          <Field label="Gravite">
                            <select className={inp} value={eventForm.severity ?? 'info'} onChange={e => setEventForm(current => ({ ...current, severity: e.target.value }))}>
                              {(['info', 'warning', 'critical'] as const).map(level => <option key={level} value={level}>{SEVERITY_LABELS[level]}</option>)}
                            </select>
                          </Field>
                        </div>
                        <Field label="Titre">
                          <input className={inp} value={eventForm.title ?? ''} onChange={e => setEventForm(current => ({ ...current, title: e.target.value }))} required />
                        </Field>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <Field label="Debut">
                            <input className={inp} type="date" value={eventForm.start_date ?? ''} onChange={e => setEventForm(current => ({ ...current, start_date: e.target.value }))} required />
                          </Field>
                          <Field label="Fin">
                            <input className={inp} type="date" value={eventForm.end_date ?? ''} onChange={e => setEventForm(current => ({ ...current, end_date: e.target.value || null }))} />
                          </Field>
                          <Field label="Alerte">
                            <input className={inp} type="date" value={eventForm.reminder_at ?? ''} onChange={e => setEventForm(current => ({ ...current, reminder_at: e.target.value || null }))} />
                          </Field>
                        </div>
                        <Field label="Description">
                          <textarea className={`${inp} resize-none`} rows={3} value={eventForm.description ?? ''} onChange={e => setEventForm(current => ({ ...current, description: e.target.value || null }))} />
                        </Field>
                        <Field label="Document lie">
                          <select className={inp} value={eventForm.document_id ?? ''} onChange={e => setEventForm(current => ({ ...current, document_id: e.target.value || null }))}>
                            <option value="">Aucun document</option>
                            {rhDocuments.map(doc => (
                              <option key={doc.id} value={doc.id}>{doc.title}</option>
                            ))}
                          </select>
                        </Field>
                        <div className="flex justify-end">
                          <button type="submit" disabled={savingEvent} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50">
                            {savingEvent ? 'Enregistrement...' : 'Ajouter evenement'}
                          </button>
                        </div>
                      </form>

                      <div className="mt-4 space-y-2">
                        {rhEvents.length === 0 ? (
                          <p className="text-xs text-slate-400">Aucun evenement RH enregistre.</p>
                        ) : rhEvents.map(event => (
                          <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-slate-800">{event.title}</div>
                                <div className="text-xs text-slate-400">{event.event_type} · {formatDate(event.start_date)}{event.end_date ? ` au ${formatDate(event.end_date)}` : ''}</div>
                              </div>
                              <button type="button" onClick={() => void deleteRhEvent(event.id)} className="text-xs text-slate-400 hover:text-red-500">Suppr.</button>
                            </div>
                            {event.description && <p className="mt-2 text-xs text-slate-500 whitespace-pre-line">{event.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="text-sm font-semibold text-slate-800">Documents PDF</h4>
                      <form onSubmit={saveRhDocument} className="mt-4 space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Field label="Categorie">
                            <select className={inp} value={documentForm.category} onChange={e => setDocumentForm(current => ({ ...current, category: e.target.value }))}>
                              {RH_DOC_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                            </select>
                          </Field>
                          <Field label="Titre">
                            <input className={inp} value={documentForm.title} onChange={e => setDocumentForm(current => ({ ...current, title: e.target.value }))} />
                          </Field>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Field label="Date emission">
                            <input className={inp} type="date" value={documentForm.issued_at} onChange={e => setDocumentForm(current => ({ ...current, issued_at: e.target.value }))} />
                          </Field>
                          <Field label="Expiration">
                            <input className={inp} type="date" value={documentForm.expires_at} onChange={e => setDocumentForm(current => ({ ...current, expires_at: e.target.value }))} />
                          </Field>
                        </div>
                        <Field label="Fichier PDF">
                          <input className={inp} type="file" accept="application/pdf" onChange={e => setDocumentFile(e.target.files?.[0] ?? null)} required />
                        </Field>
                        <Field label="Notes">
                          <textarea className={`${inp} resize-none`} rows={3} value={documentForm.notes} onChange={e => setDocumentForm(current => ({ ...current, notes: e.target.value }))} />
                        </Field>
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input type="checkbox" checked={documentForm.is_mandatory} onChange={e => setDocumentForm(current => ({ ...current, is_mandatory: e.target.checked }))} />
                          Document obligatoire
                        </label>
                        <div className="flex justify-end">
                          <button type="submit" disabled={savingDocument || !documentFile} className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50">
                            {savingDocument ? 'Televersement...' : 'Ajouter document'}
                          </button>
                        </div>
                      </form>

                      <div className="mt-4 space-y-2">
                        {rhDocuments.length === 0 ? (
                          <p className="text-xs text-slate-400">Aucun document RH enregistre.</p>
                        ) : rhDocuments.map(doc => (
                          <div key={doc.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-slate-800">{doc.title}</div>
                                <div className="text-xs text-slate-400">{doc.category} · {doc.file_name}</div>
                                {doc.expires_at && <div className={`text-xs ${expColor(doc.expires_at)}`}>Expiration {formatDate(doc.expires_at)}</div>}
                              </div>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => void openRhDocument(doc)} className="text-xs text-slate-400 hover:text-slate-700">Ouvrir</button>
                                <button type="button" onClick={() => void archiveRhDocument(doc.id)} className="text-xs text-slate-400 hover:text-red-500">Archiver</button>
                              </div>
                            </div>
                            {doc.notes && <p className="mt-2 text-xs text-slate-500 whitespace-pre-line">{doc.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-800">Entretiens salaries (source canonique)</h4>
                      {mappedProfileLabel && <span className="text-xs text-slate-500">Profil lie: {mappedProfileLabel}</span>}
                    </div>
                    {!mappedProfileLabel ? (
                      <p className="mt-2 text-xs text-slate-400">
                        Aucun profil salarie associe automatiquement a ce conducteur (matricule / nom-prenom).
                      </p>
                    ) : canonicalInterviews.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-400">Aucun entretien trouve pour ce profil.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {canonicalInterviews.slice(0, 8).map(interview => (
                          <li key={interview.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-slate-800">{interview.interview_type?.name ?? 'Entretien'}</p>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                {INTERVIEW_STATUS_LABELS[interview.status]}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {interview.planned_at ? new Date(interview.planned_at).toLocaleString('fr-FR') : 'Date non planifiee'}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeForm} className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 sm:w-auto">Annuler</button>
                <button type="submit" disabled={saving} className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50 sm:w-auto">
                  {saving ? 'Enregistrement...' : editingId ? 'Sauvegarder' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal affectation véhicule / remorque / service / exploitant */}
      {affModal && (() => {
        const conducteurModal = list.find(c => c.id === affModal)
        const selectedVeh = vehicules.find(v => v.id === affForm.vehicule_id)
        const selectedRem = remorques.find(r => r.id === affForm.remorque_id)
        const svcActuel = services.find(s => s.id === affConducteurServiceId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
            <div className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[92vh]">
              {/* En-tête */}
              <div className="flex items-start justify-between border-b px-6 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    Affectation — {conducteurModal ? `${conducteurModal.prenom} ${conducteurModal.nom}` : ''}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">Véhicule · Remorque · Service · Exploitant</p>
                </div>
                <button onClick={() => setAffModal(null)} className="text-slate-400 hover:text-slate-600 mt-0.5">✕</button>
              </div>

              <form onSubmit={saveAff} className="divide-y divide-slate-100">

                {/* — Section Véhicule & Remorque — */}
                <div className="space-y-4 px-6 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ressources matérielles</p>

                  {/* Sélection rapide véhicule */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Camion</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {availableVehicules.slice(0, 8).map(v => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setAffForm(f => ({ ...f, vehicule_id: f.vehicule_id === v.id ? null : v.id }))}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            affForm.vehicule_id === v.id
                              ? 'border-slate-800 bg-slate-800 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {v.immatriculation}{v.marque ? ` · ${v.marque}` : ''}
                        </button>
                      ))}
                    </div>
                    {availableVehicules.length > 8 && (
                      <select
                        className={inp}
                        value={affForm.vehicule_id ?? ''}
                        onChange={e => setAffForm(f => ({ ...f, vehicule_id: e.target.value || null }))}
                      >
                        <option value="">— Tous les camions —</option>
                        {availableVehicules.map(v => (
                          <option key={v.id} value={v.id}>{v.immatriculation}{v.marque ? ` — ${v.marque}` : ''}{v.modele ? ` ${v.modele}` : ''}</option>
                        ))}
                      </select>
                    )}
                    {selectedVeh && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <span className="font-semibold">{selectedVeh.immatriculation}</span>
                        {selectedVeh.marque && <span>{selectedVeh.marque} {selectedVeh.modele ?? ''}</span>}
                        <button type="button" className="ml-auto text-slate-400 hover:text-red-500" onClick={() => setAffForm(f => ({ ...f, vehicule_id: null }))}>✕</button>
                      </div>
                    )}
                  </div>

                  {/* Sélection rapide remorque */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Remorque</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {availableRemorques.slice(0, 6).map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setAffForm(f => ({ ...f, remorque_id: f.remorque_id === r.id ? null : r.id }))}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            affForm.remorque_id === r.id
                              ? 'border-slate-800 bg-slate-800 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {r.immatriculation}{r.type_remorque ? ` · ${r.type_remorque}` : ''}
                        </button>
                      ))}
                    </div>
                    {availableRemorques.length > 6 && (
                      <select
                        className={inp}
                        value={affForm.remorque_id ?? ''}
                        onChange={e => setAffForm(f => ({ ...f, remorque_id: e.target.value || null }))}
                      >
                        <option value="">— Toutes les remorques —</option>
                        {availableRemorques.map(r => (
                          <option key={r.id} value={r.id}>{r.immatriculation}{r.type_remorque ? ` — ${r.type_remorque}` : ''}</option>
                        ))}
                      </select>
                    )}
                    {selectedRem && (
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <span className="font-semibold">{selectedRem.immatriculation}</span>
                        {selectedRem.type_remorque && <span>{selectedRem.type_remorque}</span>}
                        <button type="button" className="ml-auto text-slate-400 hover:text-red-500" onClick={() => setAffForm(f => ({ ...f, remorque_id: null }))}>✕</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* — Section Service & Exploitant — */}
                <div className="space-y-4 px-6 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Service & Exploitant</p>

                  {/* Service du conducteur */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Service du conducteur{' '}
                      <span className="text-slate-400 font-normal">(modifie le rattachement principal)</span>
                    </label>
                    {services.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setAffConducteurServiceId(null)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            !affConducteurServiceId
                              ? 'border-slate-800 bg-slate-800 text-white'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400'
                          }`}
                        >
                          Non attribué
                        </button>
                        {services.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setAffConducteurServiceId(affConducteurServiceId === s.id ? null : s.id)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                              affConducteurServiceId === s.id
                                ? 'border-slate-800 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                            }`}
                            style={affConducteurServiceId === s.id ? { backgroundColor: s.color ?? '#1e293b', borderColor: s.color ?? '#1e293b' } : {}}
                          >
                            {s.code ? `[${s.code}] ` : ''}{s.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Aucun service configuré — créer des services dans Paramètres.</p>
                    )}
                    {svcActuel && (
                      <p className="mt-1.5 text-xs text-slate-500">Actuel : <span className="font-medium">{svcActuel.name}</span></p>
                    )}
                  </div>

                  {/* Exploitant responsable */}
                  <Field label="Exploitant responsable de cette affectation">
                    {exploitants.length > 0 ? (
                      <select
                        className={inp}
                        value={affForm.exploitant_responsable_id ?? ''}
                        onChange={e => setAffForm(f => ({ ...f, exploitant_responsable_id: e.target.value || null }))}
                      >
                        <option value="">— Aucun —</option>
                        {exploitants.map(ex => (
                          <option key={ex.id} value={ex.id}>{ex.name}{ex.company_department ? ` (${ex.company_department})` : ''}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">
                        Aucun exploitant configuré — créer des exploitants dans Paramètres.
                      </p>
                    )}
                  </Field>
                </div>

                {/* — Section Paramètres — */}
                <div className="space-y-4 px-6 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Paramètres</p>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Type d'affectation</label>
                    <div className="flex gap-3">
                      {(['fixe', 'temporaire'] as const).map(t => (
                        <label key={t} className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-all ${
                          affForm.type_affectation === t
                            ? 'border-slate-800 bg-slate-800 text-white'
                            : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                        }`}>
                          <input
                            type="radio"
                            name="type_aff"
                            value={t}
                            checked={affForm.type_affectation === t}
                            onChange={() => setAffForm(f => ({ ...f, type_affectation: t }))}
                            className="sr-only"
                          />
                          {t === 'fixe' ? 'Fixe' : 'Temporaire'}
                        </label>
                      ))}
                    </div>
                  </div>

                  {affForm.type_affectation === 'temporaire' && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Du">
                        <input className={inp} type="date" value={affForm.date_debut ?? ''} onChange={e => setAffForm(f => ({ ...f, date_debut: e.target.value || null }))} />
                      </Field>
                      <Field label="Au">
                        <input className={inp} type="date" value={affForm.date_fin ?? ''} onChange={e => setAffForm(f => ({ ...f, date_fin: e.target.value || null }))} />
                      </Field>
                    </div>
                  )}

                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={affForm.est_exclusive ?? false}
                      onChange={e => setAffForm(f => ({ ...f, est_exclusive: e.target.checked }))}
                      className="h-4 w-4 rounded accent-slate-800"
                    />
                    <span className="text-sm text-slate-700">
                      Affectation exclusive
                      <span className="ml-1 text-xs text-slate-400">(conducteur dédié à ce véhicule)</span>
                    </span>
                  </label>

                  <Field label="Motif">
                    <input
                      className={inp}
                      value={affForm.motif_affectation ?? ''}
                      onChange={e => setAffForm(f => ({ ...f, motif_affectation: e.target.value || null }))}
                      placeholder="Ex: remplacement, mission longue..."
                    />
                  </Field>

                  <Field label="Notes internes">
                    <input className={inp} value={affForm.notes ?? ''} onChange={e => setAffForm(f => ({ ...f, notes: e.target.value || null }))} placeholder="Optionnel" />
                  </Field>
                </div>

                {/* — Pied de formulaire — */}
                <div className="flex flex-col items-stretch gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  {currentAff(affModal) && (
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:text-red-600"
                      onClick={async () => {
                        await supabase.from('affectations').update({ actif: false }).eq('conducteur_id', affModal).eq('actif', true)
                        setAffModal(null)
                        load()
                      }}
                    >
                      Retirer l'affectation
                    </button>
                  )}
                  <div className="ml-auto flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <button type="button" onClick={() => setAffModal(null)} className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 sm:w-auto">Annuler</button>
                    <button type="submit" disabled={affSaving} className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50 sm:w-auto">
                      {affSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary-soft)]'

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'amber' }) {
  const toneClass = tone === 'emerald'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-amber-200 bg-amber-50 text-amber-700'

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="text-xs font-medium uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}

