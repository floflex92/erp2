import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  listAllTransportRequests,
  listClientOnboardings,
  reviewClientOnboarding,
  reviewTransportRequest,
  subscribeClientPortalUpdates,
  type ClientOnboardingRecord,
  type ClientTransportRequest,
  type OnboardingStatus,
  type TransportRequestStatus,
} from '@/lib/clientPortal'

const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  en_verification_commerciale: 'En verification commerciale',
  en_verification_comptable: 'En verification comptable',
  validee: 'Validee',
  refusee: 'Refusee',
}

const REQUEST_STATUS_LABELS: Record<TransportRequestStatus, string> = {
  soumise: 'Soumise',
  en_etude: 'En etude',
  acceptee: 'Acceptee',
  refusee: 'Refusee',
  modification_demandee: 'Modifications demandees',
}

function onboardingStatusClass(status: OnboardingStatus) {
  if (status === 'validee') return 'nx-status-success'
  if (status === 'refusee') return 'nx-status-error'
  return 'nx-status-warning'
}

function requestStatusClass(status: TransportRequestStatus) {
  if (status === 'acceptee') return 'nx-status-success'
  if (status === 'refusee') return 'nx-status-error'
  return 'nx-status-warning'
}

export default function DemandesClients() {
  const { role, profil } = useAuth()

  const [tab, setTab] = useState<'inscriptions' | 'demandes'>('inscriptions')
  const [onboardings, setOnboardings] = useState<ClientOnboardingRecord[]>([])
  const [requests, setRequests] = useState<ClientTransportRequest[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canCommercial = role === 'commercial' || role === 'admin' || role === 'dirigeant' || role === 'exploitant'
  const canComptable = role === 'comptable' || role === 'admin' || role === 'dirigeant' || role === 'exploitant'
  const canExploit = role === 'exploitant' || role === 'admin' || role === 'dirigeant'

  function reload() {
    setOnboardings(listClientOnboardings())
    setRequests(listAllTransportRequests())
  }

  useEffect(() => {
    reload()
    const unsubscribe = subscribeClientPortalUpdates(reload)
    return unsubscribe
  }, [])

  const pendingOnboardings = useMemo(
    () => onboardings.filter(item => item.status !== 'validee' && item.status !== 'refusee').length,
    [onboardings],
  )
  const pendingRequests = useMemo(
    () => requests.filter(item => item.status === 'soumise' || item.status === 'en_etude' || item.status === 'modification_demandee').length,
    [requests],
  )

  async function decideOnboarding(onboardingId: string, decision: 'approve' | 'reject') {
    if (!role || !profil) return
    setError(null)
    setNotice(null)

    const updated = await reviewClientOnboarding({
      onboardingId,
      reviewerRole: role,
      reviewerName: [profil.prenom, profil.nom].filter(Boolean).join(' ') || role,
      decision,
      note: notes[onboardingId] ?? '',
    })

    if (!updated) {
      setError('Action impossible sur ce dossier entreprise.')
      return
    }

    setNotice(decision === 'approve' ? 'Decision enregistree.' : 'Dossier refuse et notifie.')
    reload()
  }

  async function decideRequest(requestId: string, decision: 'mark_in_review' | 'ask_changes' | 'accept' | 'reject') {
    if (!role || !profil) return
    setError(null)
    setNotice(null)

    const updated = await reviewTransportRequest({
      requestId,
      reviewerRole: role,
      reviewerName: [profil.prenom, profil.nom].filter(Boolean).join(' ') || role,
      decision,
      note: notes[requestId] ?? '',
    })

    if (!updated) {
      setError('Validation impossible sur cette demande.')
      return
    }

    setNotice('Decision exploitation enregistree.')
    reload()
  }

  return (
    <div className="space-y-5 p-5 md:p-6">
      <div className="nx-panel px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Workflow clients</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Demandes clients et validations</h2>
        <p className="mt-1.5 max-w-3xl text-sm text-slate-600">Traitement des inscriptions entreprises (commercial + comptable) et validation exploitation des demandes transport.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <MetricCard label="Inscriptions a traiter" value={String(pendingOnboardings)} detail="Workflow CRM" />
        <MetricCard label="Demandes transport ouvertes" value={String(pendingRequests)} detail="Validation exploitation" />
      </div>

      {error && <div className="nx-status-error rounded-2xl border border-red-200 px-4 py-3 text-sm">{error}</div>}
      {notice && <div className="nx-status-success rounded-2xl border border-green-200 px-4 py-3 text-sm">{notice}</div>}

      <div className="nx-panel overflow-hidden">
        <div className="border-b px-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-4">
            <button type="button" onClick={() => setTab('inscriptions')} className={`px-1 py-3 text-sm font-semibold ${tab === 'inscriptions' ? 'nx-tab nx-tab-active' : 'nx-tab hover:text-slate-700'}`}>Inscriptions entreprises</button>
            <button type="button" onClick={() => setTab('demandes')} className={`px-1 py-3 text-sm font-semibold ${tab === 'demandes' ? 'nx-tab nx-tab-active' : 'nx-tab hover:text-slate-700'}`}>Demandes transport</button>
          </div>
        </div>

        {tab === 'inscriptions' && (
          <div className="space-y-3 p-5">
            {onboardings.length === 0 && <p className="text-sm text-slate-500">Aucune inscription client.</p>}
            {onboardings.map(item => (
              <div key={item.id} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.companyName}</p>
                    <p className="text-xs text-slate-500">SIRET: {item.siret} - {item.contactEmail}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${onboardingStatusClass(item.status)}`}>{ONBOARDING_STATUS_LABELS[item.status]}</span>
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  <p>Commercial: {item.commercialReview}</p>
                  <p>Comptable: {item.comptableReview}</p>
                  {item.clientId && <p>Client CRM: {item.clientId}</p>}
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

        {tab === 'demandes' && (
          <div className="space-y-3 p-5">
            {requests.length === 0 && <p className="text-sm text-slate-500">Aucune demande transport client.</p>}
            {requests.map(item => (
              <div key={item.id} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.reference}</p>
                    <p className="text-xs text-slate-500">{item.pickupAddress} {'->'} {item.deliveryAddress}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${requestStatusClass(item.status)}`}>{REQUEST_STATUS_LABELS[item.status]}</span>
                </div>

                <p className="mt-1 text-xs text-slate-500">Chargement: {formatDate(item.pickupDatetime)} | Livraison: {formatDate(item.deliveryDatetime)}</p>
                <p className="mt-1 text-xs text-slate-500">Marchandise: {item.goodsDescription}</p>
                {item.exploitationNote && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Note exploitation: {item.exploitationNote}</p>}
                {item.createdOtId && <p className="mt-2 text-xs text-green-700">OT cree: {item.createdOtId}</p>}

                <textarea
                  value={notes[item.id] ?? ''}
                  onChange={event => setNotes(current => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="Note exploitation"
                  className="mt-3 w-full rounded-xl px-3 py-2 text-xs"
                  rows={2}
                />

                {canExploit && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void decideRequest(item.id, 'mark_in_review')} className="nx-button-secondary rounded-xl px-3 py-1.5 text-xs font-medium">Mettre en etude</button>
                    <button type="button" onClick={() => void decideRequest(item.id, 'ask_changes')} className="nx-button-secondary rounded-xl px-3 py-1.5 text-xs font-medium">Demander modifs</button>
                    <button type="button" onClick={() => void decideRequest(item.id, 'accept')} className="nx-button-primary rounded-xl px-3 py-1.5 text-xs font-medium">Accepter</button>
                    <button type="button" onClick={() => void decideRequest(item.id, 'reject')} className="nx-button-secondary rounded-xl px-3 py-1.5 text-xs font-medium">Refuser</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="nx-panel px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  )
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('fr-FR')
}
