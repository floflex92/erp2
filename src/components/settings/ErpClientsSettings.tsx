import { useCallback, useEffect, useMemo, useState } from 'react'
import { ROLE_ACCESS, ROLE_LABELS, type Role } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

type TenantRow = {
  id: string
  tenant_key: string
  display_name: string
  is_active: boolean
  default_max_concurrent_screens: number
  allowed_pages: string[] | null
  company_id: number | null
  enabled_modules: string[] | null
  company_status: string | null
}

type TenantModule = 'dashboard' | 'planning' | 'fleet' | 'workshop' | 'hr' | 'accounting' | 'documents' | 'settings'

const ALL_TENANT_MODULES: TenantModule[] = [
  'dashboard', 'planning', 'fleet', 'workshop', 'hr', 'accounting', 'documents', 'settings',
]
const LEGACY_MODULE_SET = new Set<TenantModule>(ALL_TENANT_MODULES)

const LEGACY_MODULE_GROUPS: Record<TenantModule, string[]> = {
  dashboard: ['ops-center', 'dashboard', 'dashboard-conducteur', 'tasks', 'transports', 'demandes-clients', 'clients', 'prospection', 'espace-client', 'espace-affreteur', 'compte-client-db', 'tchat', 'mail', 'inter-erp', 'communication'],
  planning: ['planning', 'planning-conducteur', 'map-live', 'feuille-route'],
  fleet: ['vehicules', 'remorques', 'equipements', 'entrepots'],
  workshop: ['maintenance'],
  hr: ['chauffeurs', 'rh', 'entretiens-salaries', 'paie', 'frais', 'frais-rapide', 'tachygraphe', 'amendes'],
  accounting: ['facturation', 'comptabilite', 'reglements', 'tresorerie', 'analytique-transport'],
  documents: ['coffre'],
  settings: ['settings'],
}

const TENANT_MODULE_LABELS: Record<TenantModule, string> = {
  dashboard:  'Tableau de bord',
  planning:   'Planning & Transports',
  fleet:      'Flotte (vehicules, remorques, equipements)',
  workshop:   'Atelier & Maintenance',
  hr:         'RH, Conducteurs & Tachygraphe',
  accounting: 'Comptabilite & Facturation',
  documents:  'Coffre numerique',
  settings:   'Parametres',
}

const TENANT_MODULE_ICONS: Record<TenantModule, string> = {
  dashboard:  '📊',
  planning:   '🗓️',
  fleet:      '🚛',
  workshop:   '🔧',
  hr:         '👥',
  accounting: '💰',
  documents:  '🗂️',
  settings:   '⚙️',
}

type EmployeeRow = {
  id: string
  user_id: string | null
  role: string
  nom: string | null
  prenom: string | null
  matricule: string | null
  account_status: string | null
  account_type: string | null
  tenant_key: string | null
  max_concurrent_screens: number | null
  created_at: string
  updated_at: string
  email: string | null
  last_sign_in_at: string | null
}

type ApiPayload = {
  tenants: TenantRow[]
  employees: EmployeeRow[]
  allPageKeys: string[]
  allModuleKeys: string[]
}

const inp = 'w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-blue-500'

function normalizeAllowedPages(raw: string[] | null | undefined, allPageKeys: string[]) {
  if (Array.isArray(raw) && raw.length > 0) {
    const normalized = new Set(raw)
    if (normalized.has('dashboard')) normalized.add('dashboard-conducteur')
    if (normalized.has('planning')) normalized.add('planning-conducteur')
    if (normalized.has('frais')) normalized.add('frais-rapide')
    return Array.from(normalized)
  }
  return allPageKeys
}

function toLegacyTenantModules(raw: string[] | null | undefined): TenantModule[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...ALL_TENANT_MODULES]

  const normalized = raw
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)

  if (normalized.length === 0) return [...ALL_TENANT_MODULES]

  const hasLegacyTokens = normalized.some(token => LEGACY_MODULE_SET.has(token as TenantModule))
  if (hasLegacyTokens) {
    const legacy = normalized.filter((token): token is TenantModule => LEGACY_MODULE_SET.has(token as TenantModule))
    return legacy.length > 0 ? legacy : ['settings']
  }

  const detailedSet = new Set(normalized)
  const selected = ALL_TENANT_MODULES.filter(moduleKey => {
    const group = LEGACY_MODULE_GROUPS[moduleKey]
    return group.some(item => detailedSet.has(item))
  })

  return selected.length > 0 ? selected : ['settings']
}

export function ErpClientsSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [allPageKeys, setAllPageKeys] = useState<string[]>([])
  const [selectedTenantKey, setSelectedTenantKey] = useState('default')

  const [newTenantKey, setNewTenantKey] = useState('')
  const [newTenantName, setNewTenantName] = useState('')
  const [newTenantMaxScreens, setNewTenantMaxScreens] = useState(1)

  const selectedTenant = useMemo(
    () => tenants.find(tenant => tenant.tenant_key === selectedTenantKey) ?? tenants[0] ?? null,
    [selectedTenantKey, tenants],
  )

  const [tenantName, setTenantName] = useState('')
  const [tenantMaxScreens, setTenantMaxScreens] = useState(1)
  const [tenantIsActive, setTenantIsActive] = useState(true)
  const [tenantAllowedPages, setTenantAllowedPages] = useState<string[]>([])
  const [tenantEnabledModules, setTenantEnabledModules] = useState<TenantModule[]>(ALL_TENANT_MODULES)

  useEffect(() => {
    if (!selectedTenant) return
    setTenantName(selectedTenant.display_name)
    setTenantMaxScreens(selectedTenant.default_max_concurrent_screens ?? 1)
    setTenantIsActive(selectedTenant.is_active !== false)
    setTenantAllowedPages(normalizeAllowedPages(selectedTenant.allowed_pages, allPageKeys))
    setTenantEnabledModules(toLegacyTenantModules(selectedTenant.enabled_modules))
  }, [allPageKeys, selectedTenant])

  const tenantEmployees = useMemo(
    () => employees.filter(employee => (employee.tenant_key ?? 'default') === (selectedTenant?.tenant_key ?? 'default')),
    [employees, selectedTenant],
  )

  const unassignedEmployees = useMemo(
    () => employees.filter(employee => (employee.tenant_key ?? 'default') !== (selectedTenant?.tenant_key ?? 'default')),
    [employees, selectedTenant],
  )

  const allRolePages = useMemo(
    () => Array.from(new Set(Object.values(ROLE_ACCESS).flat())).sort((a, b) => a.localeCompare(b)),
    [],
  )

  const fetchApi = useCallback(async (method: 'GET' | 'POST' | 'PATCH', body?: object) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Session utilisateur absente.')

    const response = await fetch('/.netlify/functions/admin-erp-clients', {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`)
    return payload
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await fetchApi('GET') as ApiPayload
      setTenants(Array.isArray(payload.tenants) ? payload.tenants : [])
      setEmployees(Array.isArray(payload.employees) ? payload.employees : [])
      setAllPageKeys(Array.isArray(payload.allPageKeys) ? payload.allPageKeys : allRolePages)
      if (!selectedTenantKey && payload.tenants?.[0]?.tenant_key) {
        setSelectedTenantKey(payload.tenants[0].tenant_key)
      } else if (!payload.tenants.some(tenant => tenant.tenant_key === selectedTenantKey) && payload.tenants?.[0]?.tenant_key) {
        setSelectedTenantKey(payload.tenants[0].tenant_key)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.')
      setTenants([])
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }, [allRolePages, fetchApi, selectedTenantKey])

  useEffect(() => {
    void load()
  }, [load])

  async function createTenant() {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await fetchApi('POST', {
        tenant_key: newTenantKey,
        display_name: newTenantName,
        default_max_concurrent_screens: newTenantMaxScreens,
        allowed_pages: allRolePages,
        is_active: true,
      })
      setNewTenantKey('')
      setNewTenantName('')
      setNewTenantMaxScreens(1)
      setNotice('Client ERP cree.')
      await load()
      if (newTenantKey.trim()) setSelectedTenantKey(newTenantKey.trim().toLowerCase().replace(/[\s-]+/g, '_'))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Creation impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function saveTenant() {
    if (!selectedTenant) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await fetchApi('PATCH', {
        tenant_key: selectedTenant.tenant_key,
        display_name: tenantName,
        is_active: tenantIsActive,
        default_max_concurrent_screens: tenantMaxScreens,
        allowed_pages: tenantAllowedPages,
      })
      setNotice('Parametres client ERP mis a jour.')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function updateEmployee(employee: EmployeeRow, patch: Partial<EmployeeRow>) {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await fetchApi('PATCH', {
        kind: 'employee',
        profile_id: employee.id,
        tenant_key: patch.tenant_key ?? employee.tenant_key ?? 'default',
        role: patch.role ?? employee.role,
        account_status: patch.account_status ?? employee.account_status ?? 'actif',
        max_concurrent_screens: patch.max_concurrent_screens ?? employee.max_concurrent_screens ?? 1,
      })
      setNotice('Employe mis a jour.')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Mise a jour employe impossible.')
    } finally {
      setSaving(false)
    }
  }

  function toggleAllowedPage(page: string) {
    setTenantAllowedPages(current => current.includes(page) ? current.filter(item => item !== page) : [...current, page])
  }

  function toggleModule(mod: TenantModule) {
    setTenantEnabledModules(current =>
      current.includes(mod) ? current.filter(m => m !== mod) : [...current, mod],
    )
  }

  async function saveTenantModules() {
    if (!selectedTenant?.company_id) {
      setError('Ce tenant n\'a pas de company_id associe. Association requise avant de configurer les modules.')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await fetchApi('PATCH', {
        kind: 'modules',
        company_id: selectedTenant.company_id,
        enabled_modules: tenantEnabledModules,
      })
      setNotice('Modules (metiers) mis a jour pour ce tenant.')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Enregistrement modules impossible.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <p className="text-sm text-discreet">Chargement des clients ERP...</p>
      </section>
    )
  }

  return (
    <section className="space-y-5 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      {(error || notice) && (
        <div className={`rounded-xl border px-3 py-2 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error ?? notice}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-xl border border-line p-4">
            <p className="text-sm font-semibold text-heading">Clients ERP</p>
            <div className="mt-3 space-y-2">
              {tenants.map(tenant => (
                <button
                  key={tenant.tenant_key}
                  type="button"
                  onClick={() => setSelectedTenantKey(tenant.tenant_key)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${selectedTenantKey === tenant.tenant_key ? 'border-blue-500 bg-blue-50' : 'border-line bg-surface hover:bg-surface-soft'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-heading">{tenant.display_name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tenant.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-secondary'}`}>
                      {tenant.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-discreet">{tenant.tenant_key}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-line p-4">
            <p className="text-sm font-semibold text-heading">Nouveau client ERP</p>
            <div className="mt-3 space-y-3">
              <label className="block text-xs text-secondary">
                Clé technique
                <input className={inp} value={newTenantKey} onChange={event => setNewTenantKey(event.target.value)} placeholder="ex: transport_alpes" />
              </label>
              <label className="block text-xs text-secondary">
                Nom affiché
                <input className={inp} value={newTenantName} onChange={event => setNewTenantName(event.target.value)} placeholder="Transport Alpes" />
              </label>
              <label className="block text-xs text-secondary">
                Ecrans max par défaut
                <input className={inp} type="number" min={1} max={12} value={newTenantMaxScreens} onChange={event => setNewTenantMaxScreens(Math.max(1, Math.min(12, Number(event.target.value || 1))))} />
              </label>
              <button type="button" disabled={saving} onClick={() => void createTenant()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                Creer le client ERP
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {selectedTenant ? (
            <>
              <div className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Client ERP</p>
                    <h3 className="mt-1 text-lg font-semibold text-heading">{selectedTenant.display_name}</h3>
                    <p className="text-sm text-discreet">Tenant key: {selectedTenant.tenant_key}</p>
                  </div>
                  <button type="button" disabled={saving} onClick={() => void saveTenant()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                    Enregistrer
                  </button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-secondary">
                    Nom du client ERP
                    <input className={inp} value={tenantName} onChange={event => setTenantName(event.target.value)} />
                  </label>
                  <label className="block text-sm text-secondary">
                    Nombre d'ecrans max (applique aussi aux employes du client)
                    <input className={inp} type="number" min={1} max={12} value={tenantMaxScreens} onChange={event => setTenantMaxScreens(Math.max(1, Math.min(12, Number(event.target.value || 1))))} />
                  </label>
                </div>

                <label className="mt-4 inline-flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={tenantIsActive} onChange={event => setTenantIsActive(event.target.checked)} />
                  Client ERP actif
                </label>
              </div>

              <div className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-heading">Fonctionnalites autorisees</p>
                    <p className="mt-1 text-xs text-discreet">Les utilisateurs non admin de ce client ERP ne verront que ces modules.</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setTenantAllowedPages(allRolePages)} className="rounded-lg border border-line-strong px-3 py-1.5 text-xs">Tout activer</button>
                    <button type="button" onClick={() => setTenantAllowedPages([])} className="rounded-lg border border-line-strong px-3 py-1.5 text-xs">Tout couper</button>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {allRolePages.map(page => (
                    <label key={page} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-foreground">
                      <input type="checkbox" checked={tenantAllowedPages.includes(page)} onChange={() => toggleAllowedPage(page)} />
                      <span>{page}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ─ Metiers (modules) ──────────────────────────────────── */}
              <div className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-heading">Metiers actifs (modules)</p>
                    <p className="mt-1 text-xs text-discreet">
                      Active ou desactive un metier complet pour ce tenant.
                      {!selectedTenant?.company_id && (
                        <span className="ml-1 font-semibold text-amber-600">Associer d'abord ce tenant a une company pour activer cette fonction.</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setTenantEnabledModules([...ALL_TENANT_MODULES])} className="rounded-lg border border-line-strong px-3 py-1.5 text-xs">Tout activer</button>
                    <button type="button" onClick={() => setTenantEnabledModules([])} className="rounded-lg border border-line-strong px-3 py-1.5 text-xs">Tout couper</button>
                    <button
                      type="button"
                      disabled={saving || !selectedTenant?.company_id}
                      onClick={() => void saveTenantModules()}
                      className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    >
                      Enregistrer les metiers
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {ALL_TENANT_MODULES.map(mod => {
                    const enabled = tenantEnabledModules.includes(mod)
                    return (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => toggleModule(mod)}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                          enabled
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-900'
                            : 'border-line bg-surface-soft text-muted'
                        }`}
                      >
                        <span className="text-xl leading-none">{TENANT_MODULE_ICONS[mod]}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">{TENANT_MODULE_LABELS[mod]}</p>
                          <p className={`mt-0.5 text-[10px] font-medium ${enabled ? 'text-indigo-500' : 'text-muted'}`}>
                            {enabled ? 'Actif' : 'Desactive'}
                          </p>
                        </div>
                        <span className={`ml-auto h-3 w-3 shrink-0 rounded-full ${enabled ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-heading">Employes rattaches</p>
                    <p className="mt-1 text-xs text-discreet">Roles, statut, nombre d'ecrans et rattachement au client ERP.</p>
                  </div>
                  <span className="rounded-full bg-surface-2 px-2 py-1 text-xs font-semibold text-secondary">{tenantEmployees.length} employe(s)</span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-discreet">
                      <tr>
                        <th className="px-2 py-2">Employe</th>
                        <th className="px-2 py-2">Role</th>
                        <th className="px-2 py-2">Statut</th>
                        <th className="px-2 py-2">Ecrans</th>
                        <th className="px-2 py-2">Derniere connexion</th>
                        <th className="px-2 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantEmployees.map(employee => (
                        <tr key={employee.id} className="border-t border-slate-100">
                          <td className="px-2 py-2">
                            <div className="font-medium text-heading">{[employee.prenom, employee.nom].filter(Boolean).join(' ') || employee.email || 'Utilisateur'}</div>
                            <div className="text-xs text-discreet">{employee.email ?? employee.matricule ?? 'Sans email'}</div>
                          </td>
                          <td className="px-2 py-2">
                            <select className={inp} value={employee.role} onChange={event => void updateEmployee(employee, { role: event.target.value })}>
                              {(Object.entries(ROLE_LABELS) as Array<[Role, string]>).map(([role, label]) => (
                                <option key={role} value={role}>{label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <select className={inp} value={employee.account_status ?? 'actif'} onChange={event => void updateEmployee(employee, { account_status: event.target.value })}>
                              <option value="actif">Actif</option>
                              <option value="suspendu">Suspendu</option>
                              <option value="desactive">Desactive</option>
                              <option value="archive">Archive</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input className={inp} type="number" min={1} max={12} value={employee.max_concurrent_screens ?? 1} onChange={event => void updateEmployee(employee, { max_concurrent_screens: Math.max(1, Math.min(12, Number(event.target.value || 1))) })} />
                          </td>
                          <td className="px-2 py-2 text-xs text-discreet">{employee.last_sign_in_at ? new Date(employee.last_sign_in_at).toLocaleString('fr-FR') : 'Jamais'}</td>
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => void updateEmployee(employee, { tenant_key: 'default' })} className="rounded-lg border border-line-strong px-3 py-1.5 text-xs">Retirer</button>
                          </td>
                        </tr>
                      ))}
                      {tenantEmployees.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-2 py-6 text-center text-sm text-muted">Aucun employe rattache a ce client ERP.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-line p-4">
                <p className="text-sm font-semibold text-heading">Rattacher des comptes existants</p>
                <p className="mt-1 text-xs text-discreet">Tous les comptes hors de ce client ERP peuvent etre rattaches ici.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {unassignedEmployees.slice(0, 24).map(employee => (
                    <div key={employee.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                      <div>
                        <div className="text-sm font-medium text-heading">{[employee.prenom, employee.nom].filter(Boolean).join(' ') || employee.email || 'Utilisateur'}</div>
                        <div className="text-xs text-discreet">{employee.email ?? employee.matricule ?? 'Sans email'} · {(ROLE_LABELS[employee.role as Role] ?? employee.role)}</div>
                      </div>
                      <button type="button" onClick={() => void updateEmployee(employee, { tenant_key: selectedTenant.tenant_key, max_concurrent_screens: tenantMaxScreens })} className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs text-blue-700">
                        Rattacher
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-line p-5 text-sm text-discreet">Aucun client ERP disponible.</div>
          )}
        </div>
      </div>
    </section>
  )
}
