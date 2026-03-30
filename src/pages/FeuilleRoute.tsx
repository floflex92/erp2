import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { listAffretementContractsForDriverEmail } from '@/lib/affretementPortal'

type OT = Tables<'ordres_transport'>
type EtapeMission = Tables<'etapes_mission'>
type HistoriqueStatut = Tables<'historique_statuts'>
type ConducteurLite = { id: string; nom: string; prenom: string; email: string | null; statut: string }
type ClientLite = { id: string; nom: string }
type VehiculeLite = { id: string; immatriculation: string; marque: string | null; modele: string | null }

type RouteBucket = 'past' | 'current' | 'future'
type LiveToast = { id: string; message: string }
type DriverProgressKey = 'vers_chargement' | 'chargement_en_cours' | 'charge' | 'vers_livraison' | 'livre'
type DriverGpsProof = { latitude: number; longitude: number; accuracy: number | null; capturedAt: string }
type DriverHistoryPayload = {
  source: 'feuille_route_conducteur'
  step: DriverProgressKey
  stepLabel: string
  note: string | null
  gps: { lat: number; lng: number; accuracy: number | null; captured_at: string } | null
  context: {
    reference: string
    client: string
    chargement: string
    livraison: string
    cmr: string | null
  }
}
type DriverProgressAction = {
  key: DriverProgressKey
  label: string
  description: string
  prefillNote: string
  operationalStatus: string
  missionStatus: string
  stageType: 'chargement' | 'livraison' | null
  stageStatus: string | null
  setRealDate: boolean
}
type DriverEvent = {
  id: string
  key: DriverProgressKey
  label: string
  createdAt: string
  note: string | null
  gps: DriverGpsProof | null
}

const STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  confirme: 'Confirmee',
  planifie: 'Planifiee',
  en_cours: 'En cours',
  livre: 'Livree',
  facture: 'Facturee',
  annule: 'Annulee',
}

const STATUS_BADGE: Record<string, string> = {
  brouillon: 'bg-slate-100 text-slate-600',
  confirme: 'nx-status-warning',
  planifie: 'nx-status-warning',
  en_cours: 'nx-status-warning',
  livre: 'nx-status-success',
  facture: 'nx-status-success',
  annule: 'nx-status-error',
}

const DRIVER_PROGRESS_ACTIONS: DriverProgressAction[] = [
  {
    key: 'vers_chargement',
    label: 'HLP vers chargement',
    description: 'Depart vers le lieu de chargement',
    prefillNote: 'Depart vers le site de chargement.',
    operationalStatus: 'prise_en_charge',
    missionStatus: 'en_cours',
    stageType: null,
    stageStatus: null,
    setRealDate: false,
  },
  {
    key: 'chargement_en_cours',
    label: 'En cours de chargement',
    description: 'Arrive sur site, debut de chargement',
    prefillNote: 'Arrive sur site, chargement en cours.',
    operationalStatus: 'prise_en_charge',
    missionStatus: 'en_cours',
    stageType: 'chargement',
    stageStatus: 'en_cours',
    setRealDate: false,
  },
  {
    key: 'charge',
    label: 'Charge',
    description: 'Chargement termine et depart valide',
    prefillNote: 'Chargement termine, depart valide.',
    operationalStatus: 'a_l_heure',
    missionStatus: 'en_cours',
    stageType: 'chargement',
    stageStatus: 'realise',
    setRealDate: true,
  },
  {
    key: 'vers_livraison',
    label: 'En route vers livraison',
    description: 'En route vers le site de livraison',
    prefillNote: 'En route vers le site de livraison.',
    operationalStatus: 'a_l_heure',
    missionStatus: 'en_cours',
    stageType: 'livraison',
    stageStatus: 'en_cours',
    setRealDate: false,
  },
  {
    key: 'livre',
    label: 'Livre',
    description: 'Livraison terminee',
    prefillNote: 'Livraison effectuee.',
    operationalStatus: 'termine',
    missionStatus: 'livre',
    stageType: 'livraison',
    stageStatus: 'realise',
    setRealDate: true,
  },
]

const DRIVER_PROGRESS_MAP = Object.fromEntries(
  DRIVER_PROGRESS_ACTIONS.map(action => [action.key, action]),
) as Record<DriverProgressKey, DriverProgressAction>

function isDriverProgressKey(value: string): value is DriverProgressKey {
  return value in DRIVER_PROGRESS_MAP
}

function driverStatusToken(value: DriverProgressKey) {
  return `conducteur:${value}`
}

function parseDriverStatusToken(value: string | null | undefined): DriverProgressKey | null {
  if (!value) return null
  if (!value.startsWith('conducteur:')) return null
  const rawKey = value.slice('conducteur:'.length)
  return isDriverProgressKey(rawKey) ? rawKey : null
}

function safeParseJson(value: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return null
  }
}

function asNumber(value: unknown) {
  if (typeof value !== 'number') return null
  return Number.isFinite(value) ? value : null
}

function normalizeGpsProof(value: unknown): DriverGpsProof | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const latitude = asNumber(raw.lat)
  const longitude = asNumber(raw.lng)
  if (latitude === null || longitude === null) return null
  return {
    latitude,
    longitude,
    accuracy: asNumber(raw.accuracy),
    capturedAt: typeof raw.captured_at === 'string' ? raw.captured_at : new Date().toISOString(),
  }
}

function extractDriverEvent(entry: HistoriqueStatut): DriverEvent | null {
  const parsed = safeParseJson(entry.commentaire)
  const parsedStep = parsed?.step
  const parsedKey = typeof parsedStep === 'string' && isDriverProgressKey(parsedStep) ? parsedStep : null
  const key = parseDriverStatusToken(entry.statut_nouveau) ?? parsedKey
  if (!key) return null
  const action = DRIVER_PROGRESS_MAP[key]
  const note = typeof parsed?.note === 'string' ? parsed.note : null
  const gps = normalizeGpsProof(parsed?.gps)
  return {
    id: entry.id,
    key,
    label: action.label,
    createdAt: entry.created_at,
    note,
    gps,
  }
}

function gpsProofUrl(gps: DriverGpsProof | null) {
  if (!gps) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${gps.latitude},${gps.longitude}`)}`
}

function formatGpsProof(gps: DriverGpsProof | null) {
  if (!gps) return 'GPS indisponible'
  const accuracy = gps.accuracy !== null ? ` (+/-${Math.round(gps.accuracy)}m)` : ''
  return `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}${accuracy}`
}

async function captureGpsProof(): Promise<DriverGpsProof | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return null

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
          capturedAt: new Date().toISOString(),
        })
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}

function appendProofNote(current: string | null, actionLabel: string, whenIso: string, gps: DriverGpsProof | null) {
  const row = `${formatDateTime(whenIso)} - ${actionLabel} - ${formatGpsProof(gps)}`
  return [current?.trim(), row].filter(Boolean).join('\n')
}

function normalizeIdentity(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase()
}

function conducteurIdentity(conducteur: { prenom: string | null; nom: string | null; email?: string | null }) {
  return `${normalizeIdentity(conducteur.prenom)}-${normalizeIdentity(conducteur.nom)}`
}

function formatDateTime(value: string | null) {
  if (!value) return 'Non planifie'
  return new Date(value).toLocaleString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAddress(step: EtapeMission | null) {
  if (!step) return 'Adresse non renseignee'
  return [step.adresse_libre, [step.code_postal, step.ville].filter(Boolean).join(' '), step.pays]
    .filter(Boolean)
    .join(', ')
}

function formatDuration(minutes: number | null) {
  if (minutes === null || minutes <= 0) return 'N/A'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} h`
  return `${hours} h ${mins} min`
}

function plannedDurationMinutes(ot: OT) {
  if (ot.date_chargement_prevue && ot.date_livraison_prevue) {
    const start = new Date(ot.date_chargement_prevue).getTime()
    const end = new Date(ot.date_livraison_prevue).getTime()
    const delta = Math.round((end - start) / 60000)
    if (delta > 0) return delta
  }
  if (ot.distance_km && ot.distance_km > 0) {
    return Math.round((ot.distance_km / 70) * 60)
  }
  return null
}

function routeBucket(ot: OT): RouteBucket {
  const now = Date.now()
  const start = ot.date_chargement_prevue ? new Date(ot.date_chargement_prevue).getTime() : null
  const end = ot.date_livraison_prevue ? new Date(ot.date_livraison_prevue).getTime() : start
  if (ot.statut === 'livre' || ot.statut === 'facture' || ot.statut === 'annule') return 'past'
  if (end !== null && end < now) return 'past'
  if (ot.statut === 'en_cours') return 'current'
  if (start !== null && start <= now && (end === null || end >= now)) return 'current'
  return 'future'
}

function buildGpsUrl(origin: string, destination: string) {
  const hasOrigin = origin.trim().length > 0
  const hasDestination = destination.trim().length > 0
  if (!hasOrigin && !hasDestination) return null
  if (hasOrigin && hasDestination) {
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination || origin)}`
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status
}

function statusClass(status: string) {
  return STATUS_BADGE[status] ?? 'bg-slate-500/15 text-slate-300'
}

function findStageByType(steps: EtapeMission[], stageType: 'chargement' | 'livraison') {
  return steps.find(step => step.type_etape === stageType) ?? null
}

export default function FeuilleRoute() {
  const { profil, role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [conducteur, setConducteur] = useState<ConducteurLite | null>(null)
  const [orders, setOrders] = useState<OT[]>([])
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({})
  const [vehiculeMap, setVehiculeMap] = useState<Record<string, string>>({})
  const [stepsByOtId, setStepsByOtId] = useState<Record<string, EtapeMission[]>>({})
  const [historyByOtId, setHistoryByOtId] = useState<Record<string, HistoriqueStatut[]>>({})
  const [crmNotesByOtId, setCrmNotesByOtId] = useState<Record<string, string>>({})
  const [savingProgressByOtId, setSavingProgressByOtId] = useState<Record<string, DriverProgressKey | null>>({})
  const [toasts, setToasts] = useState<LiveToast[]>([])

  const isConducteurSession = role === 'conducteur' || role === 'conducteur_affreteur'
  const isAffreteurDriverSession = role === 'conducteur_affreteur'
  const visibleOrderIdsRef = useRef<Set<string>>(new Set())

  function pushToast(message: string) {
    const toastId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(current => [...current, { id: toastId, message }].slice(-4))
    window.setTimeout(() => {
      setToasts(current => current.filter(toast => toast.id !== toastId))
    }, 5000)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Feuille de route', { body: message })
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [conducteursRes, clientsRes, vehiculesRes, ordersRes] = await Promise.all([
        supabase.from('conducteurs').select('id,nom,prenom,email,statut').eq('statut', 'actif').order('nom'),
        supabase.from('clients').select('id,nom'),
        supabase.from('vehicules').select('id,immatriculation,marque,modele'),
        supabase.from('ordres_transport').select('*').order('date_chargement_prevue', { ascending: true, nullsFirst: false }),
      ])

      if (conducteursRes.error) throw conducteursRes.error
      if (clientsRes.error) throw clientsRes.error
      if (vehiculesRes.error) throw vehiculesRes.error
      if (ordersRes.error) throw ordersRes.error

      const conducteurs = (conducteursRes.data ?? []) as ConducteurLite[]
      const clientRows = (clientsRes.data ?? []) as ClientLite[]
      const vehicules = (vehiculesRes.data ?? []) as VehiculeLite[]
      const allOrders = (ordersRes.data ?? []) as OT[]

      const profileEmail = normalizeIdentity(profil?.email)
      const profileIdentity = conducteurIdentity({ prenom: profil?.prenom ?? '', nom: profil?.nom ?? '', email: profil?.email ?? null })

      const currentConducteur = isConducteurSession && !isAffreteurDriverSession
        ? conducteurs.find(item =>
          (profileEmail && normalizeIdentity(item.email) === profileEmail)
          || conducteurIdentity(item) === profileIdentity,
        ) ?? null
        : null

      const affretementContracts = isAffreteurDriverSession && profil?.email
        ? listAffretementContractsForDriverEmail(profil.email)
        : []
      const affretementOrderIds = new Set(affretementContracts.map(item => item.otId))

      setConducteur(currentConducteur)

      if (isConducteurSession && !isAffreteurDriverSession && !currentConducteur) {
        setNotice("Profil conducteur introuvable dans la base. Contactez l'exploitant pour corriger l'affectation.")
      } else if (isAffreteurDriverSession && affretementContracts.length === 0) {
        setNotice('Aucune course affretee ne vous est affectee pour le moment.')
      } else {
        setNotice(null)
      }

      const visibleOrders = isConducteurSession
        ? (
          isAffreteurDriverSession
            ? allOrders.filter(ot => affretementOrderIds.has(ot.id))
            : (currentConducteur ? allOrders.filter(ot => ot.conducteur_id === currentConducteur.id) : [])
        )
        : allOrders

      const orderIds = visibleOrders.map(ot => ot.id)
      visibleOrderIdsRef.current = new Set(orderIds)

      let nextSteps: EtapeMission[] = []
      let nextHistory: HistoriqueStatut[] = []
      if (orderIds.length > 0) {
        const [stepsRes, historyRes] = await Promise.all([
          supabase
            .from('etapes_mission')
            .select('*')
            .in('ot_id', orderIds)
            .order('ordre', { ascending: true }),
          supabase
            .from('historique_statuts')
            .select('*')
            .in('ot_id', orderIds)
            .order('created_at', { ascending: false }),
        ])

        if (stepsRes.error) throw stepsRes.error
        if (historyRes.error) throw historyRes.error
        nextSteps = (stepsRes.data ?? []) as EtapeMission[]
        nextHistory = (historyRes.data ?? []) as HistoriqueStatut[]
      }

      const groupedSteps: Record<string, EtapeMission[]> = {}
      for (const step of nextSteps) {
        groupedSteps[step.ot_id] = [...(groupedSteps[step.ot_id] ?? []), step]
      }

      const groupedHistory: Record<string, HistoriqueStatut[]> = {}
      for (const row of nextHistory) {
        groupedHistory[row.ot_id] = [...(groupedHistory[row.ot_id] ?? []), row]
      }
      for (const key of Object.keys(groupedHistory)) {
        groupedHistory[key].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      }

      setOrders(visibleOrders)
      setStepsByOtId(groupedSteps)
      setHistoryByOtId(groupedHistory)
      setClientsMap(Object.fromEntries(clientRows.map(item => [item.id, item.nom])))
      setVehiculeMap(Object.fromEntries(vehicules.map(item => [item.id, [item.immatriculation, item.marque, item.modele].filter(Boolean).join(' - ')])))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [isAffreteurDriverSession, isConducteurSession, profil?.email, profil?.nom, profil?.prenom])

  const saveDriverProgress = useCallback(async (order: OT, steps: EtapeMission[], progressKey: DriverProgressKey) => {
    const action = DRIVER_PROGRESS_MAP[progressKey]
    setSavingProgressByOtId(current => ({ ...current, [order.id]: progressKey }))
    setError(null)

    try {
      const nowIso = new Date().toISOString()
      const loadStep = findStageByType(steps, 'chargement')
      const unloadStep = findStageByType(steps, 'livraison')
      const gpsProof = await captureGpsProof()
      const note = (crmNotesByOtId[order.id] ?? '').trim() || action.prefillNote
      const previousDriverStatus = parseDriverStatusToken((historyByOtId[order.id] ?? [])[0]?.statut_nouveau)

      const otPatch: TablesUpdate<'ordres_transport'> = {
        statut_operationnel: action.operationalStatus,
        statut: action.missionStatus,
      }
      if (progressKey === 'livre') {
        otPatch.date_livraison_reelle = nowIso
      }
      const otRes = await supabase.from('ordres_transport').update(otPatch).eq('id', order.id)
      if (otRes.error) throw otRes.error

      if (action.stageType && action.stageStatus) {
        const missionStep = findStageByType(steps, action.stageType)
        if (missionStep) {
          const stepPatch: TablesUpdate<'etapes_mission'> = {
            statut: action.stageStatus,
            notes: appendProofNote(missionStep.notes, action.label, nowIso, gpsProof),
          }
          if (action.setRealDate) {
            stepPatch.date_reelle = nowIso
          }
          const stepRes = await supabase.from('etapes_mission').update(stepPatch).eq('id', missionStep.id)
          if (stepRes.error) throw stepRes.error
        }
      }

      const historyPayload: DriverHistoryPayload = {
        source: 'feuille_route_conducteur',
        step: progressKey,
        stepLabel: action.label,
        note: note || null,
        gps: gpsProof
          ? {
              lat: gpsProof.latitude,
              lng: gpsProof.longitude,
              accuracy: gpsProof.accuracy,
              captured_at: gpsProof.capturedAt,
            }
          : null,
        context: {
          reference: order.reference,
          client: clientsMap[order.client_id] ?? 'Client non renseigne',
          chargement: formatAddress(loadStep),
          livraison: formatAddress(unloadStep),
          cmr: order.numero_cmr,
        },
      }
      const historyInsert: TablesInsert<'historique_statuts'> = {
        ot_id: order.id,
        statut_ancien: previousDriverStatus ? driverStatusToken(previousDriverStatus) : order.statut_operationnel,
        statut_nouveau: driverStatusToken(progressKey),
        commentaire: JSON.stringify(historyPayload),
        created_by: profil?.id ?? null,
      }
      const historyRes = await supabase.from('historique_statuts').insert(historyInsert)
      if (historyRes.error) throw historyRes.error

      setCrmNotesByOtId(current => ({ ...current, [order.id]: '' }))
      pushToast(gpsProof ? `${action.label} enregistree avec preuve GPS.` : `${action.label} enregistree (GPS indisponible).`)
      void loadData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Impossible d enregistrer le suivi conducteur.')
    } finally {
      setSavingProgressByOtId(current => ({ ...current, [order.id]: null }))
    }
  }, [clientsMap, crmNotesByOtId, historyByOtId, loadData, profil?.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!isConducteurSession || typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => undefined)
    }
  }, [isConducteurSession])

  useEffect(() => {
    if (!isConducteurSession && role !== 'exploitant' && role !== 'dirigeant' && role !== 'admin') return
    const db = looseSupabase
    const orderFilter = isConducteurSession && !isAffreteurDriverSession && conducteur ? `conducteur_id=eq.${conducteur.id}` : undefined

    const ordersChannel = db
      .channel(`driver-route-orders-${conducteur?.id ?? 'all'}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'ordres_transport',
        ...(orderFilter ? { filter: orderFilter } : {}),
      }, (payload: { eventType: string; new?: OT; old?: OT }) => {
        if (isAffreteurDriverSession) {
          const otId = payload.new?.id ?? payload.old?.id
          if (!otId || !visibleOrderIdsRef.current.has(otId)) return
        }
        void loadData()
        const ref = payload.new?.reference ?? payload.old?.reference ?? 'une course'
        const verb = payload.eventType === 'INSERT' ? 'Nouvelle course' : payload.eventType === 'DELETE' ? 'Course retiree' : 'Course mise a jour'
        pushToast(`${verb}: ${ref}`)
      })
      .subscribe()

    const stepsChannel = db
      .channel(`driver-route-steps-${conducteur?.id ?? 'all'}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'etapes_mission',
      }, (payload: { eventType: string; new?: EtapeMission; old?: EtapeMission }) => {
        const otId = payload.new?.ot_id ?? payload.old?.ot_id
        if (!otId || !visibleOrderIdsRef.current.has(otId)) return
        void loadData()
        const verb = payload.eventType === 'DELETE' ? 'Etape retiree' : 'Etape mise a jour'
        pushToast(`${verb} sur une de vos courses.`)
      })
      .subscribe()

    const historyChannel = db
      .channel(`driver-route-history-${conducteur?.id ?? 'all'}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'historique_statuts',
      }, (payload: { eventType: string; new?: HistoriqueStatut; old?: HistoriqueStatut }) => {
        const otId = payload.new?.ot_id ?? payload.old?.ot_id
        if (!otId || !visibleOrderIdsRef.current.has(otId)) return
        void loadData()
        const verb = payload.eventType === 'INSERT' ? 'Journal CRM ajoute' : payload.eventType === 'DELETE' ? 'Journal CRM supprime' : 'Journal CRM mis a jour'
        pushToast(`${verb} sur une mission.`)
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(ordersChannel)
      void supabase.removeChannel(stepsChannel)
      void supabase.removeChannel(historyChannel)
    }
  }, [conducteur, isAffreteurDriverSession, isConducteurSession, loadData, role])

  const sections = useMemo(() => {
    const sorted = [...orders]
    sorted.sort((left, right) => {
      const leftTs = new Date(left.date_chargement_prevue ?? left.created_at).getTime()
      const rightTs = new Date(right.date_chargement_prevue ?? right.created_at).getTime()
      return leftTs - rightTs
    })

    const buckets: Record<RouteBucket, OT[]> = { past: [], current: [], future: [] }
    for (const order of sorted) buckets[routeBucket(order)].push(order)
    buckets.past.sort((a, b) => {
      const aTs = new Date(a.date_livraison_prevue ?? a.date_chargement_prevue ?? a.created_at).getTime()
      const bTs = new Date(b.date_livraison_prevue ?? b.date_chargement_prevue ?? b.created_at).getTime()
      return bTs - aTs
    })
    return buckets
  }, [orders])

  const stats = {
    total: orders.length,
    past: sections.past.length,
    current: sections.current.length,
    future: sections.future.length,
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="nx-panel border border-slate-700/60 bg-slate-900/80 px-5 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/70">Conduite terrain</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Feuille de route</h2>
            <p className="mt-1 text-sm text-slate-300">
              Courses passees, en cours et a venir avec toutes les infos terrain utiles.
            </p>
            {isConducteurSession && (
              <p className="mt-2 text-xs text-cyan-200/80">
                Session conducteur: {conducteur ? `${conducteur.prenom} ${conducteur.nom}` : [profil?.prenom, profil?.nom].filter(Boolean).join(' ') || 'Conducteur affreteur'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
          >
            Actualiser
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total courses" value={String(stats.total)} />
        <MetricCard label="Passees" value={String(stats.past)} />
        <MetricCard label="En cours" value={String(stats.current)} accent="text-amber-300" />
        <MetricCard label="A venir" value={String(stats.future)} accent="text-cyan-300" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          <RouteSection
            title="En cours"
            subtitle="Missions actives et imminentes"
            orders={sections.current}
            stepsByOtId={stepsByOtId}
            historyByOtId={historyByOtId}
            clientsMap={clientsMap}
            vehiculeMap={vehiculeMap}
            isConducteurSession={isConducteurSession}
            crmNotesByOtId={crmNotesByOtId}
            savingProgressByOtId={savingProgressByOtId}
            onCrmNoteChange={(otId, value) => setCrmNotesByOtId(current => ({ ...current, [otId]: value }))}
            onSaveDriverProgress={saveDriverProgress}
          />
          <RouteSection
            title="A venir"
            subtitle="Prochaines missions planifiees"
            orders={sections.future}
            stepsByOtId={stepsByOtId}
            historyByOtId={historyByOtId}
            clientsMap={clientsMap}
            vehiculeMap={vehiculeMap}
            isConducteurSession={isConducteurSession}
            crmNotesByOtId={crmNotesByOtId}
            savingProgressByOtId={savingProgressByOtId}
            onCrmNoteChange={(otId, value) => setCrmNotesByOtId(current => ({ ...current, [otId]: value }))}
            onSaveDriverProgress={saveDriverProgress}
          />
          <RouteSection
            title="Passees"
            subtitle="Historique recent de vos courses"
            orders={sections.past}
            stepsByOtId={stepsByOtId}
            historyByOtId={historyByOtId}
            clientsMap={clientsMap}
            vehiculeMap={vehiculeMap}
            isConducteurSession={isConducteurSession}
            crmNotesByOtId={crmNotesByOtId}
            savingProgressByOtId={savingProgressByOtId}
            onCrmNoteChange={(otId, value) => setCrmNotesByOtId(current => ({ ...current, [otId]: value }))}
            onSaveDriverProgress={saveDriverProgress}
          />
        </div>
      )}

      {toasts.length > 0 && (
        <div className="fixed right-4 top-20 z-[120] space-y-2">
          {toasts.map(toast => (
            <div key={toast.id} className="max-w-sm rounded-xl border border-cyan-500/25 bg-slate-900/95 px-4 py-3 text-xs text-cyan-100 shadow-2xl">
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="nx-panel border border-slate-700/60 bg-slate-900/70 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold text-white ${accent ?? ''}`}>{value}</p>
    </div>
  )
}

function RouteSection({
  title,
  subtitle,
  orders,
  stepsByOtId,
  historyByOtId,
  clientsMap,
  vehiculeMap,
  isConducteurSession,
  crmNotesByOtId,
  savingProgressByOtId,
  onCrmNoteChange,
  onSaveDriverProgress,
}: {
  title: string
  subtitle: string
  orders: OT[]
  stepsByOtId: Record<string, EtapeMission[]>
  historyByOtId: Record<string, HistoriqueStatut[]>
  clientsMap: Record<string, string>
  vehiculeMap: Record<string, string>
  isConducteurSession: boolean
  crmNotesByOtId: Record<string, string>
  savingProgressByOtId: Record<string, DriverProgressKey | null>
  onCrmNoteChange: (otId: string, value: string) => void
  onSaveDriverProgress: (order: OT, steps: EtapeMission[], progressKey: DriverProgressKey) => Promise<void>
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-6 text-sm text-slate-400">
          Aucune course dans cette section.
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {orders.map(order => {
            const steps = stepsByOtId[order.id] ?? []
            const loadStep = findStageByType(steps, 'chargement')
            const unloadStep = findStageByType(steps, 'livraison')
            const loadAddress = formatAddress(loadStep)
            const unloadAddress = formatAddress(unloadStep)
            const gpsLink = buildGpsUrl(loadAddress, unloadAddress)
            const contactLoad = [loadStep?.contact_nom, loadStep?.contact_tel].filter(Boolean).join(' - ') || 'N/A'
            const contactUnload = [unloadStep?.contact_nom, unloadStep?.contact_tel].filter(Boolean).join(' - ') || 'N/A'
            const duration = plannedDurationMinutes(order)
            const routeReference = loadStep?.reference_marchandise ?? unloadStep?.reference_marchandise ?? order.numero_cmr ?? order.numero_bl ?? 'N/A'
            const crmPrefill = [
              `OT ${order.reference}`,
              clientsMap[order.client_id] ?? 'Client non renseigne',
              `CMR ${order.numero_cmr ?? 'N/A'}`,
              `${loadAddress} -> ${unloadAddress}`,
            ].join(' | ')
            const driverEvents = (historyByOtId[order.id] ?? [])
              .map(extractDriverEvent)
              .filter((event): event is DriverEvent => event !== null)
            const activeDriverStep = driverEvents[0]?.key ?? null
            const savingStep = savingProgressByOtId[order.id]

            return (
              <article key={order.id} className="nx-panel border border-slate-700/60 bg-slate-900/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-slate-500">{order.reference}</p>
                    <p className="text-sm font-semibold text-white">{clientsMap[order.client_id] ?? 'Client non renseigne'}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(order.statut)}`}>
                    {statusLabel(order.statut)}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 text-xs text-slate-200 sm:grid-cols-2">
                  <InfoRow label="Chargement RDV" value={formatDateTime(loadStep?.date_prevue ?? order.date_chargement_prevue)} />
                  <InfoRow label="Livraison RDV" value={formatDateTime(unloadStep?.date_prevue ?? order.date_livraison_prevue)} />
                  <InfoRow label="Lieu de chargement" value={loadAddress} />
                  <InfoRow label="Lieu de livraison" value={unloadAddress} />
                  <InfoRow label="Contact chargement" value={contactLoad} />
                  <InfoRow label="Contact livraison" value={contactUnload} />
                  <InfoRow label="Reference utile" value={routeReference} />
                  <InfoRow label="Vehicule" value={order.vehicule_id ? (vehiculeMap[order.vehicule_id] ?? 'Vehicule non renseigne') : 'Non affecte'} />
                  <InfoRow label="Distance prevue" value={order.distance_km ? `${order.distance_km} km` : 'N/A'} />
                  <InfoRow label="Temps prevu" value={formatDuration(duration)} />
                </div>

                {(loadStep?.instructions || unloadStep?.instructions || order.instructions) && (
                  <div className="mt-3 rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-xs text-slate-300">
                    <p className="mb-1 font-semibold uppercase tracking-[0.15em] text-slate-500">Consignes</p>
                    <p className="whitespace-pre-line">{loadStep?.instructions ?? unloadStep?.instructions ?? order.instructions}</p>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {gpsLink ? (
                    <a
                      href={gpsLink}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-[color:var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Lancer le GPS
                    </a>
                  ) : (
                    <span className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-400">GPS indisponible (adresses manquantes)</span>
                  )}
                </div>

                <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">CRM mission pre-rempli</p>
                  <p className="mt-1 text-[11px] text-cyan-100/90">{crmPrefill}</p>

                  {isConducteurSession && (
                    <>
                      <textarea
                        value={crmNotesByOtId[order.id] ?? ''}
                        onChange={event => onCrmNoteChange(order.id, event.target.value)}
                        placeholder="Commentaire conducteur (retard, attente quai, reserve, observation)."
                        className="mt-3 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500/60"
                        rows={3}
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {DRIVER_PROGRESS_ACTIONS.map(action => (
                          <button
                            key={action.key}
                            type="button"
                            onClick={() => void onSaveDriverProgress(order, steps, action.key)}
                            disabled={Boolean(savingStep)}
                            title={action.description}
                            className={`rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors ${
                              activeDriverStep === action.key
                                ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                                : 'border-slate-700/80 bg-slate-900/70 text-slate-200 hover:border-cyan-500/45 hover:text-cyan-100'
                            } ${savingStep ? 'opacity-70' : ''}`}
                          >
                            {savingStep === action.key ? 'Enregistrement...' : action.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] text-slate-400">
                        Chaque validation enregistre un horodatage et une preuve GPS quand la geolocalisation est disponible.
                      </p>
                    </>
                  )}

                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">Journal CRM mission</p>
                    {driverEvents.length === 0 ? (
                      <p className="text-xs text-slate-400">Aucun evenement conducteur enregistre pour cette course.</p>
                    ) : (
                      <div className="space-y-2">
                        {driverEvents.slice(0, 5).map(event => {
                          const gpsLinkProof = gpsProofUrl(event.gps)
                          return (
                            <div key={event.id} className="rounded-lg border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
                              <p className="font-semibold text-cyan-100">{event.label}</p>
                              <p className="mt-0.5 text-slate-400">{formatDateTime(event.createdAt)}</p>
                              {event.note && <p className="mt-1 whitespace-pre-line">{event.note}</p>}
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="text-[11px] text-slate-400">{formatGpsProof(event.gps)}</span>
                                {gpsLinkProof && (
                                  <a href={gpsLinkProof} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-cyan-200 hover:text-cyan-100">
                                    Voir point GPS
                                  </a>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-0.5 text-xs leading-5 text-slate-200">{value}</p>
    </div>
  )
}

