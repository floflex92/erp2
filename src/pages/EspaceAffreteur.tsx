import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import {
  AFFRETEMENT_OPERATIONAL_STATUS_LABELS,
  AFFRETEMENT_REQUIRED_OPERATIONAL_FLOW,
  AFFRETEUR_EMPLOYEE_PERMISSION_OPTIONS,
  evaluateAffretementCompletionReadiness,
  findAffreteurOnboardingForScope,
  listAffretementContractsByOnboarding,
  listAffreteurDrivers,
  listAffreteurEmployees,
  listAffreteurEquipments,
  listAffreteurVehicles,
  setAffreteurDriverActive,
  setAffreteurEmployeeActive,
  setAffreteurEquipmentActive,
  setAffreteurVehicleActive,
  submitAffreteurOnboarding,
  syncAffreteurOnboardingSharedFlow,
  subscribeAffretementPortalUpdates,
  upsertAffretementOperationalUpdate,
  updateAffretementContractByAffreteur,
  upsertAffreteurDriver,
  upsertAffreteurEmployee,
  upsertAffreteurEquipment,
  upsertAffreteurVehicle,
  type AffretementContract,
  type AffretementOperationalStatusKey,
  type AffreteurDriver,
  type AffreteurEmployeeAccount,
  type AffreteurEquipment,
  type AffreteurOnboardingRecord,
  type AffreteurOnboardingStatus,
  type AffreteurVehicle,
} from '@/lib/affretementPortal'

type OtContractDetails = {
  id: string
  reference: string
  clientName: string
  pickupAt: string | null
  deliveryAt: string | null
  goods: string | null
  distanceKm: number | null
  instructions: string | null
}

type ManagementTab = 'comptes' | 'conducteurs' | 'vehicules' | 'equipements'
type PortalTab = 'contrats' | 'management'

const ONBOARDING_STATUS_LABELS: Record<AffreteurOnboardingStatus, string> = {
  en_verification_commerciale: 'En verification commerciale',
  en_verification_comptable: 'En verification comptable',
  validee: 'Validee',
  refusee: 'Refusee',
}

const CONTRACT_STATUS_LABELS: Record<AffretementContract['status'], string> = {
  propose: 'Propose a l affreteur',
  accepte: 'Accepte',
  refuse: 'Refuse',
  en_cours: 'En cours',
  termine: 'Termine',
  annule: 'Annule',
}

function onboardingStatusClass(status: AffreteurOnboardingStatus) {
  if (status === 'validee') return 'nx-status-success'
  if (status === 'refusee') return 'nx-status-error'
  return 'nx-status-warning'
}

function contractStatusClass(status: AffretementContract['status']) {
  if (status === 'accepte' || status === 'termine') return 'nx-status-success'
  if (status === 'refuse' || status === 'annule') return 'nx-status-error'
  return 'nx-status-warning'
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('fr-FR')
}

export default function EspaceAffreteur() {
  const { profil, user } = useAuth()

  const [tab, setTab] = useState<PortalTab>('contrats')
  const [managementTab, setManagementTab] = useState<ManagementTab>('comptes')

  const [onboarding, setOnboarding] = useState<AffreteurOnboardingRecord | null>(null)
  const [contracts, setContracts] = useState<AffretementContract[]>([])
  const [employees, setEmployees] = useState<AffreteurEmployeeAccount[]>([])
  const [drivers, setDrivers] = useState<AffreteurDriver[]>([])
  const [vehicles, setVehicles] = useState<AffreteurVehicle[]>([])
  const [equipments, setEquipments] = useState<AffreteurEquipment[]>([])

  const [contractDetails, setContractDetails] = useState<Record<string, OtContractDetails>>({})

  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [onboardingForm, setOnboardingForm] = useState({
    companyName: '',
    siret: '',
    vatNumber: '',
    contactEmail: profil?.email ?? '',
    contactPhone: '',
    billingAddress: '',
    operationAddress: '',
  })

  const [employeeForm, setEmployeeForm] = useState({
    fullName: '',
    email: '',
    role: 'gestionnaire' as 'gestionnaire' | 'conducteur_affreteur',
    permissions: ['contrats:read', 'contrats:update'] as string[],
  })

  const [driverForm, setDriverForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    licenseNumber: '',
  })

  const [vehicleForm, setVehicleForm] = useState({
    plate: '',
    brand: '',
    model: '',
    capacityKg: '',
  })

  const [equipmentForm, setEquipmentForm] = useState({
    label: '',
    kind: '',
    serialNumber: '',
  })

  const [contractDrafts, setContractDrafts] = useState<Record<string, { driverId: string; vehicleId: string; equipmentIds: string[]; note: string }>>({})

  function reload(profileId: string, email: string | null | undefined) {
    const current = findAffreteurOnboardingForScope({ profileId, email })
    setOnboarding(current)
    if (!current) {
      setContracts([])
      setEmployees([])
      setDrivers([])
      setVehicles([])
      setEquipments([])
      setContractDetails({})
      return
    }

    setContracts(listAffretementContractsByOnboarding(current.id))
    setEmployees(listAffreteurEmployees(current.id))
    setDrivers(listAffreteurDrivers(current.id))
    setVehicles(listAffreteurVehicles(current.id))
    setEquipments(listAffreteurEquipments(current.id))
  }

  useEffect(() => {
    if (!profil?.id) return
    reload(profil.id, user?.email)
    const unsubscribe = subscribeAffretementPortalUpdates(() => reload(profil.id, user?.email))
    return unsubscribe
  }, [profil?.id, user?.email])

  const onboardingId = onboarding?.id ?? null
  const onboardingStatus = onboarding?.status ?? null

  useEffect(() => {
    if (!onboardingId || onboardingStatus !== 'validee') return
    void syncAffreteurOnboardingSharedFlow(onboardingId).then(() => {
      if (profil?.id) reload(profil.id, user?.email)
    })
  }, [onboardingId, onboardingStatus, profil?.id, user?.email])

  useEffect(() => {
    const ids = Array.from(new Set(contracts.map(item => item.otId)))
    if (ids.length === 0) {
      setContractDetails({})
      return
    }

    let active = true
    void (async () => {
      const { data } = await supabase
        .from('ordres_transport')
        .select('id, reference, client_id, date_chargement_prevue, date_livraison_prevue, nature_marchandise, distance_km, instructions, clients!ordres_transport_client_id_fkey(nom)')
        .in('id', ids)

      if (!active) return

      type OtContractDetailRow = {
        id: string
        reference: string
        clients: { nom: string } | { nom: string }[] | null
        date_chargement_prevue: string | null
        date_livraison_prevue: string | null
        nature_marchandise: string | null
        distance_km: number | null
        instructions: string | null
      }

      const next: Record<string, OtContractDetails> = {}
      for (const row of (data ?? []) as OtContractDetailRow[]) {
        next[row.id] = {
          id: row.id,
          reference: row.reference,
          clientName: (Array.isArray(row.clients) ? row.clients[0] : row.clients)?.nom ?? 'Client non renseigne',
          pickupAt: row.date_chargement_prevue,
          deliveryAt: row.date_livraison_prevue,
          goods: row.nature_marchandise,
          distanceKm: row.distance_km,
          instructions: row.instructions,
        }
      }
      setContractDetails(next)
    })()

    return () => {
      active = false
    }
  }, [contracts])

  const canUsePortal = onboardingStatus === 'validee'

  const activeContracts = useMemo(
    () => contracts.filter(item => item.status === 'propose' || item.status === 'accepte' || item.status === 'en_cours').length,
    [contracts],
  )

  function resetEmployeeForm() {
    setEmployeeForm({
      fullName: '',
      email: '',
      role: 'gestionnaire',
      permissions: ['contrats:read', 'contrats:update'],
    })
  }

  function submitOnboarding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profil?.id) return

    if (!onboardingForm.companyName.trim() || !onboardingForm.siret.trim() || !onboardingForm.contactEmail.trim() || !onboardingForm.billingAddress.trim()) {
      setError('Complete entreprise, SIRET, email et adresse de facturation.')
      return
    }

    const next = submitAffreteurOnboarding({
      ownerProfileId: profil.id,
      companyName: onboardingForm.companyName,
      siret: onboardingForm.siret,
      vatNumber: onboardingForm.vatNumber,
      contactEmail: onboardingForm.contactEmail,
      contactPhone: onboardingForm.contactPhone,
      billingAddress: onboardingForm.billingAddress,
      operationAddress: onboardingForm.operationAddress,
    })

    setOnboarding(next)
    setError(null)
    setNotice('Inscription affreteur envoyee au commercial puis au comptable.')
  }

  function submitEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onboarding || onboarding.status !== 'validee') return

    if (!employeeForm.fullName.trim() || !employeeForm.email.trim()) {
      setError('Nom complet et email sont obligatoires pour le compte employe.')
      return
    }

    upsertAffreteurEmployee({
      onboardingId: onboarding.id,
      fullName: employeeForm.fullName,
      email: employeeForm.email,
      role: employeeForm.role,
      permissions: employeeForm.permissions,
    })

    setError(null)
    setNotice('Compte employe enregistre.')
    resetEmployeeForm()
  }

  function submitDriver(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onboarding || onboarding.status !== 'validee') return

    if (!driverForm.fullName.trim() || !driverForm.email.trim()) {
      setError('Nom complet et email conducteur sont obligatoires.')
      return
    }

    upsertAffreteurDriver({
      onboardingId: onboarding.id,
      fullName: driverForm.fullName,
      email: driverForm.email,
      phone: driverForm.phone,
      licenseNumber: driverForm.licenseNumber,
    })

    setDriverForm({ fullName: '', email: '', phone: '', licenseNumber: '' })
    setError(null)
    setNotice('Conducteur affreteur enregistre.')
  }

  function submitVehicle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onboarding || onboarding.status !== 'validee') return

    if (!vehicleForm.plate.trim()) {
      setError('Immatriculation camion obligatoire.')
      return
    }

    upsertAffreteurVehicle({
      onboardingId: onboarding.id,
      plate: vehicleForm.plate,
      brand: vehicleForm.brand,
      model: vehicleForm.model,
      capacityKg: vehicleForm.capacityKg ? Number(vehicleForm.capacityKg) : null,
    })

    setVehicleForm({ plate: '', brand: '', model: '', capacityKg: '' })
    setError(null)
    setNotice('Poids lourd affreteur enregistre.')
  }

  function submitEquipment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onboarding || onboarding.status !== 'validee') return

    if (!equipmentForm.label.trim() || !equipmentForm.kind.trim()) {
      setError('Libelle et type equipement sont obligatoires.')
      return
    }

    upsertAffreteurEquipment({
      onboardingId: onboarding.id,
      label: equipmentForm.label,
      kind: equipmentForm.kind,
      serialNumber: equipmentForm.serialNumber,
    })

    setEquipmentForm({ label: '', kind: '', serialNumber: '' })
    setError(null)
    setNotice('Equipement affreteur enregistre.')
  }

  function toggleEmployeePermission(permission: string) {
    setEmployeeForm(current => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter(item => item !== permission)
        : [...current.permissions, permission],
    }))
  }

  async function actOnContract(contract: AffretementContract, decision: 'accept' | 'reject' | 'set_in_progress' | 'set_done') {
    if (!onboarding) return

    const draft = contractDrafts[contract.id] ?? { driverId: '', vehicleId: '', equipmentIds: [], note: '' }
    const actor = [profil?.prenom, profil?.nom].filter(Boolean).join(' ') || 'Affreteur'

    const updated = updateAffretementContractByAffreteur({
      contractId: contract.id,
      onboardingId: onboarding.id,
      actorName: actor,
      decision,
      note: draft.note,
      driverId: draft.driverId || null,
      vehicleId: draft.vehicleId || null,
      equipmentIds: draft.equipmentIds,
    })

    if (!updated) {
      setError('Action impossible sur ce contrat affrete.')
      return
    }

    setError(null)
    setNotice('Mise a jour contrat enregistree.')
  }

  function setContractDraftValue(contractId: string, patch: Partial<{ driverId: string; vehicleId: string; equipmentIds: string[]; note: string }>) {
    setContractDrafts(current => ({
      ...current,
      [contractId]: {
        driverId: patch.driverId ?? current[contractId]?.driverId ?? '',
        vehicleId: patch.vehicleId ?? current[contractId]?.vehicleId ?? '',
        equipmentIds: patch.equipmentIds ?? current[contractId]?.equipmentIds ?? [],
        note: patch.note ?? current[contractId]?.note ?? '',
      },
    }))
  }

  function toggleContractEquipment(contractId: string, equipmentId: string) {
    const current = contractDrafts[contractId]?.equipmentIds ?? []
    const next = current.includes(equipmentId)
      ? current.filter(item => item !== equipmentId)
      : [...current, equipmentId]
    setContractDraftValue(contractId, { equipmentIds: next })
  }

  async function readGpsPoint() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return { gpsLat: null, gpsLng: null, hasGps: false }
    }

    return new Promise<{ gpsLat: number | null; gpsLng: number | null; hasGps: boolean }>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        position => resolve({
          gpsLat: Number(position.coords.latitude.toFixed(6)),
          gpsLng: Number(position.coords.longitude.toFixed(6)),
          hasGps: true,
        }),
        () => resolve({ gpsLat: null, gpsLng: null, hasGps: false }),
        { enableHighAccuracy: true, timeout: 6500, maximumAge: 0 },
      )
    })
  }

  async function registerOperationalStatus(contract: AffretementContract, key: AffretementOperationalStatusKey) {
    if (!onboarding) return
    const draft = contractDrafts[contract.id] ?? { driverId: '', vehicleId: '', equipmentIds: [], note: '' }
    const actor = [profil?.prenom, profil?.nom].filter(Boolean).join(' ') || 'Affreteur'
    const geo = await readGpsPoint()

    const updated = upsertAffretementOperationalUpdate({
      contractId: contract.id,
      onboardingId: onboarding.id,
      actorName: actor,
      key,
      note: draft.note,
      gpsLat: geo.gpsLat,
      gpsLng: geo.gpsLng,
    })

    if (!updated) {
      setError('Impossible d enregistrer ce statut operationnel.')
      return
    }

    setError(null)
    setNotice(
      geo.hasGps
        ? `Statut ${AFFRETEMENT_OPERATIONAL_STATUS_LABELS[key]} enregistre avec preuve GPS.`
        : `Statut ${AFFRETEMENT_OPERATIONAL_STATUS_LABELS[key]} enregistre (GPS indisponible).`,
    )
  }

  return (
    <div className="space-y-5 p-5 md:p-6">
      <div className="nx-panel px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Partenaires affretes</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Espace affreteur</h2>
        <p className="mt-1.5 max-w-3xl text-sm text-slate-600">Inscription entreprise, gestion des moyens affretes et suivi des contrats de sous-traitance.</p>
      </div>

      {error && <div className="nx-status-error rounded-2xl border border-red-200 px-4 py-3 text-sm">{error}</div>}
      {notice && <div className="nx-status-success rounded-2xl border border-green-200 px-4 py-3 text-sm">{notice}</div>}
      <div className="nx-status-warning rounded-2xl border border-amber-200 px-4 py-3 text-sm">
        Regle societe mere: un affreteur ne cree pas directement d OT. Pour proposer une course a la societe mere, utilisez un compte client dedie.
      </div>

      {!onboarding && (
        <div className="nx-panel p-5">
          <h3 className="text-lg font-semibold text-slate-950">Inscription entreprise affreteur</h3>
          <form onSubmit={submitOnboarding} className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Nom entreprise"><input value={onboardingForm.companyName} onChange={event => setOnboardingForm(current => ({ ...current, companyName: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
            <Field label="SIRET"><input value={onboardingForm.siret} onChange={event => setOnboardingForm(current => ({ ...current, siret: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
            <Field label="TVA intracom"><input value={onboardingForm.vatNumber} onChange={event => setOnboardingForm(current => ({ ...current, vatNumber: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
            <Field label="Email contact"><input type="email" value={onboardingForm.contactEmail} onChange={event => setOnboardingForm(current => ({ ...current, contactEmail: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
            <Field label="Telephone contact"><input value={onboardingForm.contactPhone} onChange={event => setOnboardingForm(current => ({ ...current, contactPhone: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
            <Field label="Adresse operation"><input value={onboardingForm.operationAddress} onChange={event => setOnboardingForm(current => ({ ...current, operationAddress: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
            <div className="md:col-span-2"><Field label="Adresse facturation"><input value={onboardingForm.billingAddress} onChange={event => setOnboardingForm(current => ({ ...current, billingAddress: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field></div>
            <div className="md:col-span-2 flex justify-end"><button type="submit" className="nx-button-primary rounded-xl px-4 py-2 text-sm font-medium">Envoyer le dossier</button></div>
          </form>
        </div>
      )}

      {onboarding && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Entreprise" value={onboarding.companyName} detail={onboarding.siret} />
            <MetricCard label="Statut dossier" value={ONBOARDING_STATUS_LABELS[onboarding.status]} detail="Validation CRM" badgeClass={onboardingStatusClass(onboarding.status)} />
            <MetricCard label="Contrats actifs" value={String(activeContracts)} detail="Bourse du fret" />
            <MetricCard label="Moyens declares" value={`${drivers.length} cond. / ${vehicles.length} PL`} detail={`${equipments.length} equipements`} />
          </div>

          <div className="nx-panel overflow-hidden">
            <div className="border-b px-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex flex-wrap gap-4">
                {[{ key: 'contrats', label: 'Contrats affretes' }, { key: 'management', label: 'Management' }].map(item => {
                  const active = tab === item.key
                  return (
                    <button key={item.key} type="button" onClick={() => setTab(item.key as PortalTab)} className={`px-1 py-3 text-sm font-semibold ${active ? 'nx-tab nx-tab-active' : 'nx-tab hover:text-slate-700'}`}>
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {tab === 'contrats' && (
              <div className="p-5 space-y-3">
                {!canUsePortal && <div className="nx-status-warning rounded-xl border border-amber-200 px-3 py-2 text-sm">Le dossier doit etre valide avant activation des contrats.</div>}
                {contracts.length === 0 && <p className="text-sm text-slate-500">Aucun contrat d affretement pour le moment.</p>}

                {contracts.map(contract => {
                  const details = contractDetails[contract.otId]
                  const draft = contractDrafts[contract.id] ?? { driverId: '', vehicleId: '', equipmentIds: [], note: '' }
                  const readiness = evaluateAffretementCompletionReadiness(contract)
                  const doneKeys = new Set(readiness.doneKeys)

                  return (
                    <div key={contract.id} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{details?.reference ?? contract.otId}</p>
                          <p className="text-xs text-slate-500">{details?.clientName ?? 'Client non renseigne'}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${contractStatusClass(contract.status)}`}>{CONTRACT_STATUS_LABELS[contract.status]}</span>
                      </div>

                      <div className="mt-2 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                        <p>Chargement: {formatDate(details?.pickupAt ?? null)}</p>
                        <p>Livraison: {formatDate(details?.deliveryAt ?? null)}</p>
                        <p>Marchandise: {details?.goods ?? '-'}</p>
                        <p>Distance: {details?.distanceKm ? `${details.distanceKm} km` : '-'}</p>
                      </div>

                      {details?.instructions && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Instructions: {details.instructions}</p>}
                      {contract.exploitationNote && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Note exploitation: {contract.exploitationNote}</p>}
                      {contract.affreteurNote && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Note affreteur: {contract.affreteurNote}</p>}
                      <div className="mt-2 rounded-xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)' }}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Checklist statut obligatoire</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {AFFRETEMENT_REQUIRED_OPERATIONAL_FLOW.map(key => (
                            <span
                              key={key}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${doneKeys.has(key) ? 'nx-status-success' : 'nx-status-warning'}`}
                            >
                              {AFFRETEMENT_OPERATIONAL_STATUS_LABELS[key]}
                            </span>
                          ))}
                        </div>
                        <p className={`mt-2 text-xs font-medium ${readiness.readyForCompletion ? 'text-green-700' : 'text-amber-700'}`}>
                          {readiness.readyForCompletion
                            ? 'Course complete: facturation et cloture autorisees.'
                            : 'Course incomplete: la course reste en cours et la facturation est bloquee.'}
                        </p>
                      </div>

                      {canUsePortal && (
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <Field label="Conducteur affreteur">
                            <select value={draft.driverId} onChange={event => setContractDraftValue(contract.id, { driverId: event.target.value })} className="w-full rounded-xl px-3 py-2 text-sm">
                              <option value="">Non affecte</option>
                              {drivers.filter(item => item.active).map(driver => (
                                <option key={driver.id} value={driver.id}>[AFF] {driver.fullName}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Poids lourd affreteur">
                            <select value={draft.vehicleId} onChange={event => setContractDraftValue(contract.id, { vehicleId: event.target.value })} className="w-full rounded-xl px-3 py-2 text-sm">
                              <option value="">Non affecte</option>
                              {vehicles.filter(item => item.active).map(vehicle => (
                                <option key={vehicle.id} value={vehicle.id}>[AFF] {vehicle.plate}{vehicle.brand ? ` - ${vehicle.brand}` : ''}</option>
                              ))}
                            </select>
                          </Field>
                          <div className="md:col-span-2">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Equipements</p>
                            <div className="space-y-1 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)' }}>
                              {equipments.filter(item => item.active).length === 0 && <p className="text-xs text-slate-500">Aucun equipement actif.</p>}
                              {equipments.filter(item => item.active).map(item => (
                                <label key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
                                  <input type="checkbox" checked={draft.equipmentIds.includes(item.id)} onChange={() => toggleContractEquipment(contract.id, item.id)} />
                                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">AFF</span>
                                  {item.label} ({item.kind})
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <Field label="Note affreteur">
                              <textarea value={draft.note} onChange={event => setContractDraftValue(contract.id, { note: event.target.value })} className="w-full rounded-xl px-3 py-2 text-sm" rows={2} />
                            </Field>
                          </div>
                        </div>
                      )}

                      {canUsePortal && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {AFFRETEMENT_REQUIRED_OPERATIONAL_FLOW.map(key => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => void registerOperationalStatus(contract, key)}
                              className={`rounded-xl px-3 py-1.5 text-xs font-medium ${
                                doneKeys.has(key) ? 'nx-button-secondary' : 'nx-button-primary'
                              }`}
                            >
                              {doneKeys.has(key) ? `Maj ${AFFRETEMENT_OPERATIONAL_STATUS_LABELS[key]}` : AFFRETEMENT_OPERATIONAL_STATUS_LABELS[key]}
                            </button>
                          ))}
                          {contract.status === 'propose' && (
                            <>
                              <button type="button" onClick={() => void actOnContract(contract, 'accept')} className="nx-button-primary rounded-xl px-3 py-1.5 text-xs font-medium">Accepter</button>
                              <button type="button" onClick={() => void actOnContract(contract, 'reject')} className="nx-button-secondary rounded-xl px-3 py-1.5 text-xs font-medium">Refuser</button>
                            </>
                          )}
                          {(contract.status === 'accepte' || contract.status === 'en_cours') && (
                            <>
                              <button type="button" onClick={() => void actOnContract(contract, 'set_in_progress')} className="nx-button-secondary rounded-xl px-3 py-1.5 text-xs font-medium">Passer en cours</button>
                              <button type="button" disabled={!readiness.readyForCompletion} onClick={() => void actOnContract(contract, 'set_done')} className="nx-button-primary rounded-xl px-3 py-1.5 text-xs font-medium disabled:opacity-50">
                                {readiness.readyForCompletion ? 'Marquer termine' : 'Termine (bloque)'}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'management' && (
              <div className="p-5 space-y-4">
                {!canUsePortal && <div className="nx-status-warning rounded-xl border border-amber-200 px-3 py-2 text-sm">Management active apres validation du dossier.</div>}

                <div className="flex flex-wrap gap-3 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  {[{ key: 'comptes', label: 'Comptes employes' }, { key: 'conducteurs', label: 'Conducteurs' }, { key: 'vehicules', label: 'Poids lourds' }, { key: 'equipements', label: 'Equipements' }].map(item => {
                    const active = managementTab === item.key
                    return (
                      <button key={item.key} type="button" onClick={() => setManagementTab(item.key as ManagementTab)} className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${active ? 'bg-[color:var(--primary)] text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {item.label}
                      </button>
                    )
                  })}
                </div>

                {managementTab === 'comptes' && (
                  <div className="space-y-3">
                    <form onSubmit={submitEmployee} className="grid gap-4 md:grid-cols-2">
                      <Field label="Nom complet"><input value={employeeForm.fullName} onChange={event => setEmployeeForm(current => ({ ...current, fullName: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                      <Field label="Email"><input type="email" value={employeeForm.email} onChange={event => setEmployeeForm(current => ({ ...current, email: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                      <Field label="Role employe">
                        <select value={employeeForm.role} onChange={event => setEmployeeForm(current => ({ ...current, role: event.target.value as 'gestionnaire' | 'conducteur_affreteur' }))} className="w-full rounded-xl px-3 py-2 text-sm">
                          <option value="gestionnaire">Gestionnaire</option>
                          <option value="conducteur_affreteur">Conducteur affreteur</option>
                        </select>
                      </Field>
                      <div className="md:col-span-2">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Droits du compte</p>
                        <div className="space-y-1 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)' }}>
                          {AFFRETEUR_EMPLOYEE_PERMISSION_OPTIONS.map(option => (
                            <label key={option.key} className="flex items-center gap-2 text-sm text-slate-700">
                              <input type="checkbox" checked={employeeForm.permissions.includes(option.key)} onChange={() => toggleEmployeePermission(option.key)} />
                              {option.label}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="md:col-span-2 flex justify-end"><button type="submit" disabled={!canUsePortal} className="nx-button-primary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">Enregistrer compte</button></div>
                    </form>

                    <div className="space-y-2">
                      {employees.length === 0 && <p className="text-sm text-slate-500">Aucun compte employe.</p>}
                      {employees.map(employee => (
                        <div key={employee.id} className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-950 flex items-center gap-2">
                                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">AFF</span>
                                {employee.fullName}
                              </p>
                              <p className="text-xs text-slate-500">{employee.email} - {employee.role === 'conducteur_affreteur' ? 'Conducteur affreteur' : 'Gestionnaire'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${employee.active ? 'nx-status-success' : 'nx-status-error'}`}>{employee.active ? 'Actif' : 'Desactive'}</span>
                              <button type="button" onClick={() => setAffreteurEmployeeActive(employee.id, !employee.active)} className="text-xs font-semibold text-slate-600 hover:text-slate-900">{employee.active ? 'Desactiver' : 'Activer'}</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {managementTab === 'conducteurs' && (
                  <div className="space-y-3">
                    <form onSubmit={submitDriver} className="grid gap-4 md:grid-cols-2">
                      <Field label="Nom complet"><input value={driverForm.fullName} onChange={event => setDriverForm(current => ({ ...current, fullName: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                      <Field label="Email"><input type="email" value={driverForm.email} onChange={event => setDriverForm(current => ({ ...current, email: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                      <Field label="Telephone"><input value={driverForm.phone} onChange={event => setDriverForm(current => ({ ...current, phone: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                      <Field label="Permis"><input value={driverForm.licenseNumber} onChange={event => setDriverForm(current => ({ ...current, licenseNumber: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                      <div className="md:col-span-2 flex justify-end"><button type="submit" disabled={!canUsePortal} className="nx-button-primary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">Enregistrer conducteur</button></div>
                    </form>

                    <div className="space-y-2">
                      {drivers.length === 0 && <p className="text-sm text-slate-500">Aucun conducteur affreteur.</p>}
                      {drivers.map(driver => (
                        <div key={driver.id} className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">{driver.fullName}</p>
                              <p className="text-xs text-slate-500">{driver.email}{driver.phone ? ` - ${driver.phone}` : ''}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${driver.active ? 'nx-status-success' : 'nx-status-error'}`}>{driver.active ? 'Actif' : 'Desactive'}</span>
                              <button type="button" onClick={() => setAffreteurDriverActive(driver.id, !driver.active)} className="text-xs font-semibold text-slate-600 hover:text-slate-900">{driver.active ? 'Desactiver' : 'Activer'}</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {managementTab === 'vehicules' && (
                  <div className="space-y-3">
                    <form onSubmit={submitVehicle} className="grid gap-4 md:grid-cols-2">
                      <Field label="Immatriculation"><input value={vehicleForm.plate} onChange={event => setVehicleForm(current => ({ ...current, plate: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                      <Field label="Marque"><input value={vehicleForm.brand} onChange={event => setVehicleForm(current => ({ ...current, brand: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                      <Field label="Modele"><input value={vehicleForm.model} onChange={event => setVehicleForm(current => ({ ...current, model: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                      <Field label="Capacite kg"><input type="number" value={vehicleForm.capacityKg} onChange={event => setVehicleForm(current => ({ ...current, capacityKg: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                      <div className="md:col-span-2 flex justify-end"><button type="submit" disabled={!canUsePortal} className="nx-button-primary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">Enregistrer poids lourd</button></div>
                    </form>

                    <div className="space-y-2">
                      {vehicles.length === 0 && <p className="text-sm text-slate-500">Aucun poids lourd affreteur.</p>}
                      {vehicles.map(vehicle => (
                        <div key={vehicle.id} className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">{vehicle.plate}</p>
                              <p className="text-xs text-slate-500">{[vehicle.brand, vehicle.model].filter(Boolean).join(' - ') || 'Vehicule'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${vehicle.active ? 'nx-status-success' : 'nx-status-error'}`}>{vehicle.active ? 'Actif' : 'Desactive'}</span>
                              <button type="button" onClick={() => setAffreteurVehicleActive(vehicle.id, !vehicle.active)} className="text-xs font-semibold text-slate-600 hover:text-slate-900">{vehicle.active ? 'Desactiver' : 'Activer'}</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {managementTab === 'equipements' && (
                  <div className="space-y-3">
                    <form onSubmit={submitEquipment} className="grid gap-4 md:grid-cols-2">
                      <Field label="Libelle equipement"><input value={equipmentForm.label} onChange={event => setEquipmentForm(current => ({ ...current, label: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                      <Field label="Type"><input value={equipmentForm.kind} onChange={event => setEquipmentForm(current => ({ ...current, kind: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                      <Field label="Numero serie"><input value={equipmentForm.serialNumber} onChange={event => setEquipmentForm(current => ({ ...current, serialNumber: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                      <div className="md:col-span-2 flex justify-end"><button type="submit" disabled={!canUsePortal} className="nx-button-primary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">Enregistrer equipement</button></div>
                    </form>

                    <div className="space-y-2">
                      {equipments.length === 0 && <p className="text-sm text-slate-500">Aucun equipement affreteur.</p>}
                      {equipments.map(item => (
                        <div key={item.id} className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-950 flex items-center gap-2">
                                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">AFF</span>
                                {item.label}
                              </p>
                              <p className="text-xs text-slate-500">{item.kind}{item.serialNumber ? ` - ${item.serialNumber}` : ''}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.active ? 'nx-status-success' : 'nx-status-error'}`}>{item.active ? 'Actif' : 'Desactive'}</span>
                              <button type="button" onClick={() => setAffreteurEquipmentActive(item.id, !item.active)} className="text-xs font-semibold text-slate-600 hover:text-slate-900">{item.active ? 'Desactiver' : 'Activer'}</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function MetricCard({ label, value, detail, badgeClass }: { label: string; value: string; detail: string; badgeClass?: string }) {
  return (
    <div className="nx-panel px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className={`mt-2 text-base font-semibold ${badgeClass ? `inline-flex rounded-full px-2 py-1 text-[11px] ${badgeClass}` : 'text-slate-950'}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  )
}
