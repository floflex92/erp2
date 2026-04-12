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
  const { exploitants, error: exploitantsError, isLoading: exploitantsLoading } = useExploitants(companyId)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<string>(DEFAULT_SERVICE_COLORS[0])
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const exploitantsByService = useMemo(() => {
    return exploitants.reduce<Record<string, number>>((acc, exploitant) => {
      acc[exploitant.service_id] = (acc[exploitant.service_id] ?? 0) + 1
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
              </div>
            ))
          )}
        </div>

        <div className="rounded-xl border px-4 py-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold text-[color:var(--text)]">Creer un service</p>
          <p className="mt-1 text-sm nx-subtle">Ajout rapide pour poser le perimetre d exploitation.</p>

          <form className="mt-4 space-y-3" onSubmit={event => void handleCreate(event)}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Nom</span>
              <input className={inputClassName} value={name} onChange={event => setName(event.target.value)} disabled={!canManage || !health.ready || isSaving} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Code</span>
              <input className={inputClassName} value={code} onChange={event => setCode(event.target.value.toUpperCase())} disabled={!canManage || !health.ready || isSaving} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
              <textarea className={`${inputClassName} min-h-[88px] resize-none`} value={description} onChange={event => setDescription(event.target.value)} disabled={!canManage || !health.ready || isSaving} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Couleur</span>
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
