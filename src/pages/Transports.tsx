import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/lib/database.types'
import { STATUT_OPS, StatutOpsDot, type StatutOps } from '@/lib/statut-ops'
import BourseAffretementPanel from '@/components/transports/BourseAffretementPanel'
import SiteMapPicker from '@/components/transports/SiteMapPicker'
import { useLogisticSites } from '@/hooks/useLogisticSites'
import { useTransportStatusHistory } from '@/hooks/useTransportStatusHistory'
import { useAuth } from '@/lib/auth'
import { computeTruckRoute } from '@/lib/routing'
import {
  evaluateAffretementCompletionReadiness,
  findAffreteurOnboardingForScope,
  getAffretementContractByOtId,
  listAffreteurOnboardings,
  listAffretementContractsByOnboarding,
  subscribeAffretementPortalUpdates,
} from '@/lib/affretementPortal'
import {
  setCourseAffretement,
  TRANSPORT_SOURCES,
  TRANSPORT_STATUS_FLOW,
  TRANSPORT_STATUS_LABELS,
  OT_STATUT_BADGE_LIGHT_CLS,
  type TransportStatus,
  type OtLigne,
  listOtLignes,
  syncOtLignes,
} from '@/lib/transportCourses'
import { addCourseToMission, createMissionFromCourses, removeCourseFromMission } from '@/lib/transportMissions'
import {
  TYPES_CHARGEMENT_LABELS,
  TYPES_PALETTE_LABELS,
  TYPES_CHARGEMENT_PALETTE,
  calcRemplissageGroupage,
  calcMetragePalettes,
  couleurBarre,
  couleurTexte,
  SEUIL_ALERTE_ORANGE,
} from '@/lib/chargementRules'
import {
  validateTrailerAssignment,
  checkCompatibiliteMetier,
  filterCompatibleTrailers,
  TRAILER_TYPES,
  TRAILER_TYPE_MAP,
} from '@/lib/trailerValidation'
import ChargementBars from '@/components/transports/ChargementBars'

type OT = Tables<'ordres_transport'>
type EtapeMission = Tables<'etapes_mission'>
type ClientLookup = { id: string; nom: string }
type ConducteurLookup = { id: string; nom: string; prenom: string }
type VehiculeLookup = { id: string; immatriculation: string; marque: string | null }
type RemorqueLookup = {
  id: string
  immatriculation: string
  type_remorque: string
  trailer_type_code: string | null
  categorie_remorque: string | null
  charge_utile_kg: number | null
  longueur_m: number | null
  volume_max_m3: number | null
  largeur_utile_m: number | null
  hauteur_utile_m: number | null
  nb_palettes_max: number | null
}
type AffreteurLookup = { id: string; company_name: string }
type LogisticSite = Tables<'sites_logistiques'>
type SiteUsageType = 'chargement' | 'livraison' | 'mixte'
type SiteKind = 'chargement' | 'livraison'
type SiteDraft = {
  entreprise_id: string
  nom: string
  adresse: string
  usage_type: SiteUsageType
  horaires_ouverture: string
  jours_ouverture: string
  notes_livraison: string
  latitude: number | null
  longitude: number | null
  showMap: boolean
}

type OtLigneDraft = {
  libelle: string
  type_chargement: string | null
  poids_kg: number | null
  metrage_ml: number | null
  nombre_colis: number | null
  notes: string | null
}


const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', confirme: 'Confirmé', en_cours: 'En cours',
  livre: 'Livré', facture: 'Facturé', annule: 'Annulé',
}
const TRANSPORT_STATUS_COLORS: Record<TransportStatus, string> = {
  en_attente_validation: 'bg-slate-100 text-slate-700',
  valide: 'bg-blue-100 text-blue-700',
  en_attente_planification: 'bg-indigo-100 text-indigo-700',
  planifie: 'bg-cyan-100 text-cyan-700',
  en_cours_approche_chargement: 'bg-amber-100 text-amber-700',
  en_chargement: 'bg-orange-100 text-orange-700',
  en_transit: 'bg-purple-100 text-purple-700',
  en_livraison: 'bg-fuchsia-100 text-fuchsia-700',
  termine: 'bg-emerald-100 text-emerald-700',
  annule: 'bg-red-100 text-red-700',
}
const TYPE_TRANSPORT_LABELS: Record<string, string> = {
  complet: 'Complet', partiel: 'Partiel', express: 'Express', groupage: 'Groupage',
}
const SITE_USAGE_LABELS: Record<SiteUsageType, string> = {
  chargement: 'Chargement uniquement',
  livraison: 'Livraison uniquement',
  mixte: 'Chargement et livraison',
}

const EMPTY_OT: TablesInsert<'ordres_transport'> = {
  client_id: '', type_transport: 'complet', statut: 'brouillon',
  source_course: 'manuel', statut_transport: 'en_attente_validation',
  donneur_ordre_id: '', est_affretee: false, affreteur_id: null,
  chargement_site_id: null, livraison_site_id: null,
  reference_externe: null,
  nature_marchandise: null, poids_kg: null, tonnage: null, longueur_m: null, metrage_ml: null, volume_m3: null, nombre_colis: null,
  type_chargement: null, type_palette: null,
  largeur_m: null, hauteur_m: null, nb_palettes: null,
  adr: false, temperature_dirigee: false, hors_gabarit: false, charge_indivisible: false,
  date_chargement_prevue: null, date_livraison_prevue: null,
  conducteur_id: null, vehicule_id: null, remorque_id: null,
  prix_ht: null, taux_tva: 20, distance_km: null,
  numero_cmr: null, numero_bl: null,
  instructions: null, notes_internes: null,
}

const inp = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary-soft)]'

const EMPTY_SITE_DRAFT: SiteDraft = {
  entreprise_id: '',
  nom: '',
  adresse: '',
  usage_type: 'mixte',
  horaires_ouverture: '',
  jours_ouverture: '',
  notes_livraison: '',
  latitude: null,
  longitude: null,
  showMap: false,
}

function emptyOtSiteDrafts(): Record<SiteKind, SiteDraft> {
  return { chargement: { ...EMPTY_SITE_DRAFT }, livraison: { ...EMPTY_SITE_DRAFT } }
}

const pad2 = (n: number) => String(n).padStart(2, '0')

function normalizeAddressValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function siteSupportsKind(site: LogisticSite, kind: SiteKind) {
  return site.usage_type === 'mixte' || site.usage_type === kind
}

function siteUsageLabel(site: LogisticSite) {
  return SITE_USAGE_LABELS[(site.usage_type as SiteUsageType) ?? 'mixte'] ?? 'Chargement et livraison'
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}

function SectionCard({
  title,
  description,
  children,
  tone = 'default',
}: {
  title: string
  description?: string
  children: React.ReactNode
  tone?: 'default' | 'highlight'
}) {
  return (
    <section className={`rounded-[28px] border p-6 shadow-sm ${tone === 'highlight' ? 'border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50' : 'border-slate-200 bg-white'}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function SummaryPill({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'strong' | 'success' }) {
  const toneClass = tone === 'strong'
    ? 'border-slate-900 bg-slate-900 text-white'
    : tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-slate-200 bg-white text-slate-700'
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  )
}

export default function Transports() {
  const { role, profil, user } = useAuth()
  const isAffreteurSession = role === 'affreteur'
  const canCreateOt = !isAffreteurSession
  const canEditOt = !isAffreteurSession
  const canChangeOtStatus = !isAffreteurSession
  const canDeleteOt = !isAffreteurSession
  const isPrivilegedRole = role === 'admin' || role === 'dirigeant' || role === 'exploitant'
  const canUseBourse = isPrivilegedRole
  const canManageSites = isPrivilegedRole

  const [list, setList] = useState<OT[]>([])
  const [clients, setClients] = useState<ClientLookup[]>([])
  const [conducteurs, setConducteurs] = useState<ConducteurLookup[]>([])
  const [vehicules, setVehicules] = useState<VehiculeLookup[]>([])
  const [remorques, setRemorques] = useState<RemorqueLookup[]>([])
  const [affreteurs, setAffreteurs] = useState<AffreteurLookup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('tous')
  const [listView, setListView] = useState<'principal' | 'affretement'>('principal')
  const [transportTab, setTransportTab] = useState<'ot' | 'bourse' | 'fiches'>('ot')
  const [statusGuardNotice, setStatusGuardNotice] = useState<string | null>(null)
  const [affreteurOtIds, setAffreteurOtIds] = useState<string[]>([])
  const [groupageTargetId, setGroupageTargetId] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingOtId, setEditingOtId] = useState<string | null>(null)
  const [form, setForm] = useState<TablesInsert<'ordres_transport'>>(EMPTY_OT)
  const [calculatingDistance, setCalculatingDistance] = useState(false)
  const [siteDrafts, setSiteDrafts] = useState<Record<SiteKind, SiteDraft>>({
    chargement: { ...EMPTY_SITE_DRAFT },
    livraison: { ...EMPTY_SITE_DRAFT },
  })
  const [saving, setSaving] = useState(false)
  const [lotLines, setLotLines] = useState<OtLigneDraft[]>([])
  const [selectedLots, setSelectedLots] = useState<OtLigne[]>([])

  // Detail panel
  const [selected, setSelected] = useState<OT | null>(null)
  const [groupageOts, setGroupageOts] = useState<Array<{ poids_kg: number | null; tonnage: number | null; metrage_ml: number | null }>>([])
  const [etapes, setEtapes] = useState<EtapeMission[]>([])
  const [loadingEtapes, setLoadingEtapes] = useState(false)
  const { sites, addSite, updateSite } = useLogisticSites()
  const { history: transportStatusHistory, loading: loadingTransportHistory, updateStatus: updateTransportStatus, load: loadTransportHistory } = useTransportStatusHistory()

  async function loadAll() {
    setLoading(true)
    const [ots, cls, conds, vehs, rems] = await Promise.all([
      supabase.from('ordres_transport').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, nom').order('nom'),
      supabase.from('conducteurs').select('id, nom, prenom').order('nom'),
      supabase.from('vehicules').select('id, immatriculation, marque').order('immatriculation'),
      supabase.from('remorques').select('id, immatriculation, type_remorque, trailer_type_code, categorie_remorque, charge_utile_kg, longueur_m, volume_max_m3, largeur_utile_m, hauteur_utile_m, nb_palettes_max').order('immatriculation'),
    ])
    const nextList = ots.data ?? []
    setList(nextList)
    setSelected(current => (current ? (nextList.find(ot => ot.id === current.id) ?? null) : current))
    setClients(cls.data ?? [])
    setConducteurs(conds.data ?? [])
    setVehicules(vehs.data ?? [])
    setRemorques(rems.data ?? [])
    const affList = listAffreteurOnboardings()
      .filter(item => item.status === 'validee')
      .map(item => ({ id: item.id, company_name: item.companyName }))
    setAffreteurs(affList)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (!isAffreteurSession || !profil?.id) {
      setAffreteurOtIds([])
      return
    }

    const reloadAffreteurScope = () => {
      const onboarding = findAffreteurOnboardingForScope({
        profileId: profil.id,
        email: user?.email,
      })
      if (!onboarding) {
        setAffreteurOtIds([])
        return
      }
      const contracts = listAffretementContractsByOnboarding(onboarding.id)
      setAffreteurOtIds(Array.from(new Set(contracts.map(contract => contract.otId))))
    }

    reloadAffreteurScope()
    const unsubscribe = subscribeAffretementPortalUpdates(reloadAffreteurScope)
    return unsubscribe
  }, [isAffreteurSession, profil?.id, user?.email])

  async function loadEtapes(otId: string) {
    setLoadingEtapes(true)
    const { data } = await supabase.from('etapes_mission').select('*').eq('ot_id', otId).order('ordre')
    setEtapes(data ?? [])
    setLoadingEtapes(false)
  }

  function openOT(ot: OT) {
    setSelected(ot)
    setSelectedLots([])
    setGroupageOts([])
    void loadEtapes(ot.id)
    void loadTransportHistory(ot.id)
    if (['groupage', 'partiel'].includes(ot.type_transport)) {
      void listOtLignes(ot.id).then(rows => setSelectedLots(rows))
    }
    if (ot.groupage_id) {
      void supabase
        .from('ordres_transport')
        .select('id, poids_kg, tonnage, metrage_ml')
        .eq('groupage_id', ot.groupage_id)
        .then(({ data }) => setGroupageOts(data ?? []))
    }
  }

  const scopedList = useMemo(
    () => isAffreteurSession ? list.filter(ot => affreteurOtIds.includes(ot.id)) : list,
    [affreteurOtIds, isAffreteurSession, list],
  )

  useEffect(() => {
    if (selected && !scopedList.some(ot => ot.id === selected.id)) {
      setSelected(null)
    }
  }, [scopedList, selected])

  useEffect(() => {
    setGroupageTargetId('')
  }, [selected?.id])

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c.nom])), [clients])
  const conducteurMap = useMemo(() => Object.fromEntries(conducteurs.map(c => [c.id, `${c.prenom} ${c.nom}`])), [conducteurs])
  const vehiculeMap = useMemo(() => Object.fromEntries(vehicules.map(v => [v.id, `${v.immatriculation}${v.marque ? ` · ${v.marque}` : ''}`])), [vehicules])
  const siteMap = useMemo(() => Object.fromEntries(sites.map(s => [s.id, s])), [sites])
  const affreteurMap = useMemo(() => Object.fromEntries(affreteurs.map(a => [a.id, a.company_name])), [affreteurs])

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase()
    return scopedList.filter(ot => {
      const matchSearch = ot.reference.toLowerCase().includes(searchLower) ||
        (ot.reference_transport ?? '').toLowerCase().includes(searchLower) ||
        (clientMap[ot.client_id] ?? '').toLowerCase().includes(searchLower)
      const matchStatut = filterStatut === 'tous' || ot.statut === filterStatut
      const matchView = listView === 'principal' ? !ot.est_affretee : ot.est_affretee
      return matchSearch && matchStatut && matchView
    })
  }, [scopedList, search, clientMap, filterStatut, listView])

  const selectedGroupMembers = useMemo(() => {
    if (!selected?.mission_id) return []
    return scopedList
      .filter(ot => ot.mission_id === selected.mission_id)
      .sort((left, right) => left.reference.localeCompare(right.reference, 'fr-FR'))
  }, [scopedList, selected?.mission_id])

  const groupageCandidates = useMemo(() => {
    if (!selected) return []
    return scopedList
      .filter(ot => ot.id !== selected.id)
      .filter(ot => !ot.est_affretee)
      .filter(ot => !ot.groupage_fige)
      .sort((left, right) => left.reference.localeCompare(right.reference, 'fr-FR'))
  }, [scopedList, selected])

  function setF<K extends keyof TablesInsert<'ordres_transport'>>(k: K, v: TablesInsert<'ordres_transport'>[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function closeTransportForm() {
    setShowForm(false)
    setEditingOtId(null)
    setForm(EMPTY_OT)
    setLotLines([])
    setSiteDrafts(emptyOtSiteDrafts())
  }

  function openCreateForm() {
    setEditingOtId(null)
    setForm(EMPTY_OT)
    setLotLines([])
    setSiteDrafts(emptyOtSiteDrafts())
    setShowForm(true)
  }



  function openEditForm(ot: OT) {
    setSelected(ot)
    setEditingOtId(ot.id)
    setForm({
      client_id: ot.client_id,
      type_transport: ot.type_transport,
      statut: ot.statut,
      source_course: ot.source_course,
      statut_transport: ot.statut_transport,
      donneur_ordre_id: ot.donneur_ordre_id,
      est_affretee: ot.est_affretee,
      affreteur_id: ot.affreteur_id,
      chargement_site_id: ot.chargement_site_id,
      livraison_site_id: ot.livraison_site_id,
      reference_externe: ot.reference_externe,
      nature_marchandise: ot.nature_marchandise,
      poids_kg: ot.poids_kg,
      tonnage: ot.tonnage,
      longueur_m: ot.longueur_m,
      metrage_ml: ot.metrage_ml,
      volume_m3: ot.volume_m3,
      nombre_colis: ot.nombre_colis,
      type_chargement: ot.type_chargement,
      type_palette: ot.type_palette,
      date_chargement_prevue: toDateTimeLocalValue(ot.date_chargement_prevue),
      date_livraison_prevue: toDateTimeLocalValue(ot.date_livraison_prevue),
      conducteur_id: ot.conducteur_id,
      vehicule_id: ot.vehicule_id,
      remorque_id: ot.remorque_id,
      prix_ht: ot.prix_ht,
      taux_tva: ot.taux_tva,
      distance_km: ot.distance_km,
      numero_cmr: ot.numero_cmr,
      numero_bl: ot.numero_bl,
      instructions: ot.instructions,
      notes_internes: ot.notes_internes,
    })
    const enterpriseId = (ot.donneur_ordre_id || ot.client_id || '').trim()
    setSiteDrafts({
      chargement: { ...EMPTY_SITE_DRAFT, entreprise_id: enterpriseId },
      livraison: { ...EMPTY_SITE_DRAFT, entreprise_id: enterpriseId },
    })
    setLotLines([])
    void listOtLignes(ot.id).then(rows => {
      setLotLines(rows.map(r => ({
        libelle: r.libelle,
        type_chargement: r.type_chargement,
        poids_kg: r.poids_kg,
        metrage_ml: r.metrage_ml,
        nombre_colis: r.nombre_colis,
        notes: r.notes,
      })))
    })
    setShowForm(true)
  }

  function setSiteDraft<K extends keyof SiteDraft>(kind: SiteKind, key: K, value: SiteDraft[K]) {
    setSiteDrafts(current => ({
      ...current,
      [kind]: {
        ...current[kind],
        [key]: value,
      },
    }))
  }

  function resetSiteDraft(kind: SiteKind) {
    setSiteDrafts(current => ({
      ...current,
      [kind]: {
        ...EMPTY_SITE_DRAFT,
      },
    }))
  }

  async function createOrSelectSite(kind: SiteKind) {
    const draft = siteDrafts[kind]
    const entrepriseId = (draft.entreprise_id || form.donneur_ordre_id || form.client_id || '').trim()
    const adresse = draft.adresse.trim()

    if (!entrepriseId) {
      setStatusGuardNotice('Impossible d ajouter une adresse: renseignez d abord le nom d entreprise.')
      return
    }

    if (!adresse) {
      setStatusGuardNotice('Adresse manquante: ajoutez une adresse manuelle ou cliquez sur la carte.')
      return
    }

    const existing = sites.find(site =>
      site.entreprise_id === entrepriseId && normalizeAddressValue(site.adresse) === normalizeAddressValue(adresse),
    )

    if (existing) {
      const nextUsageType = siteSupportsKind(existing, kind) ? existing.usage_type : 'mixte'
      if (nextUsageType !== existing.usage_type) {
        await updateSite(existing.id, { usage_type: nextUsageType })
      }
      if (kind === 'chargement') setF('chargement_site_id', existing.id)
      if (kind === 'livraison') setF('livraison_site_id', existing.id)
      setStatusGuardNotice('Adresse existante detectee: site deja present en base et selectionne.')
      resetSiteDraft(kind)
      return
    }

    try {
      const companyName = clientMap[entrepriseId] ?? 'Entreprise'
      const defaultName = kind === 'chargement'
        ? `Chargement - ${companyName}`
        : `Livraison - ${companyName}`
      const created = await addSite({
        nom: draft.nom.trim() || defaultName,
        adresse,
        entreprise_id: entrepriseId,
        usage_type: draft.usage_type,
        horaires_ouverture: draft.horaires_ouverture.trim() || null,
        jours_ouverture: draft.jours_ouverture.trim() || null,
        notes_livraison: draft.notes_livraison.trim() || null,
        latitude: draft.latitude,
        longitude: draft.longitude,
      })

      if (kind === 'chargement') setF('chargement_site_id', created.id)
      if (kind === 'livraison') setF('livraison_site_id', created.id)
      setStatusGuardNotice('Nouveau lieu cree et rattache a l entreprise.')
      resetSiteDraft(kind)
    } catch {
      setStatusGuardNotice('Creation du site logistique impossible pour le moment.')
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canCreateOt) {
      setStatusGuardNotice('Creation OT bloquee: un affreteur doit passer par un compte client dedie.')
      return
    }
    if (!form.client_id) return

    // Blocage si la remorque sélectionnée est incompatible avec le chargement
    if (form.remorque_id) {
      const rem = remorques.find(r => r.id === form.remorque_id)
      if (rem) {
        const otData = { type_chargement: form.type_chargement, poids_kg: form.poids_kg, tonnage: form.tonnage, volume_m3: form.volume_m3, longueur_m: form.longueur_m, metrage_ml: form.metrage_ml, adr: (form as Record<string, unknown>).adr as boolean, temperature_dirigee: (form as Record<string, unknown>).temperature_dirigee as boolean, hors_gabarit: (form as Record<string, unknown>).hors_gabarit as boolean, charge_indivisible: (form as Record<string, unknown>).charge_indivisible as boolean }
        const validation = validateTrailerAssignment(otData, rem)
        if (validation.status === 'blocked') {
          setStatusGuardNotice(`Affectation remorque BLOQUÉE : ${validation.errors.map(e => e.message).join(' | ')}`)
          return
        }
      }
    }

    setSaving(true)
    const payload = {
      ...form,
      donneur_ordre_id: form.donneur_ordre_id || form.client_id,
    }

    let savedOtId: string | null = editingOtId
    if (editingOtId) {
      const { error } = await supabase.from('ordres_transport').update(payload).eq('id', editingOtId)
      if (error) {
        setSaving(false)
        setStatusGuardNotice(`Mise a jour impossible : ${error.message}`)
        return
      }
    } else {
      const { data, error } = await supabase.from('ordres_transport').insert(payload).select('id').single()
      if (error || !data) {
        setSaving(false)
        setStatusGuardNotice(`Creation impossible : ${error?.message ?? 'erreur inconnue'}`)
        return
      }
      savedOtId = data.id
    }

    // Sync lignes (groupage / partiel)
    const needsLots = ['groupage', 'partiel'].includes(form.type_transport ?? '')
    if (savedOtId && needsLots && lotLines.length > 0) {
      const cid = profil?.companyId ?? 1
      await syncOtLignes(savedOtId, cid, lotLines.filter(l => l.libelle.trim()))
    } else if (savedOtId && !needsLots) {
      // clear lots if type changed away
      await syncOtLignes(savedOtId, profil?.companyId ?? 1, [])
    }

    setSaving(false)
    setStatusGuardNotice(editingOtId ? 'OT mis a jour avec succes.' : 'OT cree avec succes.')
    closeTransportForm()
    void loadAll()
  }

  async function toggleAffretement(ot: OT, onboardingId: string | null) {
    await setCourseAffretement(ot.id, onboardingId)
    if (selected?.id === ot.id) {
      setSelected({
        ...selected,
        est_affretee: Boolean(onboardingId),
        affreteur_id: onboardingId,
      })
    }
    void loadAll()
  }

  const computeDistanceFromSelectedSites = useCallback(async (options?: { silent?: boolean; onlyIfEmpty?: boolean }) => {
    if (!showForm) return
    if (options?.onlyIfEmpty && form.distance_km != null && form.distance_km > 0) return

    if (!form.chargement_site_id || !form.livraison_site_id) {
      if (!options?.silent) setStatusGuardNotice('Selectionnez un site de chargement et un site de livraison pour calculer la distance.')
      return
    }

    const departure = sites.find(site => site.id === form.chargement_site_id)
    const arrival = sites.find(site => site.id === form.livraison_site_id)
    if (!departure || !arrival) {
      if (!options?.silent) setStatusGuardNotice('Les lieux selectionnes sont introuvables.')
      return
    }

    if (departure.latitude == null || departure.longitude == null || arrival.latitude == null || arrival.longitude == null) {
      if (!options?.silent) {
        setStatusGuardNotice('Coordonnees GPS manquantes sur les lieux. Ouvrez la fiche du lieu et posez un point sur la carte.')
      }
      return
    }

    setCalculatingDistance(true)
    try {
      const route = await computeTruckRoute(
        { latitude: Number(departure.latitude), longitude: Number(departure.longitude) },
        { latitude: Number(arrival.latitude), longitude: Number(arrival.longitude) },
      )

      const roundedDistance = Math.round(route.distanceKm * 10) / 10
      setF('distance_km', roundedDistance)

      if (!options?.silent) {
        const durationHours = Math.floor(route.durationMinutes / 60)
        const durationRemainder = Math.round(route.durationMinutes % 60)
        setStatusGuardNotice(
          `Itineraire poids lourd calcule: ${roundedDistance} km (${durationHours}h${String(durationRemainder).padStart(2, '0')}).`,
        )
      }
    } catch (error) {
      if (!options?.silent) {
        setStatusGuardNotice(error instanceof Error ? error.message : 'Calcul d itineraire indisponible pour le moment.')
      }
    } finally {
      setCalculatingDistance(false)
    }
  }, [form.chargement_site_id, form.distance_km, form.livraison_site_id, showForm, sites])

  useEffect(() => {
    if (!showForm) return
    if (!form.chargement_site_id || !form.livraison_site_id) return
    void computeDistanceFromSelectedSites({ silent: true, onlyIfEmpty: true })
  }, [computeDistanceFromSelectedSites, form.chargement_site_id, form.livraison_site_id, showForm])

  useEffect(() => {
    const fallback = (form.donneur_ordre_id || form.client_id || '').trim()
    if (!fallback) return

    setSiteDrafts(current => ({
      chargement: {
        ...current.chargement,
        entreprise_id: current.chargement.entreprise_id || fallback,
      },
      livraison: {
        ...current.livraison,
        entreprise_id: current.livraison.entreprise_id || fallback,
      },
    }))
  }, [form.client_id, form.donneur_ordre_id])

  async function updateStatut(ot: OT, statut: string) {
    if (!canChangeOtStatus) return

    let nextStatut = statut
    const contract = getAffretementContractByOtId(ot.id)
    if (contract && (statut === 'livre' || statut === 'facture')) {
      const readiness = evaluateAffretementCompletionReadiness(contract)
      if (!readiness.readyForCompletion) {
        nextStatut = 'en_cours'
        setStatusGuardNotice('Statut force en cours: renseignez tous les statuts de course affretee avant livraison/facturation.')
      } else {
        setStatusGuardNotice(null)
      }
    }

    const { error: statutError } = await supabase.from('ordres_transport').update({ statut: nextStatut }).eq('id', ot.id)
    if (statutError) {
      setStatusGuardNotice(`Mise a jour statut impossible : ${statutError.message}`)
      return
    }
    if (selected?.id === ot.id) setSelected({ ...ot, statut: nextStatut })
    void loadAll()
  }

  async function linkSelectedToGroupage() {
    if (!selected || !groupageTargetId) return
    if (!canChangeOtStatus) return

    const target = scopedList.find(ot => ot.id === groupageTargetId)
    if (!target) {
      setStatusGuardNotice('Course cible introuvable pour le groupage.')
      return
    }
    if (selected.groupage_fige || target.groupage_fige) {
      setStatusGuardNotice('Groupage fige: deliez ou defigez avant toute modification.')
      return
    }

    try {
      if (selected.mission_id && target.mission_id && selected.mission_id === target.mission_id) {
        setStatusGuardNotice('Ces courses sont deja dans la meme mission.')
        return
      }

      if (selected.mission_id && target.mission_id && selected.mission_id !== target.mission_id) {
        const selectedMissionMembers = scopedList.filter(ot => ot.mission_id === selected.mission_id).map(ot => ot.id)
        const targetMissionMembers = scopedList.filter(ot => ot.mission_id === target.mission_id).map(ot => ot.id)
        await createMissionFromCourses([...selectedMissionMembers, ...targetMissionMembers])
      } else if (selected.mission_id) {
        await addCourseToMission(target.id, selected.mission_id)
      } else if (target.mission_id) {
        await addCourseToMission(selected.id, target.mission_id)
      } else {
        await createMissionFromCourses([selected.id, target.id])
      }
    } catch (error) {
      setStatusGuardNotice(`Groupage impossible : ${error instanceof Error ? error.message : 'erreur inconnue'}`)
      return
    }

    setStatusGuardNotice('Course liee au groupage avec succes.')
    setGroupageTargetId('')
    await loadAll()
  }

  async function toggleSelectedGroupageFreeze(nextFrozen: boolean) {
    if (!selected?.mission_id) return
    if (!canChangeOtStatus) return

    const { error: freezeError } = await supabase
      .from('ordres_transport')
      .update({ groupage_fige: nextFrozen })
      .eq('mission_id', selected.mission_id)
    if (freezeError) {
      setStatusGuardNotice(`Fige/degele impossible : ${freezeError.message}`)
      return
    }

    setStatusGuardNotice(nextFrozen ? 'Groupage fige: modifications bloquees.' : 'Groupage degele: modifications autorisees.')
    await loadAll()
  }

  async function unlinkSelectedFromGroupage() {
    if (!selected?.mission_id) return
    if (!canChangeOtStatus) return
    if (selected.groupage_fige) {
      setStatusGuardNotice('Ce groupage est fige. Defigez-le avant de delier une course.')
      return
    }

    try {
      await removeCourseFromMission(selected.id)
    } catch (error) {
      setStatusGuardNotice(`Delier impossible : ${error instanceof Error ? error.message : 'erreur inconnue'}`)
      return
    }

    setStatusGuardNotice('Course deliee du groupage.')
    await loadAll()
  }

  async function del(id: string) {
    if (!canDeleteOt) return
    if (!confirm('Supprimer cet ordre de transport ?')) return
    const { error: delError } = await supabase.from('ordres_transport').delete().eq('id', id)
    if (delError) {
      setStatusGuardNotice(`Suppression impossible : ${delError.message}`)
      return
    }
    if (selected?.id === id) setSelected(null)
    void loadAll()
  }

  return (
    <div className="space-y-4">
      <div className="nx-panel overflow-hidden">
        <div className="border-b px-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-4">
            <button type="button" onClick={() => setTransportTab('ot')} className={`px-1 py-3 text-sm font-semibold ${transportTab === 'ot' ? 'nx-tab nx-tab-active' : 'nx-tab hover:text-slate-700'}`}>Ordres de transport</button>
            {canManageSites && <button type="button" onClick={() => setTransportTab('fiches')} className={`px-1 py-3 text-sm font-semibold ${transportTab === 'fiches' ? 'nx-tab nx-tab-active' : 'nx-tab hover:text-slate-700'}`}>Fiches lieux</button>}
            {canUseBourse && (
              <button type="button" onClick={() => setTransportTab('bourse')} className={`px-1 py-3 text-sm font-semibold ${transportTab === 'bourse' ? 'nx-tab nx-tab-active' : 'nx-tab hover:text-slate-700'}`}>Bourse du fret</button>
            )}
          </div>
        </div>
      </div>

      {statusGuardNotice && <div className="nx-status-warning rounded-xl border border-amber-200 px-3 py-2 text-sm">{statusGuardNotice}</div>}

      {transportTab === 'bourse' && canUseBourse ? (
        <BourseAffretementPanel orders={list} clientMap={clientMap} onRefresh={() => { void loadAll() }} />
      ) : transportTab === 'fiches' ? (
        <LogisticSitesTab
          sites={sites}
          clients={clients}
          clientMap={clientMap}
          onUpdate={updateSite}
          onNotice={setStatusGuardNotice}
          canEdit={canManageSites}
        />
      ) : (
        <div className="flex h-full flex-col gap-6 xl:flex-row">
      {/* Left: list */}
      <div className={`min-w-0 flex-1 ${selected ? 'hidden xl:block xl:max-w-[56%]' : ''}`}>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Ordres de Transport</h2>
            <p className="text-slate-500 text-sm">{scopedList.length} OT{scopedList.length !== 1 ? 's' : ''}</p>
            {isAffreteurSession && <p className="text-xs text-slate-500 mt-1">Vue affreteur: exploitation des courses affretees uniquement.</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setListView('principal')}
              className={`px-3 py-1.5 text-xs rounded-lg border ${listView === 'principal' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600'}`}
            >
              Planning principal
            </button>
            <button
              type="button"
              onClick={() => setListView('affretement')}
              className={`px-3 py-1.5 text-xs rounded-lg border ${listView === 'affretement' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600'}`}
            >
              Suivi affretement
            </button>
          <button
            onClick={openCreateForm}
            disabled={!canCreateOt}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {canCreateOt ? '+ Nouvel OT' : 'Compte client requis'}
          </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:flex-wrap">
          <input
            type="text"
            placeholder="Référence ou client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 sm:w-72"
          />
          <div className="flex gap-1 flex-wrap">
            {['tous', ...Object.keys(STATUT_LABELS)].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatut(s)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  filterStatut === s ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s === 'tous' ? 'Tous' : STATUT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              {search || filterStatut !== 'tous' ? 'Aucun résultat' : 'Aucun ordre de transport enregistré'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[920px] w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {['Référence OT', 'Réf. transport', 'Donneur ordre', 'Type', 'Livraison prévue', 'Affrété', 'Groupage', 'Statut transport', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ot, i) => (
                    <tr
                      key={ot.id}
                      onClick={() => openOT(ot)}
                      className={`cursor-pointer border-t border-slate-100 transition-colors hover:bg-blue-50 ${
                        selected?.id === ot.id ? 'bg-blue-50' : i % 2 !== 0 ? 'bg-slate-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <StatutOpsDot statut={ot.statut_operationnel} size="sm" />
                          {ot.reference}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{clientMap[ot.client_id] ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{ot.reference_transport ?? 'Générée à l insertion'}</td>
                      <td className="px-4 py-3 text-slate-600">{ot.donneur_ordre_id ? (clientMap[ot.donneur_ordre_id] ?? '—') : '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{TYPE_TRANSPORT_LABELS[ot.type_transport] ?? ot.type_transport}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {ot.date_livraison_prevue ? new Date(ot.date_livraison_prevue).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${ot.est_affretee ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {ot.est_affretee ? `Oui (${affreteurMap[ot.affreteur_id ?? ''] ?? 'A renseigner'})` : 'Non'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {ot.mission_id ? (
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${ot.groupage_fige ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {ot.groupage_fige ? 'Fige' : 'Deliable'}
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">Aucun</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${TRANSPORT_STATUS_COLORS[ot.statut_transport as TransportStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                          {TRANSPORT_STATUS_LABELS[ot.statut_transport as TransportStatus] ?? ot.statut_transport}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canEditOt && (
                            <button
                              onClick={ev => { ev.stopPropagation(); openEditForm(ot) }}
                              className="text-xs text-slate-500 transition-colors hover:text-slate-700"
                            >
                              Modifier
                            </button>
                          )}
                          {canDeleteOt && (
                            <button
                              onClick={ev => { ev.stopPropagation(); del(ot.id) }}
                              className="text-xs text-slate-400 transition-colors hover:text-red-500"
                            >
                              Suppr.
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Right: detail panel */}
      {selected && (
        <div className="w-full shrink-0 xl:w-[44%]">
          <div className="xl:sticky xl:top-4">
            <div className="space-y-5 rounded-[28px] border border-slate-200 bg-[#f6f8fc] p-4 shadow-sm sm:p-5">
              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Vue detail mission</p>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-950">{clientMap[selected.client_id] ?? '—'}</h3>
                      <p className="mt-1 font-mono text-xs text-slate-500">{selected.reference}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${OT_STATUT_BADGE_LIGHT_CLS[selected.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                        {STATUT_LABELS[selected.statut] ?? selected.statut}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${TRANSPORT_STATUS_COLORS[selected.statut_transport as TransportStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                        {TRANSPORT_STATUS_LABELS[selected.statut_transport as TransportStatus] ?? selected.statut_transport}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{TYPE_TRANSPORT_LABELS[selected.type_transport] ?? selected.type_transport}</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <SummaryPill label="Livraison prevue" value={selected.date_livraison_prevue ? new Date(selected.date_livraison_prevue).toLocaleDateString('fr-FR') : 'A planifier'} tone="strong" />
                      <SummaryPill label="Mission" value={selected.mission_id ? `${selectedGroupMembers.length} course${selectedGroupMembers.length > 1 ? 's' : ''}` : 'Independante'} tone={selected.mission_id ? 'success' : 'neutral'} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canEditOt && (
                      <button
                        type="button"
                        onClick={() => openEditForm(selected)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Modifier l OT
                      </button>
                    )}
                    <button onClick={() => setSelected(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800">
                      Fermer
                    </button>
                  </div>
                </div>
              </section>

              <SectionCard title="Affretement" description="Statut de delegation et selection de l affreteur sans quitter la fiche." >
                <div className="space-y-3">
                  <select
                    className={inp}
                    value={selected.affreteur_id ?? ''}
                    onChange={event => { void toggleAffretement(selected, event.target.value || null) }}
                  >
                    <option value="">Non affretee</option>
                    {affreteurs.map(item => <option key={item.id} value={item.id}>{item.company_name}</option>)}
                  </select>
                  <p className="text-sm text-slate-600">
                    {selected.est_affretee ? 'Course retiree du planning principal et suivie dans la vue affretement.' : 'Course visible dans le planning principal.'}
                  </p>
                </div>
              </SectionCard>

              <SectionCard title="Mission / groupage" description="Le rattachement mission reste visible avec les actions disponibles selon l existant." tone="highlight">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SummaryPill label="Statut mission" value={selected.mission_id ? (selected.groupage_fige ? 'Mission figee' : 'Mission deliable') : 'Hors mission'} tone={selected.mission_id ? 'success' : 'neutral'} />
                    <SummaryPill label="Courses liees" value={selected.mission_id ? `${selectedGroupMembers.length}` : '0'} />
                  </div>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <select
                      className={inp}
                      value={groupageTargetId}
                      onChange={event => setGroupageTargetId(event.target.value)}
                      disabled={!canChangeOtStatus || selected.groupage_fige}
                    >
                      <option value="">Selectionner une course a lier</option>
                      {groupageCandidates.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.reference} - {clientMap[item.client_id] ?? 'Client inconnu'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { void linkSelectedToGroupage() }}
                      disabled={!groupageTargetId || !canChangeOtStatus || selected.groupage_fige}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Lier
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => { void unlinkSelectedFromGroupage() }}
                      disabled={!selected.mission_id || !canChangeOtStatus}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Delier cette course
                    </button>
                    <button
                      type="button"
                      onClick={() => { void toggleSelectedGroupageFreeze(!selected.groupage_fige) }}
                      disabled={!selected.mission_id || !canChangeOtStatus}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {selected.groupage_fige ? 'Defiger la mission' : 'Figer la mission'}
                    </button>
                  </div>
                  {selectedGroupMembers.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">Courses de la mission</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedGroupMembers.map(item => (
                          <span key={item.id} className={`rounded-full px-3 py-1 text-sm font-medium ${item.id === selected.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            {item.reference}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Pilotage statuts" description="Statuts transport, administratif et opérationnel visibles dans une seule zone de décision.">
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Statut transport</p>
                    <div className="flex flex-wrap gap-2">
                      {TRANSPORT_STATUS_FLOW.map(statusKey => (
                        <button
                          key={statusKey}
                          type="button"
                          onClick={() => { void updateTransportStatus(selected.id, statusKey) }}
                          disabled={selected.statut_transport === statusKey}
                          className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                            selected.statut_transport === statusKey
                              ? 'bg-slate-200 text-slate-500 cursor-default'
                              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {TRANSPORT_STATUS_LABELS[statusKey]}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Historique statut transport</p>
                      {loadingTransportHistory ? (
                        <p className="mt-2 text-sm text-slate-400">Chargement historique...</p>
                      ) : transportStatusHistory.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-400">Aucun historique disponible.</p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {transportStatusHistory.slice(0, 5).map(entry => (
                            <p key={entry.id} className="text-sm text-slate-600">
                              {new Date(entry.changed_at).toLocaleString('fr-FR')} - {TRANSPORT_STATUS_LABELS[entry.statut_nouveau as TransportStatus] ?? entry.statut_nouveau}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Statut OT</p>
                    {canChangeOtStatus ? (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(STATUT_LABELS).map(([k, v]) => (
                          <button
                            key={k}
                            onClick={() => updateStatut(selected, k)}
                            disabled={selected.statut === k}
                            className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                              selected.statut === k
                                ? 'bg-slate-200 text-slate-500 cursor-default'
                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Statut OT gere par la societe mere. Utilisez l espace affreteur pour le suivi operationnel.</p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Statut operationnel</p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(STATUT_OPS) as [StatutOps, typeof STATUT_OPS[StatutOps]][]).map(([k, cfg]) => (
                        <button
                          key={k}
                          onClick={async () => {
                            const newVal = selected.statut_operationnel === k ? null : k
                            await supabase.from('ordres_transport').update({ statut_operationnel: newVal }).eq('id', selected.id)
                            setSelected(s => s ? { ...s, statut_operationnel: newVal } : s)
                            setList(l => l.map(o => o.id === selected.id ? { ...o, statut_operationnel: newVal } : o))
                          }}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all ${
                            selected.statut_operationnel === k
                              ? `${cfg.dot} text-white border-transparent`
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`h-2 w-2 flex-shrink-0 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Lecture opérationnelle" description="Ressources, adresses, chiffrage et informations terrain hiérarchisés pour une lecture immédiate.">
                <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Conducteur" value={selected.conducteur_id ? conducteurMap[selected.conducteur_id] : null} />
              <Info label="Véhicule" value={selected.vehicule_id ? vehiculeMap[selected.vehicule_id] : null} />
              <Info label="Remorque" value={selected.remorque_id ? remorques.find(item => item.id === selected.remorque_id)?.immatriculation : null} />
              <Info label="Référence transport" value={selected.reference_transport} />
              <Info label="Référence externe" value={selected.reference_externe} />
              <Info label="Source course" value={selected.source_course} />
              <Info label="Donneur d ordre" value={selected.donneur_ordre_id ? (clientMap[selected.donneur_ordre_id] ?? null) : null} />
              <Info label="Chargement" value={selected.chargement_site_id ? `${siteMap[selected.chargement_site_id]?.nom ?? ''} - ${siteMap[selected.chargement_site_id]?.adresse ?? ''}` : null} />
              <Info label="Livraison" value={selected.livraison_site_id ? `${siteMap[selected.livraison_site_id]?.nom ?? ''} - ${siteMap[selected.livraison_site_id]?.adresse ?? ''}` : null} />
              <Info label="Chargement prévu" value={selected.date_chargement_prevue ? new Date(selected.date_chargement_prevue).toLocaleDateString('fr-FR') : null} />
              <Info label="Livraison prévue" value={selected.date_livraison_prevue ? new Date(selected.date_livraison_prevue).toLocaleDateString('fr-FR') : null} />
              <Info label="Livraison réelle" value={selected.date_livraison_reelle ? new Date(selected.date_livraison_reelle).toLocaleDateString('fr-FR') : null} />
              <Info label="Marchandise" value={selected.nature_marchandise} />
              <Info label="Type de chargement" value={selected.type_chargement ? (TYPES_CHARGEMENT_LABELS[selected.type_chargement] ?? selected.type_chargement) : null} />
              <Info label="Type de palette" value={selected.type_palette ? (TYPES_PALETTE_LABELS[selected.type_palette] ?? selected.type_palette) : null} />
              <Info label="Poids" value={selected.poids_kg ? `${selected.poids_kg} kg` : null} />
              <Info label="Tonnage" value={selected.tonnage ? `${selected.tonnage} t` : null} />
              <Info label="Longueur" value={selected.longueur_m ? `${selected.longueur_m} m` : null} />
              <Info label="Métrage" value={selected.metrage_ml ? `${selected.metrage_ml} ml` : null} />
              <Info label="Volume" value={selected.volume_m3 ? `${selected.volume_m3} m³` : null} />
              <Info label="Nombre de colis" value={selected.nombre_colis?.toString() ?? null} />
              {selectedLots.length > 0 && (
                <div className="sm:col-span-2 mt-1">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Lignes de chargement</span>
                  <div className="divide-y rounded-2xl border border-slate-200 bg-white text-xs">
                    {selectedLots.map(lot => (
                      <div key={lot.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <span className="flex-1 font-medium text-slate-700">{lot.libelle}</span>
                        {lot.type_chargement && <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs text-indigo-700">{TYPES_CHARGEMENT_LABELS[lot.type_chargement] ?? lot.type_chargement}</span>}
                        {lot.poids_kg != null && <span className="text-slate-500">{lot.poids_kg} kg</span>}
                        {lot.metrage_ml != null && <span className="text-slate-500">{lot.metrage_ml} ml</span>}
                        {lot.nombre_colis != null && <span className="text-slate-500">{lot.nombre_colis} col.</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Info label="Distance" value={selected.distance_km ? `${selected.distance_km} km` : null} />
              <Info label="Prix HT" value={selected.prix_ht != null ? `${selected.prix_ht.toLocaleString('fr-FR')} €` : null} />
              <Info label="TVA" value={selected.taux_tva ? `${selected.taux_tva}%` : null} />
              {selected.prix_ht && selected.taux_tva && (
                <Info label="Prix TTC" value={`${(selected.prix_ht * (1 + selected.taux_tva / 100)).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`} />
              )}
              <Info label="N° CMR" value={selected.numero_cmr} />
              <Info label="N° BL" value={selected.numero_bl} />

              {/* Barre de remplissage (vue détail) — visible dès qu'une remorque est sélectionnée */}
              {selected.remorque_id && (() => {
                const rem = remorques.find(r => r.id === selected.remorque_id)
                const noCap = !rem?.charge_utile_kg && !rem?.longueur_m
                const isGroupage = !!selected.groupage_id && groupageOts.length > 1
                const remplissage = (!noCap && rem)
                  ? (isGroupage
                    ? calcRemplissageGroupage(groupageOts, rem.charge_utile_kg, rem.longueur_m)
                    : calcRemplissage(selected.poids_kg, selected.tonnage, selected.metrage_ml, rem.charge_utile_kg, rem.longueur_m))
                  : null
                return (
                  <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {isGroupage ? `Remplissage groupage (${groupageOts.length} courses)` : `Remplissage · ${rem?.immatriculation ?? ''}${rem?.type_remorque ? ` · ${rem.type_remorque}` : ''}`}
                      </span>
                      {remplissage?.alerte && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">⛔ DÉPASSEMENT</span>}
                      {remplissage && !remplissage.alerte && (remplissage.global_pct ?? 0) >= SEUIL_ALERTE_ORANGE && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">⚠ QUASI-PLEIN</span>}
                    </div>
                    {noCap && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">Capacité non renseignée sur cette remorque — éditez la fiche remorque pour activer le calcul de remplissage.</p>
                    )}
                    {!noCap && remplissage && remplissage.poids_pct === null && remplissage.ml_pct === null && (
                      <p className="text-xs text-slate-400 italic">Renseignez le poids, le tonnage ou le métrage de la course pour voir le taux de remplissage.</p>
                    )}
                    {remplissage?.poids_pct !== null && remplissage?.poids_pct !== undefined && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-600">Poids · CU {rem!.charge_utile_kg?.toLocaleString('fr-FR')} kg</span>
                          <span className={`text-xs font-bold ${couleurTexte(remplissage.poids_pct)}`}>{remplissage.poids_pct}%</span>
                        </div>
                        <div className="h-3 w-full rounded-full bg-slate-200">
                          <div className={`h-3 rounded-full transition-all ${couleurBarre(remplissage.poids_pct)}`} style={{ width: `${Math.min(remplissage.poids_pct, 100)}%` }} />
                        </div>
                        {remplissage.poids_libre_kg !== null && <p className="mt-1 text-xs text-slate-500">Libre : <strong className="text-slate-700">{remplissage.poids_libre_kg.toLocaleString('fr-FR')} kg</strong></p>}
                      </div>
                    )}
                    {remplissage?.ml_pct !== null && remplissage?.ml_pct !== undefined && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-600">Métrage · L {rem!.longueur_m} m</span>
                          <span className={`text-xs font-bold ${couleurTexte(remplissage.ml_pct)}`}>{remplissage.ml_pct}%</span>
                        </div>
                        <div className="h-3 w-full rounded-full bg-slate-200">
                          <div className={`h-3 rounded-full transition-all ${couleurBarre(remplissage.ml_pct)}`} style={{ width: `${Math.min(remplissage.ml_pct, 100)}%` }} />
                        </div>
                        {remplissage.ml_libre_m !== null && <p className="mt-1 text-xs text-slate-500">Libre : <strong className="text-slate-700">{remplissage.ml_libre_m} m</strong></p>}
                      </div>
                    )}
                  </div>
                )
              })()}

              {selected.instructions && (
                <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Instructions</span>
                  <p className="mt-2 text-sm text-slate-600">{selected.instructions}</p>
                </div>
              )}
              {selected.notes_internes && (
                <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Notes internes</span>
                  <p className="mt-2 text-sm text-slate-600">{selected.notes_internes}</p>
                </div>
              )}
                </div>
              </SectionCard>

              <SectionCard title="Étapes de mission" description="Chronologie visuelle des chargements et livraisons pour suivre l exécution sans fouiller la fiche.">
              {loadingEtapes ? (
                <p className="text-sm text-slate-400">Chargement...</p>
              ) : etapes.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune étape enregistrée</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-slate-200" />
                  <div className="space-y-3">
                    {etapes.map(et => (
                      <div key={et.id} className="relative flex gap-4 pl-8">
                        <div className={`absolute left-2 top-2 w-3 h-3 rounded-full border-2 ${
                          et.type_etape === 'chargement' ? 'bg-blue-500 border-blue-300' :
                          et.type_etape === 'livraison' ? 'bg-green-500 border-green-300' :
                          'bg-slate-300 border-slate-200'
                        }`} />
                        <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className={`text-xs font-medium ${
                                et.type_etape === 'chargement' ? 'text-blue-600' :
                                et.type_etape === 'livraison' ? 'text-green-600' : 'text-slate-600'
                              }`}>
                                {et.type_etape === 'chargement' ? 'Chargement' :
                                 et.type_etape === 'livraison' ? 'Livraison' : et.type_etape}
                              </span>
                              <p className="text-sm font-medium text-slate-800 mt-0.5">
                                {et.adresse_libre ?? [et.ville, et.code_postal].filter(Boolean).join(', ')}
                              </p>
                              {et.contact_nom && <p className="text-xs text-slate-500">{et.contact_nom}{et.contact_tel ? ` · ${et.contact_tel}` : ''}</p>}
                            </div>
                            {et.date_prevue && (
                              <span className="text-xs text-slate-500 shrink-0">
                                {new Date(et.date_prevue).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                          </div>
                          <span className={`mt-1.5 inline-block text-xs px-2 py-0.5 rounded-full ${
                            et.statut === 'realise' ? 'bg-green-100 text-green-700' :
                            et.statut === 'en_cours' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {et.statut === 'realise' ? 'Réalisé' : et.statut === 'en_cours' ? 'En cours' : 'En attente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </SectionCard>
            </div>
          </div>
        </div>
      )}

      {/* Modal: new OT */}
      {showForm && canCreateOt && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/45 backdrop-blur-[2px]">
          <div className="flex h-full w-full justify-end">
            <div className="h-full w-full max-w-[min(96vw,1380px)] border-l border-slate-200 bg-[#f6f8fc] shadow-2xl">
              <form onSubmit={submit} className="flex h-full flex-col overflow-hidden">
                <div className="border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur sm:px-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Gestion course / mission</p>
                        <h3 className="mt-2 text-2xl font-semibold text-slate-950">{editingOtId ? 'Modifier l ordre de transport' : 'Nouvel ordre de transport'}</h3>
                        <p className="mt-2 max-w-3xl text-sm text-slate-600">
                          Vue de travail exploitant avec sections séparées, repères mission visibles et saisie confortable sans tasser l information.
                        </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <SummaryPill label="Client" value={clientMap[form.client_id] ?? 'A selectionner'} tone="strong" />
                        <SummaryPill label="Donneur d ordre" value={clientMap[form.donneur_ordre_id ?? ''] ?? 'A renseigner'} />
                        <SummaryPill label="Statut transport" value={TRANSPORT_STATUS_LABELS[form.statut_transport as TransportStatus] ?? 'En attente validation'} tone="success" />
                        <SummaryPill label="Mission" value={selected?.mission_id ? `${selectedGroupMembers.length} course${selectedGroupMembers.length > 1 ? 's' : ''} liee${selectedGroupMembers.length > 1 ? 's' : ''}` : 'Course independante'} />
                      </div>
                    </div>
                    <button type="button" onClick={closeTransportForm} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">
                      Fermer
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
                  <div className="mx-auto grid max-w-[1320px] gap-6 pb-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
                    <div className="space-y-6">
                      <SectionCard
                        title="Informations principales"
                        description="Référence métier, client, statut et nature de la course toujours visibles dès l ouverture."
                        tone="highlight"
                      >
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <Field label="Client *">
                            <select className={inp} value={form.client_id} onChange={e => { setF('client_id', e.target.value); if (!form.donneur_ordre_id) setF('donneur_ordre_id', e.target.value) }} required>
                              <option value="">Sélectionner un client</option>
                              {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                            </select>
                          </Field>
                          <Field label="Donneur d ordre *">
                            <select className={inp} value={form.donneur_ordre_id ?? ''} onChange={e => setF('donneur_ordre_id', e.target.value)} required>
                              <option value="">Sélectionner une entreprise</option>
                              {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                            </select>
                          </Field>
                          <Field label="Référence externe">
                            <input className={inp} value={form.reference_externe ?? ''} onChange={e => setF('reference_externe', e.target.value || null)} placeholder="Référence client ou exploitation" />
                          </Field>
                          <Field label="Source course">
                            <select className={inp} value={form.source_course ?? 'manuel'} onChange={e => setF('source_course', e.target.value)}>
                              {TRANSPORT_SOURCES.map(item => <option key={item} value={item}>{item}</option>)}
                            </select>
                          </Field>
                          <Field label="Type de transport">
                            <select className={inp} value={form.type_transport ?? 'complet'} onChange={e => setF('type_transport', e.target.value)}>
                              {Object.entries(TYPE_TRANSPORT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </Field>
                          <Field label="Statut OT">
                            <select className={inp} value={form.statut ?? 'brouillon'} onChange={e => setF('statut', e.target.value)}>
                              {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </Field>
                          <div className="md:col-span-2 xl:col-span-3">
                            <Field label="Statut transport">
                              <select className={inp} value={form.statut_transport ?? 'en_attente_validation'} onChange={e => setF('statut_transport', e.target.value)}>
                                {TRANSPORT_STATUS_FLOW.map(item => <option key={item} value={item}>{TRANSPORT_STATUS_LABELS[item]}</option>)}
                              </select>
                            </Field>
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="Planification"
                        description="Lecture rapide des jalons de mission avec une grille stable en deux colonnes."
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Date et heure de chargement">
                            <input className={inp} type="datetime-local" value={form.date_chargement_prevue ?? ''} onChange={e => setF('date_chargement_prevue', e.target.value || null)} />
                          </Field>
                          <Field label="Date et heure de livraison">
                            <input className={inp} type="datetime-local" value={form.date_livraison_prevue ?? ''} onChange={e => setF('date_livraison_prevue', e.target.value || null)} />
                          </Field>
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="Ressources"
                        description="Affectation conducteur, tracteur et remorque dans un bloc séparé et immédiatement exploitable."
                      >
                        <div className="grid gap-4 md:grid-cols-3">
                          <Field label="Conducteur">
                            <select className={inp} value={form.conducteur_id ?? ''} onChange={e => setF('conducteur_id', e.target.value || null)}>
                              <option value="">— Non affecté</option>
                              {conducteurs.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
                            </select>
                          </Field>
                          <Field label="Camion">
                            <select className={inp} value={form.vehicule_id ?? ''} onChange={e => setF('vehicule_id', e.target.value || null)}>
                              <option value="">— Non affecté</option>
                              {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation}{v.marque ? ` · ${v.marque}` : ''}</option>)}
                            </select>
                          </Field>
                          <Field label="Remorque">
                            <select className={inp} value={form.remorque_id ?? ''} onChange={e => setF('remorque_id', e.target.value || null)}>
                              <option value="">— Non affectée</option>
                              {remorques.map(r => {
                                const val = validateTrailerAssignment(
                                  { type_chargement: form.type_chargement, poids_kg: form.poids_kg, tonnage: form.tonnage, volume_m3: form.volume_m3, longueur_m: form.longueur_m, metrage_ml: form.metrage_ml, hors_gabarit: form.hors_gabarit, temperature_dirigee: form.temperature_dirigee, charge_indivisible: form.charge_indivisible, adr: form.adr },
                                  r,
                                )
                                const icon = val.status === 'blocked' ? '⛔ ' : val.status === 'warning' ? '⚠ ' : '✓ '
                                return (
                                  <option key={r.id} value={r.id} disabled={val.status === 'blocked'}>
                                    {icon}{r.immatriculation}{r.type_remorque ? ` · ${r.type_remorque}` : ''}{r.charge_utile_kg ? ` · ${(r.charge_utile_kg / 1000).toFixed(1)}t` : ''}
                                  </option>
                                )
                              })}
                            </select>
                          </Field>
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="Détails course"
                        description="Marchandise, capacité, distance et tarification regroupées pour éviter les allers-retours visuels."
                      >
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <div className="md:col-span-2 xl:col-span-3">
                            <Field label="Nature de la marchandise">
                              <input className={inp} value={form.nature_marchandise ?? ''} onChange={e => setF('nature_marchandise', e.target.value || null)} placeholder="Palette, lot alimentaire, materiel sensible..." />
                            </Field>
                          </div>

                          {/* Type de chargement */}
                          {(() => {
                            const rem = remorques.find(r => r.id === form.remorque_id)
                            const allCodes = [
                              ...Object.keys(TYPES_CHARGEMENT_LABELS),
                              'charge_indivisible',
                            ]
                            const incompatibles = rem
                              ? allCodes.filter(k =>
                                  checkCompatibiliteMetier(rem.trailer_type_code ?? rem.type_remorque, k).niveau === 'incompatible'
                                )
                              : []
                            return (
                              <>
                                <Field label="Type de chargement">
                                  <select className={inp} value={form.type_chargement ?? ''} onChange={e => {
                                    const val = e.target.value || null
                                    setF('type_chargement', val)
                                    if (!val || !TYPES_CHARGEMENT_PALETTE.has(val)) setF('type_palette', null)
                                  }}>
                                    <option value="">— Non renseigné</option>
                                    {allCodes
                                      .filter(k => !incompatibles.includes(k))
                                      .map(k => <option key={k} value={k}>{TYPES_CHARGEMENT_LABELS[k] ?? k}</option>)
                                    }
                                    {incompatibles.length > 0 && allCodes
                                      .filter(k => incompatibles.includes(k))
                                      .map(k => <option key={k} value={k} disabled>⛔ {TYPES_CHARGEMENT_LABELS[k] ?? k}</option>)
                                    }
                                  </select>
                                </Field>

                                {form.type_chargement && TYPES_CHARGEMENT_PALETTE.has(form.type_chargement) && (
                                  <Field label="Type de palette">
                                    <select className={inp} value={form.type_palette ?? ''} onChange={e => setF('type_palette', e.target.value || null)}>
                                      <option value="">— Non précisé</option>
                                      {Object.entries(TYPES_PALETTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                  </Field>
                                )}
                              </>
                            )
                          })()}

                          <Field label="Poids (kg)"><input className={inp} type="number" value={form.poids_kg ?? ''} onChange={e => setF('poids_kg', parseFloat(e.target.value) || null)} /></Field>
                          <Field label="Tonnage (t)"><input className={inp} type="number" step="0.001" value={form.tonnage ?? ''} onChange={e => setF('tonnage', parseFloat(e.target.value) || null)} /></Field>
                          <Field label="Longueur marchandise (m)"><input className={inp} type="number" step="0.01" value={form.longueur_m ?? ''} onChange={e => setF('longueur_m', parseFloat(e.target.value) || null)} /></Field>

                          {/* Métrage avec calcul auto palettes */}
                          <div>
                            <Field label="Métrage estimé (ml)">
                              <input className={inp} type="number" step="0.01" value={form.metrage_ml ?? ''} onChange={e => setF('metrage_ml', parseFloat(e.target.value) || null)} />
                            </Field>
                            {form.type_chargement && TYPES_CHARGEMENT_PALETTE.has(form.type_chargement) && form.type_palette && form.nombre_colis && (
                              <button type="button" className="mt-1.5 text-xs text-indigo-600 hover:text-indigo-800 underline" onClick={() => {
                                const ml = calcMetragePalettes(form.nombre_colis!, form.type_palette!)
                                setF('metrage_ml', ml)
                              }}>
                                Calculer automatiquement ({calcMetragePalettes(form.nombre_colis!, form.type_palette!)} ml estimés)
                              </button>
                            )}
                          </div>

                          <Field label="Volume (m³)"><input className={inp} type="number" step="0.01" value={form.volume_m3 ?? ''} onChange={e => setF('volume_m3', parseFloat(e.target.value) || null)} /></Field>
                          <Field label="Largeur marchandise (m)"><input className={inp} type="number" step="0.01" value={(form as Record<string, unknown>).largeur_m as string ?? ''} onChange={e => setF('largeur_m', parseFloat(e.target.value) || null)} /></Field>
                          <Field label="Hauteur marchandise (m)"><input className={inp} type="number" step="0.01" value={(form as Record<string, unknown>).hauteur_m as string ?? ''} onChange={e => setF('hauteur_m', parseFloat(e.target.value) || null)} /></Field>
                          <Field label="Nombre de colis / palettes"><input className={inp} type="number" value={form.nombre_colis ?? ''} onChange={e => setF('nombre_colis', parseInt(e.target.value) || null)} /></Field>

                          {/* Contraintes spécifiques */}
                          <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input type="checkbox" className="h-4 w-4 rounded text-indigo-600" checked={!!((form as Record<string, unknown>).adr)} onChange={e => setF('adr', e.target.checked)} />
                              <span className="text-sm font-medium text-slate-700">ADR (marchandises dangereuses)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input type="checkbox" className="h-4 w-4 rounded text-indigo-600" checked={!!((form as Record<string, unknown>).temperature_dirigee)} onChange={e => setF('temperature_dirigee', e.target.checked)} />
                              <span className="text-sm font-medium text-slate-700">Température dirigée (frigo requis)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input type="checkbox" className="h-4 w-4 rounded text-amber-600" checked={!!((form as Record<string, unknown>).hors_gabarit)} onChange={e => setF('hors_gabarit', e.target.checked)} />
                              <span className="text-sm font-medium text-amber-700">Hors gabarit</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input type="checkbox" className="h-4 w-4 rounded text-purple-600" checked={!!((form as Record<string, unknown>).charge_indivisible)} onChange={e => setF('charge_indivisible', e.target.checked)} />
                              <span className="text-sm font-medium text-purple-700">Charge indivisible (convoi exceptionnel possible)</span>
                            </label>
                          </div>

                          {/* Barres de remplissage — moteur de validation complet */}
                          {form.remorque_id && (() => {
                            const rem = remorques.find(r => r.id === form.remorque_id)
                            if (!rem) return null
                            const otData = { type_chargement: form.type_chargement, poids_kg: form.poids_kg, tonnage: form.tonnage, volume_m3: form.volume_m3, longueur_m: form.longueur_m, metrage_ml: form.metrage_ml, largeur_m: (form as Record<string, unknown>).largeur_m as number | null, hauteur_m: (form as Record<string, unknown>).hauteur_m as number | null, adr: (form as Record<string, unknown>).adr as boolean, temperature_dirigee: (form as Record<string, unknown>).temperature_dirigee as boolean, hors_gabarit: (form as Record<string, unknown>).hors_gabarit as boolean, charge_indivisible: (form as Record<string, unknown>).charge_indivisible as boolean }
                            return (
                              <div className="md:col-span-2 xl:col-span-3">
                                <ChargementBars ot={otData} remorque={{ ...rem, immatriculation: rem.immatriculation }} />
                              </div>
                            )
                          })()}

                          <div className="space-y-2">
                            <Field label="Distance (km)">
                              <input className={inp} type="number" value={form.distance_km ?? ''} onChange={e => setF('distance_km', parseFloat(e.target.value) || null)} />
                            </Field>
                            <button
                              type="button"
                              disabled={calculatingDistance || !form.chargement_site_id || !form.livraison_site_id}
                              onClick={() => { void computeDistanceFromSelectedSites() }}
                              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {calculatingDistance ? 'Calcul en cours...' : 'Calculer itineraire poids lourd'}
                            </button>
                          </div>
                          <Field label="Prix HT (€)"><input className={inp} type="number" step="0.01" value={form.prix_ht ?? ''} onChange={e => setF('prix_ht', parseFloat(e.target.value) || null)} /></Field>
                          <Field label="TVA (%)"><input className={inp} type="number" value={form.taux_tva ?? 20} onChange={e => setF('taux_tva', parseFloat(e.target.value) || null)} /></Field>
                          <Field label="N° CMR"><input className={inp} value={form.numero_cmr ?? ''} onChange={e => setF('numero_cmr', e.target.value || null)} /></Field>
                          <Field label="N° BL"><input className={inp} value={form.numero_bl ?? ''} onChange={e => setF('numero_bl', e.target.value || null)} /></Field>
                        </div>
                      </SectionCard>

                      {['groupage', 'partiel'].includes(form.type_transport ?? '') && (
                        <SectionCard
                          title="Lignes de chargement"
                          description="Détail des lots pour les opérations partielles et groupées, avec totaux lisibles en bas de bloc."
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-slate-600">Décomposez la course en unités opérationnelles quand le groupage ou le partiel l exige.</p>
                            <button
                              type="button"
                              onClick={() => setLotLines(l => [...l, { libelle: '', type_chargement: null, poids_kg: null, metrage_ml: null, nombre_colis: null, notes: null }])}
                              className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                            >
                              Ajouter une ligne
                            </button>
                          </div>
                          {lotLines.length === 0 ? (
                            <p className="mt-4 text-sm italic text-slate-500">Aucune ligne. Les valeurs de la section détails s appliquent à l ensemble de la course.</p>
                          ) : (
                            <div className="mt-5 space-y-4">
                              {lotLines.map((lot, idx) => (
                                <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(140px,1fr)_repeat(3,minmax(100px,1fr))_minmax(0,1.5fr)_auto] xl:items-end">
                                    <Field label="Libellé *">
                                      <input className={inp} placeholder="Ex: Palettes bois" value={lot.libelle} onChange={e => setLotLines(l => l.map((x, i) => i === idx ? { ...x, libelle: e.target.value } : x))} />
                                    </Field>
                                    <Field label="Type chargement">
                                      <select className={inp} value={lot.type_chargement ?? ''} onChange={e => setLotLines(l => l.map((x, i) => i === idx ? { ...x, type_chargement: e.target.value || null } : x))}>
                                        <option value="">—</option>
                                        {Object.entries(TYPES_CHARGEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                      </select>
                                    </Field>
                                    <Field label="Poids (kg)">
                                      <input className={inp} type="number" placeholder="0" value={lot.poids_kg ?? ''} onChange={e => setLotLines(l => l.map((x, i) => i === idx ? { ...x, poids_kg: parseFloat(e.target.value) || null } : x))} />
                                    </Field>
                                    <Field label="Métrage (ml)">
                                      <input className={inp} type="number" step="0.01" placeholder="0" value={lot.metrage_ml ?? ''} onChange={e => setLotLines(l => l.map((x, i) => i === idx ? { ...x, metrage_ml: parseFloat(e.target.value) || null } : x))} />
                                    </Field>
                                    <Field label="Colis">
                                      <input className={inp} type="number" placeholder="0" value={lot.nombre_colis ?? ''} onChange={e => setLotLines(l => l.map((x, i) => i === idx ? { ...x, nombre_colis: parseInt(e.target.value) || null } : x))} />
                                    </Field>
                                    <Field label="Notes">
                                      <input className={inp} placeholder="Consigne, lot, etiquette..." value={lot.notes ?? ''} onChange={e => setLotLines(l => l.map((x, i) => i === idx ? { ...x, notes: e.target.value || null } : x))} />
                                    </Field>
                                    <div className="flex items-center xl:justify-end">
                                      <button type="button" onClick={() => setLotLines(l => l.filter((_, i) => i !== idx))} className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50" title="Supprimer">
                                        Retirer
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {(() => {
                                const totalPoids = lotLines.reduce((s, l) => s + (l.poids_kg ?? 0), 0)
                                const totalMl = lotLines.reduce((s, l) => s + (l.metrage_ml ?? 0), 0)
                                const totalColis = lotLines.reduce((s, l) => s + (l.nombre_colis ?? 0), 0)
                                const rem = remorques.find(r => r.id === form.remorque_id)
                                const remplissage = rem
                                  ? calcRemplissageGroupage(lotLines, rem.charge_utile_kg, rem.longueur_m)
                                  : null
                                return (
                                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                                      {totalPoids > 0 && <span>Total poids : <strong className="text-slate-900">{totalPoids} kg</strong></span>}
                                      {totalMl > 0 && <span>Total métrage : <strong className="text-slate-900">{totalMl} ml</strong></span>}
                                      {totalColis > 0 && <span>Total colis : <strong className="text-slate-900">{totalColis}</strong></span>}
                                    </div>
                                    {remplissage && (remplissage.poids_pct !== null || remplissage.ml_pct !== null) && (
                                      <div className="space-y-2 pt-2 border-t border-slate-100">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Remplissage total groupage</span>
                                          {remplissage.alerte && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">DÉPASSEMENT</span>}
                                          {!remplissage.alerte && (remplissage.global_pct ?? 0) >= SEUIL_ALERTE_ORANGE && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">QUASI-PLEIN</span>}
                                        </div>
                                        {remplissage.poids_pct !== null && (
                                          <div>
                                            <div className="flex justify-between mb-0.5">
                                              <span className="text-xs text-slate-500">Poids · CU {rem!.charge_utile_kg?.toLocaleString('fr-FR')} kg</span>
                                              <span className={`text-xs font-bold ${couleurTexte(remplissage.poids_pct)}`}>{remplissage.poids_pct}%</span>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-slate-200">
                                              <div className={`h-2 rounded-full ${couleurBarre(remplissage.poids_pct)}`} style={{ width: `${Math.min(remplissage.poids_pct, 100)}%` }} />
                                            </div>
                                            {remplissage.poids_libre_kg !== null && <p className="text-xs text-slate-400">Libre : {remplissage.poids_libre_kg.toLocaleString('fr-FR')} kg</p>}
                                          </div>
                                        )}
                                        {remplissage.ml_pct !== null && (
                                          <div>
                                            <div className="flex justify-between mb-0.5">
                                              <span className="text-xs text-slate-500">Métrage · L {rem!.longueur_m} m</span>
                                              <span className={`text-xs font-bold ${couleurTexte(remplissage.ml_pct)}`}>{remplissage.ml_pct}%</span>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-slate-200">
                                              <div className={`h-2 rounded-full ${couleurBarre(remplissage.ml_pct)}`} style={{ width: `${Math.min(remplissage.ml_pct, 100)}%` }} />
                                            </div>
                                            {remplissage.ml_libre_m !== null && <p className="text-xs text-slate-400">Libre : {remplissage.ml_libre_m} m</p>}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}
                            </div>
                          )}
                        </SectionCard>
                      )}

                      <SectionCard
                        title="Consignes internes"
                        description="Informations de conduite et remarques exploitation séparées pour éviter les blocs compacts en bas de formulaire."
                      >
                        <div className="grid gap-4 lg:grid-cols-2">
                          <Field label="Instructions chauffeur">
                            <textarea className={`${inp} min-h-[140px] resize-y`} value={form.instructions ?? ''} onChange={e => setF('instructions', e.target.value || null)} />
                          </Field>
                          <Field label="Notes internes">
                            <textarea className={`${inp} min-h-[140px] resize-y`} value={form.notes_internes ?? ''} onChange={e => setF('notes_internes', e.target.value || null)} />
                          </Field>
                        </div>
                      </SectionCard>
                    </div>

                    <div className="space-y-6">
                      <SectionCard
                        title="Mission / groupage"
                        description="Le rattachement mission reste visible comme une donnée métier centrale, avec les actions disponibles selon l existant."
                        tone="highlight"
                      >
                        <div className="space-y-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <SummaryPill label="Statut mission" value={selected?.mission_id ? (selected.groupage_fige ? 'Mission figee' : 'Mission deliable') : 'Course independante'} tone={selected?.mission_id ? 'success' : 'neutral'} />
                            <SummaryPill label="Courses liees" value={selected?.mission_id ? `${selectedGroupMembers.length}` : '0'} />
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-semibold text-slate-900">Etat du groupage</p>
                            <p className="mt-2 text-sm text-slate-600">
                              {selected?.mission_id
                                ? `Cette course appartient a une mission avec ${selectedGroupMembers.length} course${selectedGroupMembers.length > 1 ? 's' : ''}.`
                                : 'Cette course est actuellement independante.'}
                            </p>
                            {selected?.mission_id && selectedGroupMembers.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {selectedGroupMembers.map(item => (
                                  <span key={item.id} className={`rounded-full px-3 py-1 text-sm font-medium ${item.id === selected.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                    {item.reference}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                            <div>
                              <label className="text-xs font-medium text-slate-600">Ajouter ou lier une autre course</label>
                              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                                <select
                                  className={inp}
                                  value={groupageTargetId}
                                  onChange={event => setGroupageTargetId(event.target.value)}
                                  disabled={!editingOtId || !canChangeOtStatus || selected?.groupage_fige}
                                >
                                  <option value="">Selectionner une course a lier</option>
                                  {groupageCandidates.map(item => (
                                    <option key={item.id} value={item.id}>
                                      {item.reference} - {clientMap[item.client_id] ?? 'Client inconnu'}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => { void linkSelectedToGroupage() }}
                                  disabled={!editingOtId || !groupageTargetId || !canChangeOtStatus || selected?.groupage_fige}
                                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Ajouter au groupage
                                </button>
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => { void unlinkSelectedFromGroupage() }}
                                disabled={!selected?.mission_id || !canChangeOtStatus}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Sortir de la mission
                              </button>
                              <button
                                type="button"
                                onClick={() => { void toggleSelectedGroupageFreeze(!selected?.groupage_fige) }}
                                disabled={!selected?.mission_id || !canChangeOtStatus}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {selected?.groupage_fige ? 'Defiger la mission' : 'Figer la mission'}
                              </button>
                            </div>
                            {!editingOtId && <p className="text-sm text-slate-500">Le groupage devient modifiable apres creation de la course.</p>}
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="Lieux de chargement et de livraison"
                        description="Deux blocs distincts pour éviter la confusion entre amont et aval de mission."
                      >
                        <div className="space-y-5">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <Field label="Site de chargement">
                              <select className={inp} value={form.chargement_site_id ?? ''} onChange={e => setF('chargement_site_id', e.target.value || null)}>
                                <option value="">Sélectionner un site</option>
                                {sites.filter(site => siteSupportsKind(site, 'chargement')).map(site => <option key={site.id} value={site.id}>{site.nom} - {site.adresse}</option>)}
                              </select>
                            </Field>
                            <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                              <summary className="cursor-pointer text-sm font-semibold text-slate-800">Ajouter un nouveau lieu de chargement</summary>
                              <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <Field label="Entreprise rattachee *">
                                  <select className={inp} value={siteDrafts.chargement.entreprise_id} onChange={e => setSiteDraft('chargement', 'entreprise_id', e.target.value)}>
                                    <option value="">Selectionner une entreprise</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                                  </select>
                                </Field>
                                <Field label="Nom du lieu">
                                  <input className={inp} value={siteDrafts.chargement.nom} onChange={e => setSiteDraft('chargement', 'nom', e.target.value)} placeholder="Ex: Quai 2 - Entrepot Nord" />
                                </Field>
                                <div className="md:col-span-2">
                                  <Field label="Adresse manuelle *">
                                    <input className={inp} value={siteDrafts.chargement.adresse} onChange={e => setSiteDraft('chargement', 'adresse', e.target.value)} placeholder="Saisissez une adresse ou detectez-la sur carte" />
                                  </Field>
                                </div>
                                <Field label="Usage du lieu">
                                  <select className={inp} value={siteDrafts.chargement.usage_type} onChange={e => setSiteDraft('chargement', 'usage_type', e.target.value as SiteUsageType)}>
                                    {Object.entries(SITE_USAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                  </select>
                                </Field>
                                <div className="flex items-end">
                                  <button type="button" className="text-sm font-medium text-blue-700 hover:text-blue-800" onClick={() => setSiteDraft('chargement', 'showMap', !siteDrafts.chargement.showMap)}>
                                    {siteDrafts.chargement.showMap ? 'Masquer la carte' : 'Poser un point sur la carte'}
                                  </button>
                                </div>
                                {(siteDrafts.chargement.usage_type === 'livraison' || siteDrafts.chargement.usage_type === 'mixte') && (
                                  <>
                                    <Field label="Jours d ouverture">
                                      <input className={inp} value={siteDrafts.chargement.jours_ouverture} onChange={e => setSiteDraft('chargement', 'jours_ouverture', e.target.value)} placeholder="Ex: Lun-Ven" />
                                    </Field>
                                    <Field label="Horaires d ouverture">
                                      <input className={inp} value={siteDrafts.chargement.horaires_ouverture} onChange={e => setSiteDraft('chargement', 'horaires_ouverture', e.target.value)} placeholder="Ex: 08:00-12:00 / 14:00-18:00" />
                                    </Field>
                                    <div className="md:col-span-2">
                                      <Field label="Specificites du lieu">
                                        <textarea className={`${inp} min-h-[120px] resize-y`} value={siteDrafts.chargement.notes_livraison} onChange={e => setSiteDraft('chargement', 'notes_livraison', e.target.value)} placeholder="Quai, badge, acces PL, consignes..." />
                                      </Field>
                                    </div>
                                  </>
                                )}
                                {siteDrafts.chargement.showMap && (
                                  <div className="md:col-span-2">
                                    <SiteMapPicker
                                      onPick={({ latitude, longitude, adresse }) => {
                                        setSiteDraft('chargement', 'latitude', latitude)
                                        setSiteDraft('chargement', 'longitude', longitude)
                                        setSiteDraft('chargement', 'adresse', adresse)
                                      }}
                                    />
                                  </div>
                                )}
                                <div className="md:col-span-2">
                                  <button type="button" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 transition hover:bg-blue-100" onClick={() => { void createOrSelectSite('chargement') }}>
                                    Enregistrer puis selectionner ce lieu
                                  </button>
                                </div>
                              </div>
                            </details>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <Field label="Site de livraison">
                              <select className={inp} value={form.livraison_site_id ?? ''} onChange={e => setF('livraison_site_id', e.target.value || null)}>
                                <option value="">Sélectionner un site</option>
                                {sites.filter(site => siteSupportsKind(site, 'livraison')).map(site => <option key={site.id} value={site.id}>{site.nom} - {site.adresse}</option>)}
                              </select>
                            </Field>
                            <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                              <summary className="cursor-pointer text-sm font-semibold text-slate-800">Ajouter un nouveau lieu de livraison</summary>
                              <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <Field label="Entreprise rattachee *">
                                  <select className={inp} value={siteDrafts.livraison.entreprise_id} onChange={e => setSiteDraft('livraison', 'entreprise_id', e.target.value)}>
                                    <option value="">Selectionner une entreprise</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                                  </select>
                                </Field>
                                <Field label="Nom du lieu">
                                  <input className={inp} value={siteDrafts.livraison.nom} onChange={e => setSiteDraft('livraison', 'nom', e.target.value)} placeholder="Ex: Magasin central" />
                                </Field>
                                <div className="md:col-span-2">
                                  <Field label="Adresse manuelle *">
                                    <input className={inp} value={siteDrafts.livraison.adresse} onChange={e => setSiteDraft('livraison', 'adresse', e.target.value)} placeholder="Saisissez une adresse ou detectez-la sur carte" />
                                  </Field>
                                </div>
                                <Field label="Usage du lieu">
                                  <select className={inp} value={siteDrafts.livraison.usage_type} onChange={e => setSiteDraft('livraison', 'usage_type', e.target.value as SiteUsageType)}>
                                    {Object.entries(SITE_USAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                  </select>
                                </Field>
                                <div className="flex items-end">
                                  <button type="button" className="text-sm font-medium text-blue-700 hover:text-blue-800" onClick={() => setSiteDraft('livraison', 'showMap', !siteDrafts.livraison.showMap)}>
                                    {siteDrafts.livraison.showMap ? 'Masquer la carte' : 'Poser un point sur la carte'}
                                  </button>
                                </div>
                                {(siteDrafts.livraison.usage_type === 'livraison' || siteDrafts.livraison.usage_type === 'mixte') && (
                                  <>
                                    <Field label="Jours d ouverture">
                                      <input className={inp} value={siteDrafts.livraison.jours_ouverture} onChange={e => setSiteDraft('livraison', 'jours_ouverture', e.target.value)} placeholder="Ex: Lun-Sam" />
                                    </Field>
                                    <Field label="Horaires d ouverture">
                                      <input className={inp} value={siteDrafts.livraison.horaires_ouverture} onChange={e => setSiteDraft('livraison', 'horaires_ouverture', e.target.value)} placeholder="Ex: 07:00-17:30" />
                                    </Field>
                                    <div className="md:col-span-2">
                                      <Field label="Specificites du lieu">
                                        <textarea className={`${inp} min-h-[120px] resize-y`} value={siteDrafts.livraison.notes_livraison} onChange={e => setSiteDraft('livraison', 'notes_livraison', e.target.value)} placeholder="Quai dechargement, RDV, securite, acces..." />
                                      </Field>
                                    </div>
                                  </>
                                )}
                                {siteDrafts.livraison.showMap && (
                                  <div className="md:col-span-2">
                                    <SiteMapPicker
                                      onPick={({ latitude, longitude, adresse }) => {
                                        setSiteDraft('livraison', 'latitude', latitude)
                                        setSiteDraft('livraison', 'longitude', longitude)
                                        setSiteDraft('livraison', 'adresse', adresse)
                                      }}
                                    />
                                  </div>
                                )}
                                <div className="md:col-span-2">
                                  <button type="button" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 transition hover:bg-blue-100" onClick={() => { void createOrSelectSite('livraison') }}>
                                    Enregistrer puis selectionner ce lieu
                                  </button>
                                </div>
                              </div>
                            </details>
                          </div>
                        </div>
                      </SectionCard>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
                  <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-600">
                      Les actions principales restent visibles en permanence pendant la saisie.
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {editingOtId && selected?.mission_id && (
                        <button
                          type="button"
                          onClick={() => { void unlinkSelectedFromGroupage() }}
                          disabled={!canChangeOtStatus}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Sortir de la mission
                        </button>
                      )}
                      <button type="button" onClick={closeTransportForm} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                        Annuler
                      </button>
                      <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
                        {saving ? 'Enregistrement...' : editingOtId ? 'Sauvegarder les modifications' : 'Creer l OT'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  )
}

type LogisticSitesTabProps = {
  sites: LogisticSite[]
  clients: ClientLookup[]
  clientMap: Record<string, string>
  onUpdate: (siteId: string, payload: Partial<LogisticSite>) => Promise<LogisticSite>
  onNotice: (message: string | null) => void
  canEdit: boolean
}

type SiteEditForm = {
  entreprise_id: string
  nom: string
  adresse: string
  code_postal: string
  ville: string
  pays: string
  contact_nom: string
  contact_tel: string
  usage_type: SiteUsageType
  type_site: string
  est_depot_relais: boolean
  horaires_ouverture: string
  jours_ouverture: string
  notes_livraison: string
  notes: string
  latitude: string
  longitude: string
}

const EMPTY_SITE_EDIT_FORM: SiteEditForm = {
  entreprise_id: '', nom: '', adresse: '', code_postal: '', ville: '',
  pays: 'France', contact_nom: '', contact_tel: '', usage_type: 'mixte',
  type_site: 'depot', est_depot_relais: true, horaires_ouverture: '',
  jours_ouverture: '', notes_livraison: '', notes: '', latitude: '', longitude: '',
}

function LogisticSitesTab({ sites, clients, clientMap, onUpdate, onNotice, canEdit }: LogisticSitesTabProps) {
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<SiteEditForm>(EMPTY_SITE_EDIT_FORM)

  const filteredSites = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return sites
    return sites.filter(site =>
      [
        site.nom,
        site.adresse,
        clientMap[site.entreprise_id ?? ''] ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    )
  }, [clientMap, search, sites])

  function startEdit(site: LogisticSite) {
    setEditingId(site.id)
    setForm({
      entreprise_id: site.entreprise_id ?? '',
      nom: site.nom,
      adresse: site.adresse,
      code_postal: (site as LogisticSite & { code_postal?: string | null }).code_postal ?? '',
      ville: (site as LogisticSite & { ville?: string | null }).ville ?? '',
      pays: (site as LogisticSite & { pays?: string }).pays ?? 'France',
      contact_nom: (site as LogisticSite & { contact_nom?: string | null }).contact_nom ?? '',
      contact_tel: (site as LogisticSite & { contact_tel?: string | null }).contact_tel ?? '',
      usage_type: (site.usage_type as SiteUsageType) ?? 'mixte',
      type_site: (site as LogisticSite & { type_site?: string }).type_site ?? 'depot',
      est_depot_relais: (site as LogisticSite & { est_depot_relais?: boolean }).est_depot_relais ?? true,
      horaires_ouverture: site.horaires_ouverture ?? '',
      jours_ouverture: site.jours_ouverture ?? '',
      notes_livraison: site.notes_livraison ?? '',
      notes: (site as LogisticSite & { notes?: string | null }).notes ?? '',
      latitude: site.latitude != null ? String(site.latitude) : '',
      longitude: site.longitude != null ? String(site.longitude) : '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_SITE_EDIT_FORM)
  }

  async function submitSiteEdit(event: React.FormEvent) {
    event.preventDefault()
    if (!editingId) return

    const entrepriseId = form.entreprise_id.trim()
    const nom = form.nom.trim()
    const adresse = form.adresse.trim()

    if (!entrepriseId) {
      onNotice('Impossible d enregistrer: chaque adresse doit etre rattachee a une entreprise.')
      return
    }
    if (!nom || !adresse) {
      onNotice('Nom du lieu et adresse sont obligatoires.')
      return
    }

    const latitude = form.latitude.trim() ? Number(form.latitude) : null
    const longitude = form.longitude.trim() ? Number(form.longitude) : null

    if ((latitude != null && !Number.isFinite(latitude)) || (longitude != null && !Number.isFinite(longitude))) {
      onNotice('Coordonnees invalides: utilisez des nombres decimaux.')
      return
    }

    setSaving(true)
    try {
      const hasDelivery = form.usage_type === 'livraison' || form.usage_type === 'mixte'
      await onUpdate(editingId, {
        entreprise_id: entrepriseId,
        nom,
        adresse,
        code_postal: form.code_postal.trim() || null,
        ville: form.ville.trim() || null,
        pays: form.pays.trim() || 'France',
        contact_nom: form.contact_nom.trim() || null,
        contact_tel: form.contact_tel.trim() || null,
        usage_type: form.usage_type,
        type_site: form.type_site || 'depot',
        est_depot_relais: form.est_depot_relais,
        horaires_ouverture: hasDelivery ? (form.horaires_ouverture.trim() || null) : null,
        jours_ouverture: hasDelivery ? (form.jours_ouverture.trim() || null) : null,
        notes_livraison: hasDelivery ? (form.notes_livraison.trim() || null) : null,
        notes: form.notes.trim() || null,
        latitude,
        longitude,
      } as Partial<LogisticSite>)
      onNotice('Fiche lieu mise a jour avec succes.')
      cancelEdit()
    } catch {
      onNotice('Mise a jour de la fiche lieu impossible pour le moment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="nx-panel p-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Fiches entreprises chargement/dechargement</h2>
            <p className="text-sm text-slate-500">{sites.length} lieu{sites.length > 1 ? 'x' : ''} en base</p>
          </div>
          <input
            type="text"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Rechercher lieu, adresse ou entreprise..."
            className="w-full max-w-md px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredSites.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Aucune fiche lieu trouvee.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Lieu', 'Adresse', 'Entreprise', 'Usage', 'Livraison', 'Coordonnees', 'Action'].map(header => (
                  <th key={header} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSites.map((site, index) => (
                <tr key={site.id} className={`border-t border-slate-100 ${index % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{site.nom}</td>
                  <td className="px-4 py-3 text-slate-700">{site.adresse}</td>
                  <td className="px-4 py-3 text-slate-600">{clientMap[site.entreprise_id ?? ''] ?? 'Entreprise non renseignee'}</td>
                  <td className="px-4 py-3 text-slate-600">{siteUsageLabel(site)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {site.usage_type === 'livraison' || site.usage_type === 'mixte'
                      ? [site.jours_ouverture, site.horaires_ouverture].filter(Boolean).join(' | ') || (site.notes_livraison ? 'Note renseignee' : 'Libre')
                      : 'Non applicable'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {site.latitude != null && site.longitude != null ? `${site.latitude}, ${site.longitude}` : 'Non renseignees'}
                  </td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => startEdit(site)}
                        className="text-xs rounded-lg border border-slate-200 px-2.5 py-1 text-slate-700 hover:bg-slate-50"
                      >
                        Modifier
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Lecture seule</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingId && (
        <form onSubmit={submitSiteEdit} className="nx-panel p-4 space-y-3">
          <h3 className="text-base font-semibold text-slate-800">Modifier la fiche lieu</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Entreprise *">
              <select className={inp} value={form.entreprise_id} onChange={event => setForm(current => ({ ...current, entreprise_id: event.target.value }))}>
                <option value="">Selectionner une entreprise</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.nom}</option>)}
              </select>
            </Field>
            <Field label="Nom du lieu *">
              <input className={inp} value={form.nom} onChange={event => setForm(current => ({ ...current, nom: event.target.value }))} />
            </Field>
            <Field label="Type de site">
              <select className={inp} value={form.type_site} onChange={event => setForm(current => ({ ...current, type_site: event.target.value }))}>
                <option value="entrepot">Entrepot</option>
                <option value="depot">Depot</option>
                <option value="agence">Agence</option>
                <option value="client">Client</option>
                <option value="quai">Quai</option>
                <option value="autre">Autre</option>
              </select>
            </Field>
            <Field label="Usage du lieu">
              <select className={inp} value={form.usage_type} onChange={event => setForm(current => ({ ...current, usage_type: event.target.value as SiteUsageType }))}>
                {Object.entries(SITE_USAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Adresse *">
                <input className={inp} value={form.adresse} onChange={event => setForm(current => ({ ...current, adresse: event.target.value }))} />
              </Field>
            </div>
            <Field label="Code postal">
              <input className={inp} value={form.code_postal} onChange={event => setForm(current => ({ ...current, code_postal: event.target.value }))} placeholder="Ex: 59000" />
            </Field>
            <Field label="Ville">
              <input className={inp} value={form.ville} onChange={event => setForm(current => ({ ...current, ville: event.target.value }))} placeholder="Ex: Lille" />
            </Field>
            <Field label="Contact">
              <input className={inp} value={form.contact_nom} onChange={event => setForm(current => ({ ...current, contact_nom: event.target.value }))} placeholder="Nom du contact" />
            </Field>
            <Field label="Tel. contact">
              <input className={inp} value={form.contact_tel} onChange={event => setForm(current => ({ ...current, contact_tel: event.target.value }))} placeholder="06 XX XX XX XX" />
            </Field>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.est_depot_relais}
                  onChange={e => setForm(current => ({ ...current, est_depot_relais: e.target.checked }))}
                  className="rounded" />
                Utilisable comme depot de relais (permet les reprises de charge)
              </label>
            </div>
            {(form.usage_type === 'livraison' || form.usage_type === 'mixte') && (
              <>
                <Field label="Jours d ouverture">
                  <input className={inp} value={form.jours_ouverture} onChange={event => setForm(current => ({ ...current, jours_ouverture: event.target.value }))} placeholder="Ex: Lun-Ven" />
                </Field>
                <Field label="Horaires d ouverture">
                  <input className={inp} value={form.horaires_ouverture} onChange={event => setForm(current => ({ ...current, horaires_ouverture: event.target.value }))} placeholder="Ex: 08:00-12:00 / 14:00-18:00" />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Specificites du lieu">
                    <textarea className={`${inp} resize-none h-24`} value={form.notes_livraison} onChange={event => setForm(current => ({ ...current, notes_livraison: event.target.value }))} placeholder="Consignes d acces, quai, badge, securite, RDV..." />
                  </Field>
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <Field label="Notes internes">
                <textarea className={`${inp} resize-none h-16`} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Notes pour les exploitants..." />
              </Field>
            </div>
            <Field label="Latitude">
              <input className={inp} value={form.latitude} onChange={event => setForm(current => ({ ...current, latitude: event.target.value }))} placeholder="Ex: 48.8566" />
            </Field>
            <Field label="Longitude">
              <input className={inp} value={form.longitude} onChange={event => setForm(current => ({ ...current, longitude: event.target.value }))} placeholder="Ex: 2.3522" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={cancelEdit} className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
            <button type="submit" disabled={saving} className="px-3 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <p className="text-slate-700 mt-0.5">{value || '—'}</p>
    </div>
  )
}
