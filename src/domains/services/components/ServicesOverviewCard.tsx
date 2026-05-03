import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useExploitants } from '@/domains/exploitants/hooks/useExploitants'
import { DEFAULT_SERVICE_COLORS } from '../domain'
import { useServices } from '../hooks/useServices'

type Props = {
  companyId: number | null
}

const inputClassName = 'w-full rounded-xl border bg-[color:var(--surface)] px-3 py-2.5 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--primary)]'

export function ServicesOverviewCard({ companyId }: Props) {
  const { role } = useAuth()
  const canManage = role === 'admin' || role === 'dirigeant' || role === 'super_admin'
  const { services, health, isLoading, isSaving, create } = useServices(companyId)
  const {
    exploitants,
    error: exploitantsError,
    isLoading: exploitantsLoading,
    isSaving: exploitantsSaving,
    assignService,
  } = useExploitants(companyId)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<string>(DEFAULT_SERVICE_COLORS[0])
  const [assignCandidateByService, setAssignCandidateByService] = useState<Record<string, string>>({})
  const [detachTargetByExploitant, setDetachTargetByExploitant] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const exploitantsByService = useMemo(() => {
    return exploitants.reduce<Record<string, number>>((acc, exploitant) => {
      acc[exploitant.service_id] = (acc[exploitant.service_id] ?? 0) + 1
      return acc
    }, {})
  }, [exploitants])

  const exploitantsByServiceList = useMemo(() => {
    return exploitants.reduce<Record<string, typeof exploitants>>((acc, exploitant) => {
      if (!acc[exploitant.service_id]) acc[exploitant.service_id] = []
      acc[exploitant.service_id].push(exploitant)
      return acc
    }, {})
  }, [exploitants])

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    setError(null)

    if (!name.trim() || !code.trim()) {
      setError('Le nom et le code du service sont obligatoires.')
      return
    }

    const result = await create({
      name,
      code,
      description,
      color,
    })

    if (!result.ok) {
      setError(result.error ?? 'Creation impossible.')
      return
    }

    setName('')
    setCode('')
    setDescription('')
    setColor(DEFAULT_SERVICE_COLORS[0])
    setNotice('Service cree.')
  }

  async function handleAssignExploitant(serviceId: string) {
    setNotice(null)
    setError(null)

    const exploitantId = assignCandidateByService[serviceId]
    if (!exploitantId) {
      setError('Selectionnez un exploitant a affecter.')
      return
    }

    const result = await assignService({ exploitantId, serviceId })
    if (!result.ok) {
      setError(result.error ?? 'Affectation impossible.')
      return
    }

    const exploitant = exploitants.find(item => item.id === exploitantId)
    const service = services.find(item => item.id === serviceId)
    setAssignCandidateByService(current => ({ ...current, [serviceId]: '' }))
    setNotice(`${exploitant?.name ?? 'Exploitant'} affecte au service ${service?.name ?? ''}.`)
  }

  async function handleDetachExploitant(currentServiceId: string, exploitantId: string) {
    setNotice(null)
    setError(null)

    const fallbackTarget = services.find(service => service.id !== currentServiceId)?.id
    const targetServiceId = detachTargetByExploitant[exploitantId] ?? fallbackTarget

    if (!targetServiceId) {
      setError('Impossible de desaffecter: creez un deuxieme service de destination.')
      return
    }

    const result = await assignService({ exploitantId, serviceId: targetServiceId })
    if (!result.ok) {
      setError(result.error ?? 'Desaffectation impossible.')
      return
    }

    const exploitant = exploitants.find(item => item.id === exploitantId)
    const targetService = services.find(item => item.id === targetServiceId)
    setNotice(`${exploitant?.name ?? 'Exploitant'} retire du service courant et affecte a ${targetService?.name ?? ''}.`)
  }

  return (
    <div className="rounded-2xl border px-5 py-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[color:var(--text)]">Services d exploitation</p>
          <p className="mt-1 text-sm nx-subtle">
            Fondation du pilotage par service et rattachement des exploitants.
          </p>
        </div>
        <div className="rounded-xl border px-3 py-2 text-right text-xs" style={{ borderColor: 'var(--border)' }}>
          <p className="nx-muted">Services actifs</p>
          <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">{services.length}</p>
        </div>
      </div>

      {(health.message || exploitantsError) && (
        <div className="mt-4 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(120,53,15,0.15)', color: '#fcd34d' }}>
          {health.message ?? exploitantsError}
        </div>
      )}

      {(notice || error) && (
        <div className="mt-4 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: error ? 'rgba(244,114,182,0.25)' : 'rgba(56,189,248,0.25)', background: error ? 'rgba(127,29,29,0.18)' : 'rgba(8,47,73,0.25)', color: error ? '#fecdd3' : '#bae6fd' }}>
          {error ?? notice}
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          {isLoading || exploitantsLoading ? (
            <p className="text-sm nx-subtle">Chargement des services...</p>
          ) : services.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-4 text-sm nx-subtle" style={{ borderColor: 'var(--border)' }}>
              Aucun service actif pour cette company.
            </div>
          ) : (
            services.map(service => (
              <div key={service.id} className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ background: service.color ?? '#64748b' }} />
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--text)]">{service.name}</p>
                      <p className="text-xs nx-subtle">Code {service.code}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs nx-subtle">
                    <p>{exploitantsByService[service.id] ?? 0} exploitant(s)</p>
                    <p>{service.parent_service_id ? 'Sous-service' : 'Service racine'}</p>
                  </div>
                </div>
                {service.description && <p className="mt-2 text-sm nx-subtle">{service.description}</p>}

                <div className="mt-3 grid gap-2">
                  {(exploitantsByServiceList[service.id] ?? []).length === 0 ? (
                    <p className="text-xs nx-subtle">Aucun exploitant affecte a ce service.</p>
                  ) : (
                    (exploitantsByServiceList[service.id] ?? []).map(exploitant => {
                      const otherServices = services.filter(item => item.id !== service.id)
                      const targetService = detachTargetByExploitant[exploitant.id] ?? otherServices[0]?.id ?? ''

                      return (
                        <div key={exploitant.id} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-[color:var(--text)]">{exploitant.name}</p>
                            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                              {exploitant.type_exploitant}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <select
                              className="rounded-lg border bg-surface px-2 py-1.5 text-xs text-heading"
                              style={{ borderColor: 'var(--border)' }}
                              value={targetService}
                              disabled={!canManage || !health.ready || exploitantsSaving || otherServices.length === 0}
                              onChange={event => setDetachTargetByExploitant(current => ({ ...current, [exploitant.id]: event.target.value }))}
                            >
                              {otherServices.length === 0 ? (
                                <option value="">Aucun service cible</option>
                              ) : (
                                otherServices.map(item => (
                                  <option key={item.id} value={item.id}>{item.name}</option>
                                ))
                              )}
                            </select>
                            <button
                              type="button"
                              disabled={!canManage || !health.ready || exploitantsSaving || otherServices.length === 0}
                              onClick={() => void handleDetachExploitant(service.id, exploitant.id)}
                              className="rounded-lg border border-red-300 bg-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-900 disabled:opacity-50"
                            >
                              Desaffecter
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}

                  <div className="rounded-lg border border-dashed px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-xs font-semibold text-foreground">Affecter un exploitant a ce service</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        className="rounded-lg border bg-surface px-2 py-1.5 text-xs text-heading"
                        style={{ borderColor: 'var(--border)' }}
                        value={assignCandidateByService[service.id] ?? ''}
                        disabled={!canManage || !health.ready || exploitantsSaving}
                        onChange={event => setAssignCandidateByService(current => ({ ...current, [service.id]: event.target.value }))}
                      >
                        <option value="">Selectionner un exploitant</option>
                        {exploitants
                          .filter(item => item.service_id !== service.id)
                          .map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={!canManage || !health.ready || exploitantsSaving || !(assignCandidateByService[service.id] ?? '')}
                        onClick={() => void handleAssignExploitant(service.id)}
                        className="rounded-lg border border-blue-300 bg-blue-100 px-2.5 py-1.5 text-xs font-semibold text-blue-900 disabled:opacity-50"
                      >
                        Affecter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-xl border px-4 py-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold text-[color:var(--text)]">Creer un service</p>
          <p className="mt-1 text-sm nx-subtle">Ajout rapide pour poser le perimetre d exploitation.</p>

          <form className="mt-4 space-y-3" onSubmit={event => void handleCreate(event)}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Nom</span>
              <input className={inputClassName} value={name} onChange={event => setName(event.target.value)} disabled={!canManage || !health.ready || isSaving} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Code</span>
              <input className={inputClassName} value={code} onChange={event => setCode(event.target.value.toUpperCase())} disabled={!canManage || !health.ready || isSaving} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Description</span>
              <textarea className={`${inputClassName} min-h-[88px] resize-none`} value={description} onChange={event => setDescription(event.target.value)} disabled={!canManage || !health.ready || isSaving} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Couleur</span>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_SERVICE_COLORS.map(candidate => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => setColor(candidate)}
                    disabled={!canManage || !health.ready || isSaving}
                    className={`h-8 w-8 rounded-full border ${color === candidate ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                    style={{ background: candidate, borderColor: color === candidate ? '#0f172a' : 'rgba(148,163,184,0.5)' }}
                    aria-label={`Choisir ${candidate}`}
                  />
                ))}
              </div>
            </label>
            <button
              type="submit"
              disabled={!canManage || !health.ready || isSaving}
              className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {isSaving ? 'Creation...' : 'Creer le service'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
