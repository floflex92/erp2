import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ModuleKey = 'tracking' | 'tachy' | 'routing' | 'eta' | 'driver_session' | 'client_portal' | 'chat' | 'ai'

type ModuleRow = {
  module_key: ModuleKey
  enabled: boolean
  mode: 'internal_only' | 'hybrid' | 'provider_preferred'
  refresh_interval_sec: number
  fallback_strategy: 'stale_cache' | 'internal_recompute' | 'last_known'
}

type ProviderRow = {
  provider_key: string
  provider_type: 'tracking' | 'tachy' | 'routing' | 'traffic' | 'eta' | 'chat' | 'ai'
  enabled: boolean
  priority: number
  base_url: string | null
  cache_ttl_sec: number
}

type MappingRow = {
  provider_key: string
  object_name: 'VehiclePosition' | 'DriverStatus' | 'DrivingTimeStatus' | 'TrafficStatus' | 'RoutePlan' | 'EtaPrediction'
  mapping_version: number
  is_active: boolean
}

type V11SettingsState = Record<string, unknown>

const MODULE_LABELS: Record<ModuleKey, string> = {
  tracking: 'Tracking flotte',
  tachy: 'Tachy activite conducteur',
  routing: 'Trafic et routage',
  eta: 'ETA intelligente',
  driver_session: 'Session chauffeur web',
  client_portal: 'Portail client',
  chat: 'Chat exploitation',
  ai: 'IA / ChatGPT',
}

const MODE_OPTIONS: Array<ModuleRow['mode']> = ['internal_only', 'hybrid', 'provider_preferred']
const FALLBACK_OPTIONS: Array<ModuleRow['fallback_strategy']> = ['internal_recompute', 'stale_cache', 'last_known']
const PROVIDER_TYPES: Array<ProviderRow['provider_type']> = ['tracking', 'tachy', 'routing', 'traffic', 'eta', 'chat', 'ai']

function parseNumber(value: unknown, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback
}

export function ErpV11Settings() {
  const [tenantKey, setTenantKey] = useState('default')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modules, setModules] = useState<ModuleRow[]>([])
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [mappings, setMappings] = useState<MappingRow[]>([])
  const [settings, setSettings] = useState<V11SettingsState>({})
  const [newProviderKey, setNewProviderKey] = useState('')
  const [newProviderType, setNewProviderType] = useState<ProviderRow['provider_type']>('tracking')
  const [newProviderBaseUrl, setNewProviderBaseUrl] = useState('')

  const providerCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const provider of providers) {
      counts[provider.provider_type] = (counts[provider.provider_type] ?? 0) + 1
    }
    return counts
  }, [providers])

  const mappingCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const mapping of mappings) {
      counts[mapping.object_name] = (counts[mapping.object_name] ?? 0) + 1
    }
    return counts
  }, [mappings])

  const fetchApi = useCallback(async (path: string, method: string, payload?: object) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Session utilisateur absente.')

    const response = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-tenant-key': tenantKey,
      },
      body: payload ? JSON.stringify(payload) : undefined,
    })

    const jsonPayload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(jsonPayload.error ?? `HTTP ${response.status}`)
    return jsonPayload
  }, [tenantKey])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchApi('/.netlify/functions/v11-admin-config?scope=all', 'GET')
      setModules((result.data?.modules ?? []) as ModuleRow[])
      setProviders((result.data?.providers ?? []) as ProviderRow[])
      setMappings((result.data?.mappings ?? []) as MappingRow[])
      setSettings((result.data?.settings ?? {}) as V11SettingsState)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [fetchApi])

  useEffect(() => {
    void load()
  }, [load])

  async function saveModule(next: ModuleRow) {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await fetchApi('/.netlify/functions/v11-admin-config?scope=modules', 'PUT', next)
      setNotice(`Module ${MODULE_LABELS[next.module_key]} mis a jour.`)
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function createProvider() {
    const providerKey = newProviderKey.trim()
    if (!providerKey) {
      setError('provider_key requis.')
      return
    }

    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await fetchApi('/.netlify/functions/v11-admin-config?scope=providers', 'PUT', {
        provider_key: providerKey,
        provider_type: newProviderType,
        enabled: true,
        priority: 100,
        base_url: newProviderBaseUrl.trim() || null,
        cache_ttl_sec: 120,
      })
      setNewProviderKey('')
      setNewProviderBaseUrl('')
      setNotice(`Provider ${providerKey} ajoute.`)
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Creation provider impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteProvider(providerKey: string) {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await fetchApi('/.netlify/functions/v11-admin-config?scope=providers', 'DELETE', {
        provider_key: providerKey,
      })
      setNotice(`Provider ${providerKey} supprime.`)
      await load()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Suppression provider impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function saveSettingsPatch(patch: Record<string, unknown>, label: string) {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await fetchApi('/.netlify/functions/v11-admin-config?scope=settings', 'PUT', { settings: patch })
      setNotice(`${label} enregistre.`)
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Mise a jour des reglages impossible.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-heading">ERP v1.1 - modules et providers</h3>
        <p className="mt-3 text-sm text-discreet">Chargement...</p>
      </section>
    )
  }

  return (
    <section id="v11" className="space-y-5 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">ERP v1.1</p>
          <h3 className="mt-1 text-lg font-semibold text-heading">Modules, providers, mapping API, cache, fallback, logs, IA</h3>
          <p className="mt-1 text-sm text-discreet">Architecture additionnelle en extension, offline-first et multi-tenant.</p>
        </div>
        <label className="text-sm text-secondary">
          Tenant key
          <input
            className="ml-2 rounded-lg border border-line-strong px-2 py-1 text-sm"
            value={tenantKey}
            onChange={event => setTenantKey(event.target.value.trim().toLowerCase() || 'default')}
          />
        </label>
      </div>

      {(error || notice) && (
        <div className={`rounded-xl border px-3 py-2 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error ?? notice}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-line p-4">
          <p className="text-sm font-semibold text-heading">Modules activables</p>
          <p className="mt-1 text-xs text-discreet">Tracking, tachy, routing, ETA, chauffeur web, portail client, chat, IA.</p>
          <div className="mt-3 space-y-2">
            {modules.map(moduleRow => (
              <div key={moduleRow.module_key} className="rounded-lg border border-line bg-surface-soft p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{MODULE_LABELS[moduleRow.module_key]}</p>
                  <label className="inline-flex items-center gap-2 text-xs text-secondary">
                    <input
                      type="checkbox"
                      checked={moduleRow.enabled}
                      disabled={saving}
                      onChange={event => void saveModule({ ...moduleRow, enabled: event.target.checked })}
                    />
                    active
                  </label>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-secondary">
                    mode
                    <select
                      className="mt-1 w-full rounded-md border border-line-strong bg-surface px-2 py-1"
                      value={moduleRow.mode}
                      onChange={event => void saveModule({ ...moduleRow, mode: event.target.value as ModuleRow['mode'] })}
                      disabled={saving}
                    >
                      {MODE_OPTIONS.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-secondary">
                    fallback
                    <select
                      className="mt-1 w-full rounded-md border border-line-strong bg-surface px-2 py-1"
                      value={moduleRow.fallback_strategy}
                      onChange={event => void saveModule({ ...moduleRow, fallback_strategy: event.target.value as ModuleRow['fallback_strategy'] })}
                      disabled={saving}
                    >
                      {FALLBACK_OPTIONS.map(strategy => <option key={strategy} value={strategy}>{strategy}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-line p-4">
            <p className="text-sm font-semibold text-heading">Providers multi-API</p>
            <p className="mt-1 text-xs text-discreet">Connecteurs concurrents sans modification du core ERP.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {PROVIDER_TYPES.map(providerType => (
                <div key={providerType} className="rounded-md border border-line bg-surface-soft px-2 py-1.5 text-xs text-foreground">
                  {providerType}: {providerCounts[providerType] ?? 0}
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <input
                className="rounded-md border border-line-strong px-2 py-1 text-sm"
                placeholder="provider_key"
                value={newProviderKey}
                onChange={event => setNewProviderKey(event.target.value)}
                disabled={saving}
              />
              <select
                className="rounded-md border border-line-strong bg-surface px-2 py-1 text-sm"
                value={newProviderType}
                onChange={event => setNewProviderType(event.target.value as ProviderRow['provider_type'])}
                disabled={saving}
              >
                {PROVIDER_TYPES.map(providerType => <option key={providerType} value={providerType}>{providerType}</option>)}
              </select>
              <button type="button" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-60" onClick={() => void createProvider()} disabled={saving}>
                Ajouter provider
              </button>
            </div>
            <input
              className="mt-2 w-full rounded-md border border-line-strong px-2 py-1 text-sm"
              placeholder="https://api.provider.tld"
              value={newProviderBaseUrl}
              onChange={event => setNewProviderBaseUrl(event.target.value)}
              disabled={saving}
            />
            <div className="mt-3 space-y-2">
              {providers.map(provider => (
                <div key={provider.provider_key} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface-soft px-3 py-2 text-xs">
                  <span>{provider.provider_key} ({provider.provider_type}) - {provider.enabled ? 'ON' : 'OFF'} - prio {provider.priority}</span>
                  <button type="button" className="rounded bg-rose-600 px-2 py-1 text-white disabled:opacity-60" onClick={() => void deleteProvider(provider.provider_key)} disabled={saving}>
                    Supprimer
                  </button>
                </div>
              ))}
              {providers.length === 0 && <p className="text-xs text-discreet">Aucun provider configure.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-line p-4">
            <p className="text-sm font-semibold text-heading">Mapping API vers langage universel</p>
            <p className="mt-1 text-xs text-discreet">Objets internes standards: VehiclePosition, DriverStatus, DrivingTimeStatus, TrafficStatus, RoutePlan, EtaPrediction.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(['VehiclePosition', 'DriverStatus', 'DrivingTimeStatus', 'TrafficStatus', 'RoutePlan', 'EtaPrediction'] as const).map(objectName => (
                <div key={objectName} className="rounded-md border border-line bg-surface-soft px-2 py-1.5 text-xs text-foreground">
                  {objectName}: {mappingCounts[objectName] ?? 0}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-discreet">Mappings actifs: {mappings.filter(mapping => mapping.is_active).length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SettingCard
          title="Cache / frequence"
          description="Limitation des appels API et priorite au recalcul interne."
          fields={[
            { key: 'v11.cache.default_ttl_sec', label: 'TTL cache (sec)', value: parseNumber(settings['v11.cache.default_ttl_sec'], 120) },
            { key: 'v11.providers.call_budget_per_min', label: 'Budget appels/min', value: parseNumber(settings['v11.providers.call_budget_per_min'], 60) },
          ]}
          onSave={(patch, label) => void saveSettingsPatch(patch, label)}
          saving={saving}
        />
        <SettingCard
          title="Fallback / logs"
          description="Comportement degrade si API indisponible."
          fields={[
            { key: 'v11.fallback.strategy', label: 'Strategie fallback', value: String(settings['v11.fallback.strategy'] ?? 'internal_recompute') },
            { key: 'v11.logs.retention_days', label: 'Retention logs (jours)', value: parseNumber(settings['v11.logs.retention_days'], 30) },
          ]}
          onSave={(patch, label) => void saveSettingsPatch(patch, label)}
          saving={saving}
        />
        <SettingCard
          title="IA settings"
          description="Endpoint IA serveur, multi-tenant, optimisation des appels."
          fields={[
            { key: 'v11.ai.enabled', label: 'IA active (true/false)', value: String(settings['v11.ai.enabled'] ?? true) },
            { key: 'v11.ai.model', label: 'Modele IA', value: String(settings['v11.ai.model'] ?? 'gpt-4.1-mini') },
            { key: 'v11.ai.cache_ttl_sec', label: 'TTL IA cache (sec)', value: parseNumber(settings['v11.ai.cache_ttl_sec'], 300) },
          ]}
          onSave={(patch, label) => void saveSettingsPatch(patch, label)}
          saving={saving}
        />
      </div>
    </section>
  )
}

type SettingField = {
  key: string
  label: string
  value: string | number
}

function SettingCard({
  title,
  description,
  fields,
  onSave,
  saving,
}: {
  title: string
  description: string
  fields: SettingField[]
  onSave: (patch: Record<string, unknown>, label: string) => void
  saving: boolean
}) {
  const [draft, setDraft] = useState<Record<string, string>>({})

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const field of fields) next[field.key] = String(field.value)
    setDraft(next)
  }, [fields])

  function save() {
    const patch: Record<string, unknown> = {}
    for (const field of fields) {
      const rawValue = (draft[field.key] ?? '').trim()
      if (rawValue === 'true') patch[field.key] = true
      else if (rawValue === 'false') patch[field.key] = false
      else if (/^-?\d+(\.\d+)?$/.test(rawValue)) patch[field.key] = Number(rawValue)
      else patch[field.key] = rawValue
    }
    onSave(patch, title)
  }

  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-sm font-semibold text-heading">{title}</p>
      <p className="mt-1 text-xs text-discreet">{description}</p>
      <div className="mt-3 space-y-2">
        {fields.map(field => (
          <label key={field.key} className="block text-xs text-secondary">
            {field.label}
            <input
              className="mt-1 w-full rounded-md border border-line-strong px-2 py-1 text-sm"
              value={draft[field.key] ?? ''}
              onChange={event => setDraft(current => ({ ...current, [field.key]: event.target.value }))}
              disabled={saving}
            />
          </label>
        ))}
      </div>
      <button type="button" className="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-60" onClick={save} disabled={saving}>
        Enregistrer
      </button>
    </div>
  )
}

