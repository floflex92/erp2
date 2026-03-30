import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  CLIENT_PERMISSION_OPTIONS,
  findClientOnboardingForProfile,
  listClientEmployees,
  listClientTransportRequests,
  listInvoicesForClient,
  setClientEmployeeActive,
  submitClientOnboarding,
  submitClientTransportRequest,
  subscribeClientPortalUpdates,
  updateClientTransportRequestByClient,
  upsertClientEmployee,
  type ClientEmployeeAccount,
  type ClientInvoiceItem,
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
  en_etude: 'En etude exploitation',
  acceptee: 'Acceptee',
  refusee: 'Refusee',
  modification_demandee: 'Modification demandee',
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

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('fr-FR')
}

function formatMoney(value: number | null) {
  if (value === null) return '-'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
}

type PortalTab = 'demande' | 'suivi' | 'facturation' | 'comptes'

export default function EspaceClient() {
  const { profil } = useAuth()

  const [tab, setTab] = useState<PortalTab>('demande')
  const [onboarding, setOnboarding] = useState<ClientOnboardingRecord | null>(null)
  const [requests, setRequests] = useState<ClientTransportRequest[]>([])
  const [employees, setEmployees] = useState<ClientEmployeeAccount[]>([])
  const [invoices, setInvoices] = useState<ClientInvoiceItem[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)

  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [onboardingForm, setOnboardingForm] = useState({
    companyName: '',
    siret: '',
    vatNumber: '',
    contactEmail: profil?.email ?? '',
    billingAddress: '',
  })

  const [requestForm, setRequestForm] = useState({
    id: '',
    reference: '',
    pickupAddress: '',
    pickupDatetime: '',
    deliveryAddress: '',
    deliveryDatetime: '',
    goodsDescription: '',
    instructions: '',
  })

  const [employeeForm, setEmployeeForm] = useState({
    id: '',
    fullName: '',
    email: '',
    permissions: ['demandes:create', 'demandes:read', 'factures:read'] as string[],
  })

  function resetRequestForm() {
    setRequestForm({
      id: '',
      reference: '',
      pickupAddress: '',
      pickupDatetime: '',
      deliveryAddress: '',
      deliveryDatetime: '',
      goodsDescription: '',
      instructions: '',
    })
  }

  function resetEmployeeForm() {
    setEmployeeForm({
      id: '',
      fullName: '',
      email: '',
      permissions: ['demandes:create', 'demandes:read', 'factures:read'],
    })
  }

  function reload(profileId: string) {
    const onb = findClientOnboardingForProfile(profileId)
    setOnboarding(onb)
    if (!onb) {
      setRequests([])
      setEmployees([])
      setInvoices([])
      return
    }
    setRequests(listClientTransportRequests(onb.id))
    setEmployees(listClientEmployees(onb.id))
  }

  useEffect(() => {
    if (!profil?.id) return
    reload(profil.id)
    const unsubscribe = subscribeClientPortalUpdates(() => reload(profil.id))
    return unsubscribe
  }, [profil?.id])

  useEffect(() => {
    if (!onboarding?.clientId || onboarding.status !== 'validee') {
      setInvoices([])
      return
    }
    let active = true
    setLoadingInvoices(true)
    void listInvoicesForClient(onboarding.clientId).then(rows => {
      if (!active) return
      setInvoices(rows)
      setLoadingInvoices(false)
    })
    return () => {
      active = false
    }
  }, [onboarding?.clientId, onboarding?.status])

  const canUsePortal = onboarding?.status === 'validee'
  const pendingRequests = useMemo(
    () => requests.filter(item => ['soumise', 'en_etude', 'modification_demandee'].includes(item.status)).length,
    [requests],
  )

  function submitOnboarding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profil?.id) return

    if (!onboardingForm.companyName.trim() || !onboardingForm.siret.trim() || !onboardingForm.contactEmail.trim() || !onboardingForm.billingAddress.trim()) {
      setError('Complete entreprise, SIRET, email et adresse de facturation.')
      return
    }

    const result = submitClientOnboarding({
      ownerProfileId: profil.id,
      companyName: onboardingForm.companyName,
      siret: onboardingForm.siret,
      vatNumber: onboardingForm.vatNumber,
      contactEmail: onboardingForm.contactEmail,
      billingAddress: onboardingForm.billingAddress,
    })

    setOnboarding(result)
    setError(null)
    setNotice('Inscription entreprise envoyee au commercial puis au comptable.')
  }

  function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profil?.id || !onboarding) return

    if (!requestForm.pickupAddress.trim() || !requestForm.deliveryAddress.trim() || !requestForm.pickupDatetime || !requestForm.deliveryDatetime || !requestForm.goodsDescription.trim()) {
      setError('Complete lieux, dates et marchandise.')
      return
    }

    if (requestForm.id) {
      const updated = updateClientTransportRequestByClient({
        requestId: requestForm.id,
        requesterProfileId: profil.id,
        patch: {
          reference: requestForm.reference,
          pickupAddress: requestForm.pickupAddress,
          pickupDatetime: requestForm.pickupDatetime,
          deliveryAddress: requestForm.deliveryAddress,
          deliveryDatetime: requestForm.deliveryDatetime,
          goodsDescription: requestForm.goodsDescription,
          instructions: requestForm.instructions,
        },
      })
      if (!updated) {
        setError('Cette demande ne peut plus etre modifiee.')
        return
      }
      setNotice('Demande mise a jour puis renvoyee.')
    } else {
      submitClientTransportRequest({
        onboardingId: onboarding.id,
        requesterProfileId: profil.id,
        reference: requestForm.reference,
        pickupAddress: requestForm.pickupAddress,
        pickupDatetime: requestForm.pickupDatetime,
        deliveryAddress: requestForm.deliveryAddress,
        deliveryDatetime: requestForm.deliveryDatetime,
        goodsDescription: requestForm.goodsDescription,
        instructions: requestForm.instructions,
      })
      setNotice('Demande transport envoyee a l exploitation.')
    }

    setError(null)
    resetRequestForm()
  }

  function submitEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onboarding || onboarding.status !== 'validee') return

    if (!employeeForm.fullName.trim() || !employeeForm.email.trim()) {
      setError('Nom complet et email sont obligatoires.')
      return
    }

    upsertClientEmployee({
      onboardingId: onboarding.id,
      id: employeeForm.id || null,
      fullName: employeeForm.fullName,
      email: employeeForm.email,
      permissions: employeeForm.permissions,
    })

    resetEmployeeForm()
    setError(null)
    setNotice('Compte employe enregistre.')
  }

  function togglePermission(permission: string) {
    setEmployeeForm(current => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter(item => item !== permission)
        : [...current.permissions, permission],
    }))
  }

  function editRequest(request: ClientTransportRequest) {
    setTab('demande')
    setRequestForm({
      id: request.id,
      reference: request.reference,
      pickupAddress: request.pickupAddress,
      pickupDatetime: request.pickupDatetime,
      deliveryAddress: request.deliveryAddress,
      deliveryDatetime: request.deliveryDatetime,
      goodsDescription: request.goodsDescription,
      instructions: request.instructions ?? '',
    })
  }

  function editEmployee(employee: ClientEmployeeAccount) {
    setTab('comptes')
    setEmployeeForm({
      id: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      permissions: employee.permissions,
    })
  }

  function toggleEmployee(employee: ClientEmployeeAccount) {
    setClientEmployeeActive(employee.id, !employee.active)
  }

  return (
    <div className="space-y-5 p-5 md:p-6">
      <div className="nx-panel px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Portail client</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Espace client entreprise</h2>
        <p className="mt-1.5 max-w-3xl text-sm text-slate-600">Inscription societe, demandes transport, suivi exploitation, facturation et gestion des acces employes.</p>
      </div>

      {error && <div className="nx-status-error rounded-2xl border border-red-200 px-4 py-3 text-sm">{error}</div>}
      {notice && <div className="nx-status-success rounded-2xl border border-green-200 px-4 py-3 text-sm">{notice}</div>}

      {!onboarding && (
        <div className="nx-panel p-5">
          <h3 className="text-lg font-semibold text-slate-950">Inscription entreprise</h3>
          <form onSubmit={submitOnboarding} className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Nom entreprise"><input value={onboardingForm.companyName} onChange={event => setOnboardingForm(current => ({ ...current, companyName: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
            <Field label="SIRET"><input value={onboardingForm.siret} onChange={event => setOnboardingForm(current => ({ ...current, siret: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
            <Field label="TVA intracom"><input value={onboardingForm.vatNumber} onChange={event => setOnboardingForm(current => ({ ...current, vatNumber: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
            <Field label="Email contact"><input type="email" value={onboardingForm.contactEmail} onChange={event => setOnboardingForm(current => ({ ...current, contactEmail: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
            <div className="md:col-span-2"><Field label="Adresse facturation"><input value={onboardingForm.billingAddress} onChange={event => setOnboardingForm(current => ({ ...current, billingAddress: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field></div>
            <div className="md:col-span-2 flex justify-end"><button type="submit" className="nx-button-primary rounded-xl px-4 py-2 text-sm font-medium">Envoyer au CRM</button></div>
          </form>
        </div>
      )}

      {onboarding && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Entreprise" value={onboarding.companyName} detail={onboarding.siret} />
            <MetricCard label="Statut dossier" value={ONBOARDING_STATUS_LABELS[onboarding.status]} detail="Validation CRM" badgeClass={onboardingStatusClass(onboarding.status)} />
            <MetricCard label="Demandes actives" value={String(pendingRequests)} detail="A valider exploitation" />
            <MetricCard label="Client CRM" value={onboarding.clientId ? 'Integre' : 'Non integre'} detail={onboarding.clientId ?? '-'} badgeClass={onboarding.clientId ? 'nx-status-success' : 'nx-status-warning'} />
          </div>

          <div className="nx-panel overflow-hidden">
            <div className="border-b px-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex flex-wrap gap-4">
                {[{ key: 'demande', label: 'Demande transport' }, { key: 'suivi', label: 'Statut demandes' }, { key: 'facturation', label: 'Facturation' }, { key: 'comptes', label: 'Comptes employes' }].map(item => {
                  const active = tab === item.key
                  return <button key={item.key} type="button" onClick={() => setTab(item.key as PortalTab)} className={`px-1 py-3 text-sm font-semibold ${active ? 'nx-tab nx-tab-active' : 'nx-tab hover:text-slate-700'}`}>{item.label}</button>
                })}
              </div>
            </div>

            {tab === 'demande' && (
              <div className="p-5">
                {!canUsePortal && <div className="nx-status-warning mb-4 rounded-xl border border-amber-200 px-3 py-2 text-sm">Le dossier doit etre valide avant envoi de nouvelles demandes.</div>}
                <form onSubmit={submitRequest} className="grid gap-4 md:grid-cols-2">
                  <Field label="Reference"><input value={requestForm.reference} onChange={event => setRequestForm(current => ({ ...current, reference: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                  <Field label="Marchandise"><input value={requestForm.goodsDescription} onChange={event => setRequestForm(current => ({ ...current, goodsDescription: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                  <Field label="Lieu chargement"><input value={requestForm.pickupAddress} onChange={event => setRequestForm(current => ({ ...current, pickupAddress: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                  <Field label="Date/heure chargement"><input type="datetime-local" value={requestForm.pickupDatetime} onChange={event => setRequestForm(current => ({ ...current, pickupDatetime: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                  <Field label="Lieu livraison"><input value={requestForm.deliveryAddress} onChange={event => setRequestForm(current => ({ ...current, deliveryAddress: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                  <Field label="Date/heure livraison"><input type="datetime-local" value={requestForm.deliveryDatetime} onChange={event => setRequestForm(current => ({ ...current, deliveryDatetime: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                  <div className="md:col-span-2"><Field label="Instructions"><textarea value={requestForm.instructions} onChange={event => setRequestForm(current => ({ ...current, instructions: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" rows={3} /></Field></div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    {requestForm.id && <button type="button" onClick={resetRequestForm} className="nx-button-secondary rounded-xl px-4 py-2 text-sm font-medium">Annuler edition</button>}
                    <button type="submit" disabled={!canUsePortal} className="nx-button-primary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">{requestForm.id ? 'Mettre a jour' : 'Envoyer la demande'}</button>
                  </div>
                </form>
              </div>
            )}

            {tab === 'suivi' && (
              <div className="p-5 space-y-3">
                {requests.length === 0 && <p className="text-sm text-slate-500">Aucune demande transport.</p>}
                {requests.map(item => {
                  const editable = ['soumise', 'en_etude', 'modification_demandee'].includes(item.status)
                  return (
                    <div key={item.id} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-950">{item.reference}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${requestStatusClass(item.status)}`}>{REQUEST_STATUS_LABELS[item.status]}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.pickupAddress} {'->'} {item.deliveryAddress}</p>
                      <p className="mt-1 text-xs text-slate-500">Chargement: {formatDate(item.pickupDatetime)} | Livraison: {formatDate(item.deliveryDatetime)}</p>
                      {item.exploitationNote && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Note exploitation: {item.exploitationNote}</p>}
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>Mise a jour: {formatDate(item.updatedAt)}</span>
                        {editable && <button type="button" onClick={() => editRequest(item)} className="font-semibold text-[color:var(--primary)] hover:underline">Modifier</button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'facturation' && (
              <div className="p-5">
                {!onboarding.clientId && <p className="text-sm text-slate-500">Facturation visible apres integration CRM.</p>}
                {onboarding.clientId && loadingInvoices && <p className="text-sm text-slate-500">Chargement des factures...</p>}
                {onboarding.clientId && !loadingInvoices && invoices.length === 0 && <p className="text-sm text-slate-500">Aucune facture disponible.</p>}
                {invoices.length > 0 && (
                  <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Numero</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Emission</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Montant TTC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map(item => (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-medium text-slate-900">{item.numero}</td>
                            <td className="px-4 py-3 text-slate-600">{item.statut}</td>
                            <td className="px-4 py-3 text-slate-600">{new Date(item.dateEmission).toLocaleDateString('fr-FR')}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(item.montantTtc ?? item.montantHt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === 'comptes' && (
              <div className="p-5">
                {!canUsePortal && <div className="nx-status-warning mb-4 rounded-xl border border-amber-200 px-3 py-2 text-sm">Gestion des comptes activee apres validation dossier.</div>}
                <form onSubmit={submitEmployee} className="grid gap-4 md:grid-cols-2">
                  <Field label="Nom complet"><input value={employeeForm.fullName} onChange={event => setEmployeeForm(current => ({ ...current, fullName: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                  <Field label="Email"><input type="email" value={employeeForm.email} onChange={event => setEmployeeForm(current => ({ ...current, email: event.target.value }))} className="w-full rounded-xl px-3 py-2 text-sm" /></Field>
                  <div className="md:col-span-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Permissions</p>
                    <div className="space-y-2 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)' }}>
                      {CLIENT_PERMISSION_OPTIONS.map(option => (
                        <label key={option.key} className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={employeeForm.permissions.includes(option.key)} onChange={() => togglePermission(option.key)} />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    {employeeForm.id && <button type="button" onClick={resetEmployeeForm} className="nx-button-secondary rounded-xl px-4 py-2 text-sm font-medium">Annuler edition</button>}
                    <button type="submit" disabled={!canUsePortal} className="nx-button-primary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">{employeeForm.id ? 'Mettre a jour' : 'Creer le compte'}</button>
                  </div>
                </form>

                <div className="mt-5 space-y-2">
                  {employees.length === 0 && <p className="text-sm text-slate-500">Aucun employe enregistre.</p>}
                  {employees.map(employee => (
                    <div key={employee.id} className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{employee.fullName}</p>
                          <p className="text-xs text-slate-500">{employee.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${employee.active ? 'nx-status-success' : 'nx-status-error'}`}>{employee.active ? 'Actif' : 'Desactive'}</span>
                          <button type="button" onClick={() => editEmployee(employee)} className="text-xs font-semibold text-[color:var(--primary)] hover:underline">Editer</button>
                          <button type="button" onClick={() => toggleEmployee(employee)} className="text-xs font-semibold text-slate-600 hover:text-slate-900">{employee.active ? 'Desactiver' : 'Activer'}</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
