import { useEffect, useMemo, useState } from 'react'
import type { Tables } from '@/lib/database.types'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import {
  getAffreteurCompanyName,
  listAffretementContracts,
  listAffreteurDrivers,
  listAffreteurEquipments,
  listAffreteurOnboardings,
  listAffreteurVehicles,
  reviewAffreteurOnboarding,
  subscribeAffretementPortalUpdates,
  upsertAffretementContractByExploitation,
  type AffretementContract,
  type AffreteurOnboardingRecord,
} from '@/lib/affretementPortal'
import { setCourseAffretement } from '@/lib/transportCourses'

type OT = Tables<'ordres_transport'>

type Props = {
  orders: OT[]
  clientMap: Record<string, string>
  onRefresh: () => void
}

type Tab = 'inscriptions' | 'affretements'

const CONTRACT_STATUS_LABELS: Record<AffretementContract['status'], string> = {
  propose: 'Propose',
  accepte: 'Accepte',
  refuse: 'Refuse',
  en_cours: 'En cours',
  termine: 'Termine',
  annule: 'Annule',
}

function statusClass(status: AffretementContract['status']) {
  if (status === 'accepte' || status === 'termine') return 'nx-status-success'
  if (status === 'refuse' || status === 'annule') return 'nx-status-error'
  return 'nx-status-warning'
}

function onboardingStatusClass(status: AffreteurOnboardingRecord['status']) {
  if (status === 'validee') return 'nx-status-success'
  if (status === 'refusee') return 'nx-status-error'
  return 'nx-status-warning'
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('fr-FR')
}

export default function BourseAffretementPanel({ orders, clientMap, onRefresh }: Props) {
  const { role, profil } = useAuth()

  const [tab, setTab] = useState<Tab>('affretements')
  const [onboardings, setOnboardings] = useState<AffreteurOnboardingRecord[]>([])
  const [contracts, setContracts] = useState<AffretementContract[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [selectedAffreteurByOt, setSelectedAffreteurByOt] = useState<Record<string, string>>({})
  const [resourceDrafts, setResourceDrafts] = useState<Record<string, { driverId: string; vehicleId: string; equipmentIds: string[] }>>({})

  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canCommercial = role === 'commercial' || role === 'admin' || role === 'dirigeant' || role === 'exploitant'
  const canComptable = role === 'comptable' || role === 'admin' || role === 'dirigeant' || role === 'exploitant'
  const canExploit = role === 'exploitant' || role === 'admin' || role === 'dirigeant'

  function reload() {
    setOnboardings(listAffreteurOnboardings())
    setContracts(listAffretementContracts())
  }

  useEffect(() => {
    reload()
    const unsubscribe = subscribeAffretementPortalUpdates(reload)
    return unsubscribe
  }, [])

  const contractByOt = useMemo(
    () => Object.fromEntries(contracts.map(contract => [contract.otId, contract])),
    [contracts],
  )

  const openOrders = useMemo(
    () => orders.filter(order => order.statut !== 'livre' && order.statut !== 'facture' && order.statut !== 'annule'),
    [orders],
  )

  const validatedAffreteurs = useMemo(
    () => onboardings.filter(item => item.status === 'validee'),
    [onboardings],
  )

  async function appendAffretementNoteToOt(order: OT, status: AffretementContract['status'], companyName: string, note: string | null) {
    const tag = `[AFFRETEMENT] ${companyName} - ${status}${note ? ` - ${note}` : ''}`
    const existing = order.notes_internes?.split('\n').filter(Boolean) ?? []
    const withoutOldTag = existing.filter(line => !line.startsWith('[AFFRETEMENT]'))
    const next = [tag, ...withoutOldTag].join('\n')

    await supabase
      .from('ordres_transport')
      .update({ notes_internes: next })
      .eq('id', order.id)
  }

  async function decideOnboarding(onboardingId: string, decision: 'approve' | 'reject') {
    if (!role || !profil) return

    const updated = reviewAffreteurOnboarding({
      onboardingId,
      reviewerRole: role,
      reviewerName: [profil.prenom, profil.nom].filter(Boolean).join(' ') || role,
      decision,
      note: notes[onboardingId] ?? '',
    })

    if (!updated) {
      setError('Action impossible sur cette inscription affreteur.')
      return
    }

    setError(null)
    setNotice('Decision inscription enregistree.')
  }

  async function decideContract(order: OT, decision: 'propose' | 'accept' | 'reject' | 'set_in_progress' | 'set_done' | 'cancel') {
    if (!role || !profil || !canExploit) return

    const currentContract = contractByOt[order.id] ?? null
    const onboardingId = selectedAffreteurByOt[order.id] || currentContract?.onboardingId || ''

    if (!onboardingId) {
      setError('Selectionnez un affreteur valide avant de proposer un contrat.')
      return
    }

    const draft = resourceDrafts[order.id] ?? { driverId: '', vehicleId: '', equipmentIds: [] }
    const note = notes[order.id] ?? ''

    const updated = upsertAffretementContractByExploitation({
      otId: order.id,
      onboardingId,
      reviewerRole: role,
      reviewerName: [profil.prenom, profil.nom].filter(Boolean).join(' ') || role,
      decision,
      note,
      driverId: draft.driverId || null,
      vehicleId: draft.vehicleId || null,
      equipmentIds: draft.equipmentIds,
    })

    if (!updated) {
      setError('Decision exploitation impossible sur ce contrat.')
      return
    }

    const persistAsAffretee = updated.status === 'propose' || updated.status === 'accepte' || updated.status === 'en_cours' || updated.status === 'termine'
    await setCourseAffretement(order.id, persistAsAffretee ? updated.onboardingId : null)

    await appendAffretementNoteToOt(order, updated.status, getAffreteurCompanyName(updated.onboardingId), note || null)
    onRefresh()

    setError(null)
    setNotice('Decision affretement enregistree. La course sort du planning principal et reste visible en suivi affretement.')
  }

  function setResourceDraft(orderId: string, patch: Partial<{ driverId: string; vehicleId: string; equipmentIds: string[] }>) {
    setResourceDrafts(current => ({
      ...current,
      [orderId]: {
        driverId: patch.driverId ?? current[orderId]?.driverId ?? '',
        vehicleId: patch.vehicleId ?? current[orderId]?.vehicleId ?? '',
        equipmentIds: patch.equipmentIds ?? current[orderId]?.equipmentIds ?? [],
      },
    }))
  }

  function toggleEquipment(orderId: string, equipmentId: string) {
    const current = resourceDrafts[orderId]?.equipmentIds ?? []
    const next = current.includes(equipmentId)
      ? current.filter(item => item !== equipmentId)
      : [...current, equipmentId]
    setResourceDraft(orderId, { equipmentIds: next })
  }

  return (
    <div className="space-y-4">
      <div className="nx-panel px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Bourse du fret</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Affretement exploitation</h3>
        <p className="mt-1 text-sm text-slate-600">Validation des affreteurs et decision d affreter un OT en gardant le suivi sur planning.</p>
      </div>

      {error && <div className="nx-status-error rounded-xl border border-red-200 px-3 py-2 text-sm">{error}</div>}
      {notice && <div className="nx-status-success rounded-xl border border-green-200 px-3 py-2 text-sm">{notice}</div>}

      <div className="nx-panel overflow-hidden">
        <div className="border-b px-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-4">
            <button type="button" onClick={() => setTab('affretements')} className={`px-1 py-3 text-sm font-semibold ${tab === 'affretements' ? 'nx-tab nx-tab-active' : 'nx-tab hover:text-slate-700'}`}>Affretements OT</button>
            <button type="button" onClick={() => setTab('inscriptions')} className={`px-1 py-3 text-sm font-semibold ${tab === 'inscriptions' ? 'nx-tab nx-tab-active' : 'nx-tab hover:text-slate-700'}`}>Inscriptions affreteurs</button>
          </div>
        </div>

        {tab === 'inscriptions' && (
          <div className="space-y-3 p-5">
            {onboardings.length === 0 && <p className="text-sm text-slate-500">Aucune inscription affreteur.</p>}
            {onboardings.map(item => (
              <div key={item.id} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.companyName}</p>
                    <p className="text-xs text-slate-500">SIRET: {item.siret} - {item.contactEmail}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${onboardingStatusClass(item.status)}`}>{item.status}</span>
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  <p>Commercial: {item.commercialReview}</p>
                  <p>Comptable: {item.comptableReview}</p>
                </div>

                <textarea
                  value={notes[item.id] ?? ''}
                  onChange={event => setNotes(current => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="Note de validation / refus"
                  className="mt-3 w-full rounded-xl px-3 py-2 text-xs"
                  rows={2}
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  {canCommercial && item.commercialReview === 'en_attente' && (
                    <>
                      <button type="button" onClick={() => void decideOnboarding(item.id, 'approve')} className="nx-button-primary rounded-xl px-3 py-1.5 text-xs font-medium">Valider commercial</button>
                      <button type="button" onClick={() => void decideOnboarding(item.id, 'reject')} className="nx-button-secondary rounded-xl px-3 py-1.5 text-xs font-medium">Refuser commercial</button>
                    </>
                  )}
                  {canComptable && item.commercialReview === 'valide' && item.comptableReview === 'en_attente' && (
                    <>
                      <button type="button" onClick={() => void decideOnboarding(item.id, 'approve')} className="nx-button-primary rounded-xl px-3 py-1.5 text-xs font-medium">Valider comptable</button>
                      <button type="button" onClick={() => void decideOnboarding(item.id, 'reject')} className="nx-button-secondary rounded-xl px-3 py-1.5 text-xs font-medium">Refuser comptable</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'affretements' && (
          <div className="space-y-3 p-5">
            {openOrders.length === 0 && <p className="text-sm text-slate-500">Aucun OT disponible pour affretement.</p>}
            {openOrders.map(order => {
              const contract = contractByOt[order.id] ?? null
              const onboardingId = selectedAffreteurByOt[order.id] || contract?.onboardingId || ''
              const affreteurName = onboardingId ? getAffreteurCompanyName(onboardingId) : '-'
              const drivers = onboardingId ? listAffreteurDrivers(onboardingId).filter(item => item.active) : []
              const vehicles = onboardingId ? listAffreteurVehicles(onboardingId).filter(item => item.active) : []
              const equipments = onboardingId ? listAffreteurEquipments(onboardingId).filter(item => item.active) : []
              const draft = resourceDrafts[order.id] ?? {
                driverId: contract?.assignedDriverId ?? '',
                vehicleId: contract?.assignedVehicleId ?? '',
                equipmentIds: contract?.assignedEquipmentIds ?? [],
              }

              return (
                <div key={order.id} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{order.reference}</p>
                      <p className="text-xs text-slate-500">{clientMap[order.client_id] ?? 'Client non renseigne'}</p>
                    </div>
                    {contract ? (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(contract.status)}`}>{CONTRACT_STATUS_LABELS[contract.status]}</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">Non affrete</span>
                    )}
                  </div>

                  <div className="mt-2 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                    <p>Chargement: {formatDate(order.date_chargement_prevue)}</p>
                    <p>Livraison: {formatDate(order.date_livraison_prevue)}</p>
                    <p>Affreteur: {affreteurName}</p>
                    <p>Distance: {order.distance_km ? `${order.distance_km} km` : '-'}</p>
                  </div>

                  {canExploit && (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Field label="Affreteur cible">
                        <select value={onboardingId} onChange={event => setSelectedAffreteurByOt(current => ({ ...current, [order.id]: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm">
                          <option value="">Selectionner un affreteur</option>
                          {validatedAffreteurs.map(item => (
                            <option key={item.id} value={item.id}>{item.companyName}</option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Conducteur affrete">
                        <select value={draft.driverId} onChange={event => setResourceDraft(order.id, { driverId: event.target.value })} className="w-full rounded-xl px-3 py-2 text-sm">
                          <option value="">Non affecte</option>
                          {drivers.map(item => <option key={item.id} value={item.id}>{item.fullName}</option>)}
                        </select>
                      </Field>

                      <Field label="Poids lourd affrete">
                        <select value={draft.vehicleId} onChange={event => setResourceDraft(order.id, { vehicleId: event.target.value })} className="w-full rounded-xl px-3 py-2 text-sm">
                          <option value="">Non affecte</option>
                          {vehicles.map(item => <option key={item.id} value={item.id}>{item.plate}</option>)}
                        </select>
                      </Field>

                      <div className="md:col-span-2">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Equipements affretes</p>
                        <div className="space-y-1 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)' }}>
                          {equipments.length === 0 && <p className="text-xs text-slate-500">Aucun equipement actif.</p>}
                          {equipments.map(item => (
                            <label key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
                              <input type="checkbox" checked={draft.equipmentIds.includes(item.id)} onChange={() => toggleEquipment(order.id, item.id)} />
                              {item.label} ({item.kind})
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <Field label="Note exploitation">
                          <textarea value={notes[order.id] ?? ''} onChange={event => setNotes(current => ({ ...current, [order.id]: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" rows={2} />
                        </Field>
                      </div>
                    </div>
                  )}

                  {canExploit && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void decideContract(order, 'propose')} className="nx-button-secondary rounded-xl px-3 py-1.5 text-xs font-medium">Proposer contrat</button>
                      <button type="button" onClick={() => void decideContract(order, 'accept')} className="nx-button-primary rounded-xl px-3 py-1.5 text-xs font-medium">Valider affretement</button>
                      <button type="button" onClick={() => void decideContract(order, 'reject')} className="nx-button-secondary rounded-xl px-3 py-1.5 text-xs font-medium">Refuser</button>
                      <button type="button" onClick={() => void decideContract(order, 'set_in_progress')} className="nx-button-secondary rounded-xl px-3 py-1.5 text-xs font-medium">En cours</button>
                      <button type="button" onClick={() => void decideContract(order, 'set_done')} className="nx-button-primary rounded-xl px-3 py-1.5 text-xs font-medium">Termine</button>
                      <button type="button" onClick={() => void decideContract(order, 'cancel')} className="nx-button-secondary rounded-xl px-3 py-1.5 text-xs font-medium">Annuler</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
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
