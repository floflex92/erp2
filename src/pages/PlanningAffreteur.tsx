import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import {
  AFFRETEMENT_OPERATIONAL_STATUS_LABELS,
  AFFRETEMENT_REQUIRED_OPERATIONAL_FLOW,
  evaluateAffretementCompletionReadiness,
  findAffreteurOnboardingForScope,
  listAffretementContractsByOnboarding,
  listAffreteurDrivers,
  listAffreteurVehicles,
  subscribeAffretementPortalUpdates,
  upsertAffretementOperationalUpdate,
  updateAffretementContractByAffreteur,
  type AffretementContract,
  type AffretementOperationalStatusKey,
  type AffreteurDriver,
  type AffreteurVehicle,
} from '@/lib/affretementPortal'
import { Link } from 'react-router-dom'

// ─── types ──────────────────────────────────────────────────────────────────

type OtDetail = {
  id: string
  reference: string
  clientName: string
  pickupAt: string | null
  deliveryAt: string | null
  goods: string | null
  distanceKm: number | null
  pickupLabel: string | null
  deliveryLabel: string | null
}

type EnrichedContract = AffretementContract & {
  ot: OtDetail | null
  driverName: string | null
  vehiclePlate: string | null
  doneKeys: Set<AffretementOperationalStatusKey>
  nextStep: AffretementOperationalStatusKey | null
  readyForCompletion: boolean
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function fmtDay(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtWeekRange(monday: Date): string {
  const friday = addDays(monday, 6)
  return `${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${friday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getOtDay(contract: EnrichedContract): string | null {
  const pivot = contract.ot?.pickupAt ?? contract.ot?.deliveryAt ?? null
  if (!pivot) return null
  return pivot.slice(0, 10)
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const STATUS_BADGE: Record<AffretementContract['status'], string> = {
  propose:  'bg-amber-100 text-amber-700 border-amber-200',
  accepte:  'bg-blue-100 text-blue-700 border-blue-200',
  refuse:   'bg-red-100 text-red-700 border-red-200',
  en_cours: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  termine:  'bg-slate-100 text-slate-600 border-slate-200',
  annule:   'bg-red-50 text-red-400 border-red-100',
}
const STATUS_LABEL: Record<AffretementContract['status'], string> = {
  propose:  'Proposé',
  accepte:  'Accepté',
  refuse:   'Refusé',
  en_cours: 'En cours',
  termine:  'Terminé',
  annule:   'Annulé',
}

const DAY_NAMES = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.']

// ─── component ───────────────────────────────────────────────────────────────

export default function PlanningAffreteur() {
  const { profil, user } = useAuth()

  const [contracts, setContracts] = useState<EnrichedContract[]>([])
  const [drivers, setDrivers] = useState<AffreteurDriver[]>([])
  const [vehicles, setVehicles] = useState<AffreteurVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [saving, setSaving] = useState<string | null>(null) // contractId en cours

  const [weekOffset, setWeekOffset] = useState(0)
  const [viewMode, setViewMode] = useState<'semaine' | 'liste'>('semaine')
  const [filterStatus, setFilterStatus] = useState<AffretementContract['status'] | 'tous'>('tous')

  const weekMonday = useMemo(() => addDays(getMonday(new Date()), weekOffset * 7), [weekOffset])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i)), [weekMonday])

  // ── chargement ─────────────────────────────────────────────────────────────

  async function loadAll() {
    setLoading(true)
    const onboarding = findAffreteurOnboardingForScope({
      profileId: profil?.id ?? null,
      email: user?.email ?? null,
    })

    if (!onboarding) {
      setContracts([])
      setLoading(false)
      return
    }

    const rawContracts = listAffretementContractsByOnboarding(onboarding.id)
    const rawDrivers = listAffreteurDrivers(onboarding.id)
    const rawVehicles = listAffreteurVehicles(onboarding.id)
    setDrivers(rawDrivers)
    setVehicles(rawVehicles)

    // Charger les détails OT depuis Supabase
    const otIds = [...new Set(rawContracts.map(c => c.otId))]
    let otMap: Record<string, OtDetail> = {}

    if (otIds.length > 0) {
      const { data } = await supabase
        .from('ordres_transport')
        .select(`
          id, reference, statut,
          date_chargement_prevue, date_livraison_prevue,
          nature_marchandise, distance_km,
          chargement_site_id, livraison_site_id,
          clients!ordres_transport_client_id_fkey(nom),
          chargement_site:logistic_sites!chargement_site_id(nom, ville),
          livraison_site:logistic_sites!livraison_site_id(nom, ville)
        `)
        .in('id', otIds)

      if (data) {
        for (const row of data) {
          const chSite = Array.isArray(row.chargement_site) ? row.chargement_site[0] : row.chargement_site
          const livSite = Array.isArray(row.livraison_site) ? row.livraison_site[0] : row.livraison_site
          const client = Array.isArray(row.clients) ? row.clients[0] : row.clients
          otMap[row.id] = {
            id: row.id,
            reference: row.reference ?? row.id.slice(0, 8),
            clientName: (client as { nom?: string } | null)?.nom ?? '—',
            pickupAt: row.date_chargement_prevue ?? null,
            deliveryAt: row.date_livraison_prevue ?? null,
            goods: row.nature_marchandise ?? null,
            distanceKm: row.distance_km ?? null,
            pickupLabel: chSite ? `${(chSite as { nom?: string }).nom ?? ''} ${(chSite as { ville?: string }).ville ?? ''}`.trim() : null,
            deliveryLabel: livSite ? `${(livSite as { nom?: string }).nom ?? ''} ${(livSite as { ville?: string }).ville ?? ''}`.trim() : null,
          }
        }
      }
    }

    const driverMap: Record<string, string> = {}
    for (const d of rawDrivers) driverMap[d.id] = d.fullName
    const vehicleMap: Record<string, string> = {}
    for (const v of rawVehicles) vehicleMap[v.id] = v.plate

    const enriched: EnrichedContract[] = rawContracts.map(c => {
      const doneKeys = new Set(c.operationalUpdates.map(u => u.key))
      const nextStep = AFFRETEMENT_REQUIRED_OPERATIONAL_FLOW.find(k => !doneKeys.has(k)) ?? null
      const readiness = evaluateAffretementCompletionReadiness(c)
      return {
        ...c,
        ot: otMap[c.otId] ?? null,
        driverName: c.assignedDriverId ? (driverMap[c.assignedDriverId] ?? null) : null,
        vehiclePlate: c.assignedVehicleId ? (vehicleMap[c.assignedVehicleId] ?? null) : null,
        doneKeys,
        nextStep,
        readyForCompletion: readiness.readyForCompletion,
      }
    })

    setContracts(enriched)
    setLoading(false)
  }

  useEffect(() => {
    void loadAll()
    const unsub = subscribeAffretementPortalUpdates(() => { void loadAll() })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil?.id, user?.email])

  // ── actions ────────────────────────────────────────────────────────────────

  function showNotice(msg: string, type: 'ok' | 'err' = 'ok') {
    setNotice({ msg, type })
    setTimeout(() => setNotice(null), 3500)
  }

  async function markNextStep(contract: EnrichedContract) {
    if (!contract.nextStep) return
    setSaving(contract.id)
    try {
      await upsertAffretementOperationalUpdate(contract.id, contract.nextStep, {
        note: null,
        gpsLat: null,
        gpsLng: null,
      })
      showNotice(`Étape "${AFFRETEMENT_OPERATIONAL_STATUS_LABELS[contract.nextStep]}" enregistrée.`)
    } catch (err) {
      showNotice(`Erreur : ${err instanceof Error ? err.message : 'inconnue'}`, 'err')
    } finally {
      setSaving(null)
      void loadAll()
    }
  }

  async function acceptContract(contract: EnrichedContract) {
    setSaving(contract.id)
    try {
      await updateAffretementContractByAffreteur(contract.id, { status: 'accepte', affreteurNote: null })
      showNotice('Contrat accepté.')
    } catch (err) {
      showNotice(`Erreur : ${err instanceof Error ? err.message : 'inconnue'}`, 'err')
    } finally {
      setSaving(null)
      void loadAll()
    }
  }

  async function refuseContract(contract: EnrichedContract) {
    if (!confirm('Refuser ce contrat ?')) return
    setSaving(contract.id)
    try {
      await updateAffretementContractByAffreteur(contract.id, { status: 'refuse', affreteurNote: null })
      showNotice('Contrat refusé.')
    } catch (err) {
      showNotice(`Erreur : ${err instanceof Error ? err.message : 'inconnue'}`, 'err')
    } finally {
      setSaving(null)
      void loadAll()
    }
  }

  // ── filtres ────────────────────────────────────────────────────────────────

  const filteredContracts = useMemo(() => {
    if (filterStatus === 'tous') return contracts
    return contracts.filter(c => c.status === filterStatus)
  }, [contracts, filterStatus])

  // Contrats de la semaine affichée (par date de chargement ou livraison)
  const weekContracts = useMemo(() => {
    const weekStart = isoDay(weekMonday)
    const weekEnd = isoDay(addDays(weekMonday, 6))
    return filteredContracts.filter(c => {
      const day = getOtDay(c)
      if (!day) return false
      return day >= weekStart && day <= weekEnd
    })
  }, [filteredContracts, weekMonday])

  // Pour la vue liste — contrats sans date ou hors semaine
  const undatedContracts = useMemo(
    () => filteredContracts.filter(c => !getOtDay(c) && (filterStatus === 'tous' || c.status === filterStatus)),
    [filteredContracts, filterStatus]
  )

  const onboarding = findAffreteurOnboardingForScope({
    profileId: profil?.id ?? null,
    email: user?.email ?? null,
  })

  // ── rendu ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
      </div>
    )
  }

  if (!onboarding) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
        <p className="text-2xl">🚚</p>
        <h2 className="text-lg font-semibold text-[color:var(--text)]">Aucun compte affréteur trouvé</h2>
        <p className="text-sm text-[color:var(--muted)] max-w-sm">
          Votre compte n'est pas encore rattaché à un dossier affréteur. Rendez-vous dans l'Espace Affréteur pour soumettre votre dossier.
        </p>
        <Link to="/portails" className="nx-button-primary rounded-xl px-4 py-2 text-sm">
          Aller dans l'Espace Affréteur
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* ── En-tête ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--text)]">Planning affréteur</h1>
          <p className="text-sm text-[color:var(--muted)]">{onboarding.companyName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/portails"
            className="rounded-xl border border-[color:var(--line)] px-3 py-1.5 text-xs font-medium text-[color:var(--text)] hover:bg-[color:var(--surface-soft)] transition-colors"
          >
            Espace Affréteur
          </Link>
          <button
            type="button"
            onClick={() => setViewMode(v => v === 'semaine' ? 'liste' : 'semaine')}
            className="rounded-xl border border-[color:var(--line)] px-3 py-1.5 text-xs font-medium text-[color:var(--text)] hover:bg-[color:var(--surface-soft)] transition-colors"
          >
            {viewMode === 'semaine' ? 'Vue liste' : 'Vue semaine'}
          </button>
        </div>
      </div>

      {/* ── Notice ── */}
      {notice && (
        <div className={`rounded-xl px-4 py-2 text-sm font-medium ${notice.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {notice.msg}
        </div>
      )}

      {/* ── Stats rapides ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['propose', 'accepte', 'en_cours', 'termine'] as const).map(status => {
          const count = contracts.filter(c => c.status === status).length
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(prev => prev === status ? 'tous' : status)}
              className={`rounded-xl border p-3 text-left transition-all ${filterStatus === status ? STATUS_BADGE[status] + ' ring-2 ring-offset-1 ring-current/30' : 'border-[color:var(--line)] bg-[color:var(--surface)] hover:bg-[color:var(--surface-soft)]'}`}
            >
              <p className="text-xl font-bold text-[color:var(--text)]">{count}</p>
              <p className="text-xs text-[color:var(--muted)]">{STATUS_LABEL[status]}</p>
            </button>
          )
        })}
      </div>

      {/* ── Vue Semaine ── */}
      {viewMode === 'semaine' && (
        <div className="space-y-3">
          {/* Navigation semaine */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setWeekOffset(o => o - 1)}
              className="rounded-lg border border-[color:var(--line)] px-2 py-1 text-sm hover:bg-[color:var(--surface-soft)] transition-colors"
              aria-label="Semaine précédente"
            >
              ‹
            </button>
            <span className="text-sm font-medium text-[color:var(--text)]">{fmtWeekRange(weekMonday)}</span>
            <button
              type="button"
              onClick={() => setWeekOffset(o => o + 1)}
              className="rounded-lg border border-[color:var(--line)] px-2 py-1 text-sm hover:bg-[color:var(--surface-soft)] transition-colors"
              aria-label="Semaine suivante"
            >
              ›
            </button>
            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="ml-1 text-xs text-[color:var(--primary)] underline underline-offset-2"
              >
                Aujourd'hui
              </button>
            )}
          </div>

          {/* Colonnes jours */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {weekDays.map((day, idx) => {
              const dayKey = isoDay(day)
              const dayContracts = weekContracts.filter(c => getOtDay(c) === dayKey)
              const isToday = dayKey === isoDay(new Date())
              return (
                <div
                  key={dayKey}
                  className={`rounded-xl border p-2 min-h-[80px] space-y-2 ${isToday ? 'border-[color:var(--primary)]/50 bg-[color:var(--primary)]/5' : 'border-[color:var(--line)] bg-[color:var(--surface)]'}`}
                >
                  <p className={`text-[11px] font-bold uppercase tracking-wide ${isToday ? 'text-[color:var(--primary)]' : 'text-[color:var(--muted)]'}`}>
                    {DAY_NAMES[idx]} {fmtDay(day).split(' ').slice(1).join(' ')}
                  </p>
                  {dayContracts.length === 0 ? (
                    <p className="text-[11px] text-[color:var(--muted)]">—</p>
                  ) : (
                    dayContracts.map(c => (
                      <ContractCard
                        key={c.id}
                        contract={c}
                        compact
                        isSaving={saving === c.id}
                        onMarkNext={() => void markNextStep(c)}
                        onAccept={() => void acceptContract(c)}
                        onRefuse={() => void refuseContract(c)}
                      />
                    ))
                  )}
                </div>
              )
            })}
          </div>

          {/* Missions non datées ou hors semaine */}
          {undatedContracts.length > 0 && (
            <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-3 space-y-2">
              <p className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">Sans date planifiée</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {undatedContracts.map(c => (
                  <ContractCard
                    key={c.id}
                    contract={c}
                    compact={false}
                    isSaving={saving === c.id}
                    onMarkNext={() => void markNextStep(c)}
                    onAccept={() => void acceptContract(c)}
                    onRefuse={() => void refuseContract(c)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Vue Liste ── */}
      {viewMode === 'liste' && (
        <div className="space-y-2">
          {filteredContracts.length === 0 && (
            <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-8 text-center text-sm text-[color:var(--muted)]">
              Aucun contrat trouvé.
            </div>
          )}
          {filteredContracts.map(c => (
            <ContractCard
              key={c.id}
              contract={c}
              compact={false}
              isSaving={saving === c.id}
              onMarkNext={() => void markNextStep(c)}
              onAccept={() => void acceptContract(c)}
              onRefuse={() => void refuseContract(c)}
            />
          ))}
        </div>
      )}

      {/* ── Ressources disponibles ── */}
      {(drivers.length > 0 || vehicles.length > 0) && (
        <details className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)]">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-[color:var(--text)]">
            Ressources disponibles ({drivers.filter(d => d.active).length} conducteurs · {vehicles.filter(v => v.active).length} véhicules)
          </summary>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Conducteurs actifs</p>
              <div className="space-y-1">
                {drivers.filter(d => d.active).map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-sm text-[color:var(--text)]">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    {d.fullName}
                    {d.phone && <span className="text-xs text-[color:var(--muted)]">· {d.phone}</span>}
                  </div>
                ))}
                {drivers.filter(d => d.active).length === 0 && (
                  <p className="text-sm text-[color:var(--muted)]">Aucun conducteur actif</p>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Véhicules actifs</p>
              <div className="space-y-1">
                {vehicles.filter(v => v.active).map(v => (
                  <div key={v.id} className="flex items-center gap-2 text-sm text-[color:var(--text)]">
                    <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                    {v.plate}
                    {v.brand && <span className="text-xs text-[color:var(--muted)]">· {v.brand} {v.model ?? ''}</span>}
                  </div>
                ))}
                {vehicles.filter(v => v.active).length === 0 && (
                  <p className="text-sm text-[color:var(--muted)]">Aucun véhicule actif</p>
                )}
              </div>
            </div>
          </div>
        </details>
      )}
    </div>
  )
}

// ─── ContractCard ─────────────────────────────────────────────────────────────

type ContractCardProps = {
  contract: EnrichedContract
  compact: boolean
  isSaving: boolean
  onMarkNext: () => void
  onAccept: () => void
  onRefuse: () => void
}

function ContractCard({ contract: c, compact, isSaving, onMarkNext, onAccept, onRefuse }: ContractCardProps) {
  const flowLength = AFFRETEMENT_REQUIRED_OPERATIONAL_FLOW.length

  return (
    <div className={`rounded-xl border bg-[color:var(--surface)] overflow-hidden ${compact ? 'text-xs' : 'text-sm'}`}
      style={{ borderColor: c.status === 'termine' ? 'rgba(100,116,139,0.2)' : c.status === 'en_cours' ? 'rgba(16,185,129,0.35)' : 'var(--line)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[color:var(--line)]">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[10px] shrink-0 ${STATUS_BADGE[c.status]}`}>
            {STATUS_LABEL[c.status]}
          </span>
          <span className="truncate font-mono font-semibold text-[color:var(--text)]">
            {c.ot?.reference ?? c.otId.slice(0, 8)}
          </span>
        </div>
        {c.ot?.clientName && (
          <span className="truncate text-[color:var(--muted)] text-[10px] shrink-0 max-w-[100px]">{c.ot.clientName}</span>
        )}
      </div>

      <div className={`px-3 py-2 space-y-1.5 ${compact ? '' : 'py-3 space-y-2'}`}>
        {/* Adresses */}
        {(c.ot?.pickupLabel || c.ot?.deliveryLabel) && (
          <div className="flex flex-col gap-0.5">
            {c.ot?.pickupLabel && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 shrink-0">CH</span>
                <span className="truncate text-[color:var(--text)]">{c.ot.pickupLabel}</span>
                <span className="text-[color:var(--muted)] shrink-0">{fmtTime(c.ot.pickupAt)}</span>
              </div>
            )}
            {c.ot?.deliveryLabel && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wide text-blue-600 shrink-0">LV</span>
                <span className="truncate text-[color:var(--text)]">{c.ot.deliveryLabel}</span>
                <span className="text-[color:var(--muted)] shrink-0">{fmtDate(c.ot.deliveryAt)}</span>
              </div>
            )}
          </div>
        )}

        {/* Conducteur / véhicule */}
        {(c.driverName || c.vehiclePlate) && (
          <div className="flex flex-wrap gap-2">
            {c.driverName && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] text-[color:var(--text)]">
                🧑‍✈️ {c.driverName}
              </span>
            )}
            {c.vehiclePlate && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--surface-soft)] px-2 py-0.5 text-[10px] text-[color:var(--text)]">
                🚚 {c.vehiclePlate}
              </span>
            )}
          </div>
        )}

        {/* Progression opérationnelle */}
        {(c.status === 'accepte' || c.status === 'en_cours') && (
          <div className="space-y-1">
            {/* Barre de progression */}
            <div className="flex items-center gap-0.5">
              {AFFRETEMENT_REQUIRED_OPERATIONAL_FLOW.map(step => {
                const done = c.doneKeys.has(step)
                const isNext = step === c.nextStep
                return (
                  <div
                    key={step}
                    title={AFFRETEMENT_OPERATIONAL_STATUS_LABELS[step]}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${done ? 'bg-emerald-500' : isNext ? 'bg-amber-400' : 'bg-[color:var(--line)]'}`}
                  />
                )
              })}
            </div>
            {/* Libellé étape */}
            <p className="text-[10px] text-[color:var(--muted)]">
              {c.doneKeys.size}/{flowLength} étapes
              {c.nextStep && ` · Prochaine : ${AFFRETEMENT_OPERATIONAL_STATUS_LABELS[c.nextStep]}`}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {/* Accepter / refuser si proposé */}
          {c.status === 'propose' && (
            <>
              <button
                type="button"
                disabled={isSaving}
                onClick={onAccept}
                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                Accepter
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={onRefuse}
                className="rounded-lg border border-red-300 px-2.5 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Refuser
              </button>
            </>
          )}

          {/* Marquer étape suivante */}
          {(c.status === 'accepte' || c.status === 'en_cours') && c.nextStep && (
            <button
              type="button"
              disabled={isSaving}
              onClick={onMarkNext}
              className="rounded-lg bg-[color:var(--primary)] px-2.5 py-1 text-[10px] font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSaving ? '…' : `Marquer : ${AFFRETEMENT_OPERATIONAL_STATUS_LABELS[c.nextStep]}`}
            </button>
          )}

          {/* Terminé */}
          {c.status === 'termine' && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] text-slate-500">
              ✅ Mission terminée
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
