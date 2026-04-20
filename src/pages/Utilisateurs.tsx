import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROLE_LABELS, type Role, useAuth } from '@/lib/auth'
import type { Tables } from '@/lib/database.types'

type Profil = Tables<'profils'>
type ManagedUser = Profil & {
  email: string | null
  external_email?: string | null
  company_name?: string | null
  phone?: string | null
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  account_status?: string | null
  account_type?: string | null
  account_origin?: string | null
  is_demo_account?: boolean | null
  is_investor_account?: boolean | null
  requested_from_public_form?: boolean | null
  demo_expires_at?: string | null
  notes_admin?: string | null
  permissions?: string[] | null
  max_concurrent_screens?: number | null
}

type AccessRequest = {
  id: string
  full_name: string
  company_name: string
  email: string
  phone: string
  need_type: string
  request_status: string
  lead_status: string
  linked_profile_id: string | null
  created_at: string
  message: string | null
  notes_admin: string | null
}

type CompanyOption = {
  id: number
  name: string
  slug: string
}

type PermissionCatalogEntry = {
  name: string
  label: string
  resource: string
  action: string
}

type RoleChange = {
  id: string
  changed_at?: string | null
  previous_role?: string | null
  new_role?: string | null
  source?: string | null
  change_reason?: string | null
  target_profile_id?: string | null
}

type AuditEvent = {
  id: string
  created_at?: string | null
  admin_email?: string | null
  event_type?: string | null
  target_type?: string | null
  target_id?: string | null
  ip_hash?: string | null
  payload?: Record<string, unknown> | null
}

type PaginationInfo = {
  page: number
  page_size: number
  total: number
}

type AuditPaginationInfo = {
  page: number
  page_size: number
  total: number
  days: number
  search: string
}

type PermissionTemplate = {
  key: string
  label: string
  description: string
  matchRole?: Role
  pick: (entry: PermissionCatalogEntry) => boolean
}

type ExportJobStatus = 'queued' | 'running' | 'done' | 'failed'

type ExportJob = {
  id: string
  createdAt: string
  filters: {
    search: string
    filterRole: string
    filterStatus: string
    sortBy: string
    sortOrder: string
  }
  status: ExportJobStatus
  rowCount: number
  error?: string
}

type RecipeChecklist = {
  batchDone: boolean
  sortLastSignInDone: boolean
  exportCsvDone: boolean
  filtersPersistDone: boolean
  auditViewDone: boolean
}

const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary-soft)]'
const DEFAULT_ROLE: Role = 'dirigeant'
const FILTERS_STORAGE_KEY = 'utilisateurs_filters_v1'
const EXPORT_JOBS_STORAGE_KEY = 'utilisateurs_export_jobs_v1'
const RECIPE_STORAGE_KEY = 'utilisateurs_recipe_checklist_v1'

const DEFAULT_RECIPE_CHECKLIST: RecipeChecklist = {
  batchDone: false,
  sortLastSignInDone: false,
  exportCsvDone: false,
  filtersPersistDone: false,
  auditViewDone: false,
}

function readSavedFilters(): {
  search: string
  filterRole: string
  filterStatus: string
  sortBy: 'created_at' | 'nom' | 'role' | 'account_status' | 'last_sign_in_at'
  sortOrder: 'asc' | 'desc'
  pageSize: number
} {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY)
    if (!raw) {
      return {
        search: '',
        filterRole: 'all',
        filterStatus: 'all',
        sortBy: 'created_at',
        sortOrder: 'desc',
        pageSize: 20,
      }
    }

    const parsed = JSON.parse(raw) as Partial<{
      search: string
      filterRole: string
      filterStatus: string
      sortBy: 'created_at' | 'nom' | 'role' | 'account_status' | 'last_sign_in_at'
      sortOrder: 'asc' | 'desc'
      pageSize: number
    }>

    return {
      search: typeof parsed.search === 'string' ? parsed.search : '',
      filterRole: typeof parsed.filterRole === 'string' ? parsed.filterRole : 'all',
      filterStatus: typeof parsed.filterStatus === 'string' ? parsed.filterStatus : 'all',
      sortBy: parsed.sortBy === 'nom' || parsed.sortBy === 'role' || parsed.sortBy === 'account_status' || parsed.sortBy === 'last_sign_in_at' ? parsed.sortBy : 'created_at',
      sortOrder: parsed.sortOrder === 'asc' ? 'asc' : 'desc',
      pageSize: Number.isFinite(Number(parsed.pageSize)) ? Math.max(5, Math.min(100, Number(parsed.pageSize))) : 20,
    }
  } catch {
    return {
      search: '',
      filterRole: 'all',
      filterStatus: 'all',
      sortBy: 'created_at',
      sortOrder: 'desc',
      pageSize: 20,
    }
  }
}

function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '')
  if (/[",\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function readExportJobs(): ExportJob[] {
  try {
    const raw = localStorage.getItem(EXPORT_JOBS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readRecipeChecklist(): RecipeChecklist {
  try {
    const raw = localStorage.getItem(RECIPE_STORAGE_KEY)
    if (!raw) return DEFAULT_RECIPE_CHECKLIST
    const parsed = JSON.parse(raw) as Partial<RecipeChecklist>
    return {
      batchDone: parsed.batchDone === true,
      sortLastSignInDone: parsed.sortLastSignInDone === true,
      exportCsvDone: parsed.exportCsvDone === true,
      filtersPersistDone: parsed.filtersPersistDone === true,
      auditViewDone: parsed.auditViewDone === true,
    }
  } catch {
    return DEFAULT_RECIPE_CHECKLIST
  }
}

function diffAuditPayload(payload: AuditEvent['payload']) {
  const before = payload?.before && typeof payload.before === 'object' ? payload.before as Record<string, unknown> : null
  const after = payload?.after && typeof payload.after === 'object' ? payload.after as Record<string, unknown> : null
  if (!before || !after) return []

  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
  return keys
    .filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map(key => ({
      key,
      before: before[key] ?? '-',
      after: after[key] ?? '-',
    }))
}

async function adminRequest<T>(accessToken: string, method: 'GET' | 'POST' | 'PATCH', body?: unknown, query?: Record<string, string | number | null | undefined>): Promise<T> {
  const params = new URLSearchParams()
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue
      params.set(key, String(value))
    }
  }

  const url = params.size > 0
    ? `/.netlify/functions/admin-users?${params.toString()}`
    : '/.netlify/functions/admin-users'

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error ?? 'Operation impossible.')
  }
  return payload as T
}

export default function Utilisateurs() {
  const { session, isPlatformAdmin } = useAuth()
  const savedFilters = useMemo(() => readSavedFilters(), [])

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [roleChanges, setRoleChanges] = useState<RoleChange[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [permissionsCatalog, setPermissionsCatalog] = useState<PermissionCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [search, setSearch] = useState(savedFilters.search)
  const [filterRole, setFilterRole] = useState(savedFilters.filterRole)
  const [filterStatus, setFilterStatus] = useState(savedFilters.filterStatus)
  const [sortBy, setSortBy] = useState<'created_at' | 'nom' | 'role' | 'account_status' | 'last_sign_in_at'>(savedFilters.sortBy)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(savedFilters.sortOrder)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(savedFilters.pageSize)
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, page_size: savedFilters.pageSize, total: 0 })
  const [auditSearch, setAuditSearch] = useState('')
  const [auditDays, setAuditDays] = useState(90)
  const [auditPage, setAuditPage] = useState(1)
  const [auditPageSize, setAuditPageSize] = useState(25)
  const [auditPagination, setAuditPagination] = useState<AuditPaginationInfo>({ page: 1, page_size: 25, total: 0, days: 90, search: '' })

  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState<Role>(DEFAULT_ROLE)
  const [createNom, setCreateNom] = useState('')
  const [createPrenom, setCreatePrenom] = useState('')
  const [createAccountType, setCreateAccountType] = useState('test')
  const [createMaxScreens, setCreateMaxScreens] = useState(1)
  const [createTemplateKey, setCreateTemplateKey] = useState('')
  const [createPermissions, setCreatePermissions] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([])
  const [createCompanyId, setCreateCompanyId] = useState<number | null>(null)

  const [editId, setEditId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<Role>(DEFAULT_ROLE)
  const [editStatus, setEditStatus] = useState('actif')
  const [editType, setEditType] = useState('standard')
  const [editMaxScreens, setEditMaxScreens] = useState(1)
  const [editPermissions, setEditPermissions] = useState<string[]>([])
  const [editPermissionsCsv, setEditPermissionsCsv] = useState('')
  const [editTemplateKey, setEditTemplateKey] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editExternalEmail, setEditExternalEmail] = useState('')
  const [saving, setSaving] = useState(false)

  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string; name: string } | null>(null)
  const [confirmDeleteText, setConfirmDeleteText] = useState('')
  const [linkModal, setLinkModal] = useState<{ title: string; link: string } | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<'enable' | 'disable' | 'suspend' | 'archive'>('suspend')
  const [runningBulk, setRunningBulk] = useState(false)
  const [exportJobs, setExportJobs] = useState<ExportJob[]>(() => readExportJobs())
  const [recipeChecklist, setRecipeChecklist] = useState<RecipeChecklist>(() => readRecipeChecklist())

  const roleLabelByName = useMemo(() => {
    const grouped = new Map<string, PermissionCatalogEntry[]>()
    for (const entry of permissionsCatalog) {
      const bucket = grouped.get(entry.resource) ?? []
      bucket.push(entry)
      grouped.set(entry.resource, bucket)
    }
    return grouped
  }, [permissionsCatalog])

  const permissionTemplates = useMemo<PermissionTemplate[]>(() => [
    {
      key: 'exploitant_standard',
      label: 'Exploitant standard',
      description: 'Planification, transports, suivi terrain',
      matchRole: 'exploitant',
      pick: entry => ['planning', 'transport', 'transports', 'tracking', 'map', 'eta', 'routing'].some(token => entry.name.includes(token) || entry.resource.includes(token)),
    },
    {
      key: 'atelier_responsable',
      label: 'Responsable atelier',
      description: 'Maintenance, flotte, conformite',
      matchRole: 'mecanicien',
      pick: entry => ['maintenance', 'vehicule', 'flotte', 'tachy', 'conformite', 'amende', 'equipement'].some(token => entry.name.includes(token) || entry.resource.includes(token)),
    },
    {
      key: 'commercial_senior',
      label: 'Commercial senior',
      description: 'Clients, demandes, prospection, facturation lecture',
      matchRole: 'commercial',
      pick: entry => ['client', 'prospection', 'demande', 'crm', 'factur'].some(token => entry.name.includes(token) || entry.resource.includes(token)),
    },
  ], [])

  const securityAlerts = useMemo(() => {
    return auditEvents
      .filter(event => ['admin_user_deleted', 'admin_users_bulk_action', 'admin_user_updated'].includes(String(event.event_type ?? '')))
      .map(event => {
        const diff = diffAuditPayload(event.payload)
        const criticalRoleChange = diff.some(item => item.key === 'role' && (String(item.after) === 'admin' || String(item.after) === 'super_admin' || String(item.after) === 'dirigeant'))
        const bulkCount = Number((event.payload as Record<string, unknown> | null)?.count ?? 0)
        const isBulkMassive = event.event_type === 'admin_users_bulk_action' && bulkCount >= 5
        const severity = (event.event_type === 'admin_user_deleted' || isBulkMassive || criticalRoleChange) ? 'high' : 'medium'
        return {
          id: event.id,
          severity,
          createdAt: event.created_at,
          label: event.event_type ?? 'audit',
          detail: criticalRoleChange
            ? 'Changement vers role privilegie detecte.'
            : (isBulkMassive ? `Action en lot massive (${bulkCount} comptes).` : 'Action sensible detectee.'),
        }
      })
      .slice(0, 5)
  }, [auditEvents])

  const load = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    setError(null)
    try {
      const data = await adminRequest<{
        users: ManagedUser[]
        requests: AccessRequest[]
        role_changes?: RoleChange[]
        audit_events?: AuditEvent[]
        audit_pagination?: AuditPaginationInfo
        permissions_catalog?: PermissionCatalogEntry[]
        pagination?: PaginationInfo
      }>(session.access_token, 'GET', undefined, {
        search,
        filter_role: filterRole,
        filter_status: filterStatus,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize,
        audit_search: auditSearch,
        audit_days: auditDays,
        audit_page: auditPage,
        audit_page_size: auditPageSize,
      })
      setUsers(Array.isArray(data.users) ? data.users : [])
      setRequests(Array.isArray(data.requests) ? data.requests : [])
      setRoleChanges(Array.isArray(data.role_changes) ? data.role_changes : [])
      setAuditEvents(Array.isArray(data.audit_events) ? data.audit_events : [])
      setAuditPagination(data.audit_pagination ?? { page: auditPage, page_size: auditPageSize, total: Array.isArray(data.audit_events) ? data.audit_events.length : 0, days: auditDays, search: auditSearch })
      setPermissionsCatalog(Array.isArray(data.permissions_catalog) ? data.permissions_catalog : [])
      setPagination(data.pagination ?? { page, page_size: pageSize, total: Array.isArray(data.users) ? data.users.length : 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.')
      setUsers([])
      setRequests([])
      setRoleChanges([])
      setAuditEvents([])
      setAuditPagination({ page: 1, page_size: auditPageSize, total: 0, days: auditDays, search: auditSearch })
      setPermissionsCatalog([])
      setPagination({ page: 1, page_size: pageSize, total: 0 })
    } finally {
      setLoading(false)
    }
  }, [auditDays, auditPage, auditPageSize, auditSearch, filterRole, filterStatus, page, pageSize, search, session?.access_token, sortBy, sortOrder])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [search, filterRole, filterStatus, sortBy, sortOrder, pageSize])

  useEffect(() => {
    setAuditPage(1)
  }, [auditSearch, auditDays, auditPageSize])

  useEffect(() => {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({
      search,
      filterRole,
      filterStatus,
      sortBy,
      sortOrder,
      pageSize,
    }))
    setRecipeChecklist(current => current.filtersPersistDone ? current : { ...current, filtersPersistDone: true })
  }, [filterRole, filterStatus, pageSize, search, sortBy, sortOrder])

  useEffect(() => {
    localStorage.setItem(EXPORT_JOBS_STORAGE_KEY, JSON.stringify(exportJobs))
  }, [exportJobs])

  useEffect(() => {
    localStorage.setItem(RECIPE_STORAGE_KEY, JSON.stringify(recipeChecklist))
  }, [recipeChecklist])

  useEffect(() => {
    if (sortBy === 'last_sign_in_at') {
      setRecipeChecklist(current => ({ ...current, sortLastSignInDone: true }))
    }
  }, [sortBy])

  useEffect(() => {
    if (auditEvents.length > 0) {
      setRecipeChecklist(current => ({ ...current, auditViewDone: true }))
    }
  }, [auditEvents.length])

  useEffect(() => {
    setSelectedUserIds([])
  }, [users])

  useEffect(() => {
    let active = true
    if (!session?.access_token || !isPlatformAdmin) {
      setCompanyOptions([])
      setCreateCompanyId(null)
      return
    }

    void (async () => {
      try {
        const response = await fetch('/.netlify/functions/v11-companies', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const body = await response.json().catch(() => ({})) as { companies?: CompanyOption[] }
        if (!response.ok || !active) return
        const rows = Array.isArray(body.companies) ? body.companies : []
        setCompanyOptions(rows)
        if (rows.length > 0) {
          setCreateCompanyId(current => current ?? rows[0].id)
        }
      } catch {
        if (!active) return
        setCompanyOptions([])
      }
    })()

    return () => {
      active = false
    }
  }, [isPlatformAdmin, session?.access_token])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(user => {
      const fullname = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim().toLowerCase()
      const matchQuery = q.length === 0
        || fullname.includes(q)
        || (user.email ?? '').toLowerCase().includes(q)
        || (user.external_email ?? '').toLowerCase().includes(q)
      const matchRole = filterRole === 'all' || user.role === filterRole
      const status = user.account_status ?? 'actif'
      const matchStatus = filterStatus === 'all' || status === filterStatus
      return matchQuery && matchRole && matchStatus
    })
  }, [filterRole, filterStatus, search, users])

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / Math.max(1, pagination.page_size || pageSize)))
  const auditTotalPages = Math.max(1, Math.ceil((auditPagination.total || 0) / Math.max(1, auditPagination.page_size || auditPageSize)))
  const selectedSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds])
  const companyById = useMemo(() => new Map(companyOptions.map(company => [company.id, company.name])), [companyOptions])

  function startEdit(user: ManagedUser) {
    setEditId(user.id)
    setEditRole((user.role as Role) ?? DEFAULT_ROLE)
    setEditStatus(user.account_status ?? 'actif')
    setEditType(user.account_type ?? 'standard')
    setEditMaxScreens(Math.max(1, Math.min(12, Number(user.max_concurrent_screens ?? 1))))
    const perms = Array.isArray(user.permissions) ? user.permissions.filter((item): item is string => typeof item === 'string') : []
    setEditPermissions(perms)
    setEditPermissionsCsv(perms.join(', '))
    setEditTemplateKey('')
    setEditNotes(user.notes_admin ?? '')
    setEditExternalEmail(user.external_email ?? user.email ?? '')
  }

  function applyPermissionTemplate(templateKey: string, target: 'create' | 'edit') {
    const template = permissionTemplates.find(item => item.key === templateKey)
    if (!template) return
    const selected = permissionsCatalog.filter(entry => template.pick(entry)).map(entry => entry.name)
    if (target === 'create') {
      setCreateTemplateKey(templateKey)
      setCreatePermissions(selected)
      return
    }
    setEditTemplateKey(templateKey)
    setEditPermissions(selected)
  }

  function toggleEditPermission(permissionName: string) {
    setEditPermissions(current => {
      if (current.includes(permissionName)) return current.filter(item => item !== permissionName)
      return [...current, permissionName]
    })
  }

  async function saveEdit() {
    if (!session?.access_token || !editId) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await adminRequest(session.access_token, 'PATCH', {
        id: editId,
        role: editRole,
        account_status: editStatus,
        account_type: editType,
        max_concurrent_screens: editMaxScreens,
        external_email: editExternalEmail,
        notes_admin: editNotes,
        permissions: permissionsCatalog.length > 0
          ? editPermissions
          : editPermissionsCsv.split(',').map(item => item.trim()).filter(Boolean),
      })
      setEditId(null)
      setNotice('Compte mis a jour.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise a jour impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function applyAction(id: string, action: 'enable' | 'disable' | 'suspend' | 'archive' | 'delete', options?: { confirmationText?: string }) {
    if (!session?.access_token) return
    setConfirmAction(null)
    setConfirmDeleteText('')
    setError(null)
    setNotice(null)
    try {
      await adminRequest(session.access_token, 'PATCH', {
        id,
        action,
        confirmation_text: options?.confirmationText,
      })
      setNotice('Action appliquee.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.')
    }
  }

  async function applyBulkAction() {
    if (!session?.access_token || selectedUserIds.length === 0) return
    setRunningBulk(true)
    setError(null)
    setNotice(null)
    try {
      await adminRequest(session.access_token, 'PATCH', { ids: selectedUserIds, action: bulkAction })
      setNotice(`Action ${bulkAction} appliquee sur ${selectedUserIds.length} compte(s).`)
      setRecipeChecklist(current => ({ ...current, batchDone: true }))
      setSelectedUserIds([])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action en lot impossible.')
    } finally {
      setRunningBulk(false)
    }
  }

  async function requestLink(id: string, action: 'reset_password' | 'magic_link') {
    if (!session?.access_token) return
    setError(null)
    try {
      const data = await adminRequest<{ ok: boolean; recovery_link?: string; magic_link?: string }>(
        session.access_token, 'PATCH', { id, action }
      )
      const link = data.recovery_link ?? data.magic_link ?? ''
      setLinkModal({
        title: action === 'reset_password' ? 'Lien de reinitialisation MDP' : 'Lien de connexion magique',
        link,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de generer le lien.')
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.access_token) return
    if (isPlatformAdmin && !createCompanyId) {
      setError('Selectionnez un tenant cible avant de creer le compte.')
      return
    }
    setCreating(true)
    setError(null)
    setNotice(null)
    try {
      const payload = await adminRequest<{ user: { email: string; external_email?: string | null; role: string } }>(session.access_token, 'POST', {
        email: createEmail,
        external_email: createEmail,
        company_id: isPlatformAdmin ? createCompanyId : undefined,
        password: createPassword,
        role: createRole,
        nom: createNom,
        prenom: createPrenom,
        account_type: createAccountType,
        max_concurrent_screens: createMaxScreens,
        permissions: createPermissions,
        account_origin: 'manuel_admin',
        is_demo_account: createAccountType === 'test' || createAccountType === 'demo',
        is_investor_account: createAccountType === 'investisseur',
      })
      setCreateEmail('')
      setCreatePassword('')
      setCreateRole(DEFAULT_ROLE)
      setCreateNom('')
      setCreatePrenom('')
      setCreateAccountType('test')
      setCreateMaxScreens(1)
      setCreateTemplateKey('')
      setCreatePermissions([])
      setNotice(`Compte cree pour ${payload.user.external_email ?? payload.user.email} (${payload.user.role}).`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation impossible.')
    } finally {
      setCreating(false)
    }
  }

  async function createFromRequest(request: AccessRequest) {
    if (!session?.access_token) return
    if (isPlatformAdmin && !createCompanyId) {
      setError('Selectionnez un tenant cible avant de creer le compte.')
      return
    }
    setError(null)
    setNotice(null)
    try {
      await adminRequest(session.access_token, 'POST', {
        email: request.email,
        external_email: request.email,
        company_id: isPlatformAdmin ? createCompanyId : undefined,
        role: DEFAULT_ROLE,
        nom: request.full_name.split(' ').slice(1).join(' ') || request.full_name,
        prenom: request.full_name.split(' ')[0] || request.full_name,
        account_type: request.need_type === 'investisseur' ? 'investisseur' : 'test',
        account_origin: 'demande_page_connexion',
        requested_from_public_form: true,
        request_id: request.id,
      })
      setNotice('Compte cree depuis la demande avec mot de passe genere cote serveur.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation impossible depuis la demande.')
    }
  }

  function toggleSelection(id: string) {
    setSelectedUserIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  function toggleSelectPage() {
    const ids = filteredUsers.map(user => user.id)
    const allSelected = ids.every(id => selectedSet.has(id))
    if (allSelected) {
      setSelectedUserIds(current => current.filter(id => !ids.includes(id)))
      return
    }
    setSelectedUserIds(current => Array.from(new Set([...current, ...ids])))
  }

  async function generateUsersCsv(jobId?: string) {
    if (!session?.access_token) return { rowCount: 0 }

    const collected: ManagedUser[] = []
    const exportPageSize = 100
    let exportPage = 1
    let total = 0

    do {
      const data = await adminRequest<{
        users: ManagedUser[]
        pagination?: PaginationInfo
      }>(session.access_token, 'GET', undefined, {
        search,
        filter_role: filterRole,
        filter_status: filterStatus,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: exportPage,
        page_size: exportPageSize,
      })

      const rows = Array.isArray(data.users) ? data.users : []
      collected.push(...rows)
      total = data.pagination?.total ?? rows.length
      exportPage += 1
    } while (collected.length < total)

    const headers = [
      'id',
      'prenom',
      'nom',
      'societe',
      'email_externe',
      'telephone',
      'role',
      'statut',
      'type_compte',
      'origine',
      'date_creation',
      'derniere_connexion',
    ]

    const lines = [
      headers.join(';'),
      ...collected.map(user => [
        user.id,
        user.prenom ?? '',
        user.nom ?? '',
        user.company_name ?? '',
        user.external_email ?? user.email ?? '',
        user.phone ?? '',
        user.role,
        user.account_status ?? 'actif',
        user.account_type ?? 'standard',
        user.account_origin ?? 'manuel_admin',
        user.created_at,
        user.last_sign_in_at ?? '',
      ].map(escapeCsvCell).join(';')),
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    const suffix = jobId ? `_${jobId.slice(0, 8)}` : ''
    anchor.download = `utilisateurs_export_${new Date().toISOString().slice(0, 10)}${suffix}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)

    return { rowCount: collected.length }
  }

  function queueCsvExport() {
    const job: ExportJob = {
      id: `job_${Date.now()}`,
      createdAt: new Date().toISOString(),
      filters: {
        search,
        filterRole,
        filterStatus,
        sortBy,
        sortOrder,
      },
      status: 'queued',
      rowCount: 0,
    }

    setExportJobs(current => [job, ...current].slice(0, 20))
    setNotice('Export CSV planifie en arriere-plan.')
    setError(null)

    void (async () => {
      setExportJobs(current => current.map(item => item.id === job.id ? { ...item, status: 'running' } : item))
      try {
        const result = await generateUsersCsv(job.id)
        setExportJobs(current => current.map(item => item.id === job.id ? { ...item, status: 'done', rowCount: result.rowCount } : item))
        setNotice(`Export CSV termine (${result.rowCount} ligne(s)).`)
        setRecipeChecklist(current => ({ ...current, exportCsvDone: true }))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Export CSV impossible.'
        setExportJobs(current => current.map(item => item.id === job.id ? { ...item, status: 'failed', error: message } : item))
        setError(message)
      }
    })()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Comptes de demonstration et acces</h2>
        <p className="mt-1 text-sm text-slate-500">Gestion complete des comptes, roles, droits et demandes publiques.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-800">Perimetre des ecrans utilisateurs</p>
        <p className="mt-1">Cette page pilote les comptes globaux, les actions sensibles et l audit des changements de role.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/tenant-admin" className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100">Reglages tenant</Link>
          <Link to="/compte-client-db" className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100">Compte client DB</Link>
        </div>
      </div>

      {(error || notice) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error ?? notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Creer un compte</h3>
          <p className="mt-1 text-sm text-slate-500">Tout nouveau compte est en role dirigeant par defaut. L email externe est renseigne dans les parametres utilisateur.</p>
          <form onSubmit={createUser} className="mt-4 grid grid-cols-2 gap-3">
            {isPlatformAdmin && (
              <Field label="Tenant cible">
                <select
                  className={inp}
                  value={createCompanyId ?? ''}
                  onChange={e => setCreateCompanyId(Number(e.target.value || 0) || null)}
                  required
                >
                  {companyOptions.length === 0 && <option value="">Aucun tenant charge</option>}
                  {companyOptions.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name} ({company.slug})
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Email externe"><input className={inp} type="email" required value={createEmail} onChange={e => setCreateEmail(e.target.value)} /></Field>
            <Field label="Mot de passe provisoire"><input className={inp} type="text" minLength={8} required value={createPassword} onChange={e => setCreatePassword(e.target.value)} /></Field>
            <Field label="Prenom"><input className={inp} value={createPrenom} onChange={e => setCreatePrenom(e.target.value)} /></Field>
            <Field label="Nom"><input className={inp} value={createNom} onChange={e => setCreateNom(e.target.value)} /></Field>
            <Field label="Role">
              <select className={inp} value={createRole} onChange={e => setCreateRole(e.target.value as Role)}>
                {(Object.entries(ROLE_LABELS) as Array<[Role, string]>).map(([role, label]) => (
                  <option key={role} value={role}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Type de compte">
              <select className={inp} value={createAccountType} onChange={e => setCreateAccountType(e.target.value)}>
                <option value="standard">Standard</option>
                <option value="test">Test</option>
                <option value="prospect">Prospect</option>
                <option value="investisseur">Investisseur</option>
                <option value="demo">Demo</option>
              </select>
            </Field>
            <Field label="Ecrans max simultanes">
              <input
                className={inp}
                type="number"
                min={1}
                max={12}
                value={createMaxScreens}
                onChange={e => setCreateMaxScreens(Math.max(1, Math.min(12, Number(e.target.value || 1))))}
              />
            </Field>
            <Field label="Template permissions">
              <select
                className={inp}
                value={createTemplateKey}
                onChange={e => applyPermissionTemplate(e.target.value, 'create')}
              >
                <option value="">Aucun template</option>
                {permissionTemplates.map(template => (
                  <option key={template.key} value={template.key}>{template.label}</option>
                ))}
              </select>
              {createTemplateKey && (
                <p className="mt-1 text-xs text-slate-500">{permissionTemplates.find(item => item.key === createTemplateKey)?.description ?? ''}</p>
              )}
            </Field>
            <div className="col-span-2 flex justify-end">
              <button type="submit" disabled={creating} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
                {creating ? 'Creation...' : 'Creer le compte'}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Filtres</h3>
          <div className="mt-4 space-y-3">
            <Field label="Recherche">
              <input className={inp} placeholder="Nom, email externe" value={search} onChange={e => setSearch(e.target.value)} />
            </Field>
            <Field label="Role">
              <select className={inp} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="all">Tous</option>
                {(Object.entries(ROLE_LABELS) as Array<[Role, string]>).map(([role, label]) => (
                  <option key={role} value={role}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Statut">
              <select className={inp} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">Tous</option>
                <option value="actif">Actif</option>
                <option value="suspendu">Suspendu</option>
                <option value="desactive">Desactive</option>
                <option value="archive">Archive</option>
              </select>
            </Field>
            <Field label="Tri">
              <select className={inp} value={sortBy} onChange={e => setSortBy(e.target.value as 'created_at' | 'nom' | 'role' | 'account_status' | 'last_sign_in_at')}>
                <option value="created_at">Date creation</option>
                <option value="last_sign_in_at">Derniere connexion</option>
                <option value="nom">Nom</option>
                <option value="role">Role</option>
                <option value="account_status">Statut</option>
              </select>
            </Field>
            <Field label="Ordre">
              <select className={inp} value={sortOrder} onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}>
                <option value="desc">Decroissant</option>
                <option value="asc">Croissant</option>
              </select>
            </Field>
            <Field label="Lignes par page">
              <select className={inp} value={pageSize} onChange={e => setPageSize(Math.max(5, Math.min(100, Number(e.target.value || 20))))}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-medium text-slate-700">Actions en lot</div>
          <select className="rounded border border-slate-300 px-3 py-1.5 text-sm" value={bulkAction} onChange={e => setBulkAction(e.target.value as 'enable' | 'disable' | 'suspend' | 'archive')}>
            <option value="enable">Activer</option>
            <option value="suspend">Suspendre</option>
            <option value="disable">Desactiver</option>
            <option value="archive">Archiver</option>
          </select>
          <button
            type="button"
            disabled={runningBulk || selectedUserIds.length === 0}
            onClick={() => void applyBulkAction()}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {runningBulk ? 'Traitement...' : `Appliquer sur ${selectedUserIds.length} compte(s)`}
          </button>
          <button
            type="button"
            onClick={queueCsvExport}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export CSV (filtres actifs)
          </button>
        </div>
        <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <p className="font-semibold text-slate-800">Historique exports CSV</p>
          <div className="mt-2 space-y-1">
            {exportJobs.slice(0, 5).map(job => (
              <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2 py-1.5">
                <span>{new Date(job.createdAt).toLocaleString('fr-FR')}</span>
                <span className="font-medium">{job.status}</span>
                <span>{job.rowCount} ligne(s)</span>
                <span className="text-slate-500">{job.filters.sortBy} / {job.filters.sortOrder}</span>
              </div>
            ))}
            {exportJobs.length === 0 && <p className="text-slate-500">Aucun export lance.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Recette guidee Utilisateurs</p>
            <p className="text-xs text-slate-500">Valider chaque point puis cocher pour boucler la recette fonctionnelle.</p>
          </div>
          <button
            type="button"
            onClick={() => setRecipeChecklist(DEFAULT_RECIPE_CHECKLIST)}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs"
          >
            Reinitialiser la checklist
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <label className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"><input type="checkbox" checked={recipeChecklist.batchDone} onChange={e => setRecipeChecklist(current => ({ ...current, batchDone: e.target.checked }))} />Action en lot</label>
          <label className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"><input type="checkbox" checked={recipeChecklist.sortLastSignInDone} onChange={e => setRecipeChecklist(current => ({ ...current, sortLastSignInDone: e.target.checked }))} />Tri derniere connexion</label>
          <label className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"><input type="checkbox" checked={recipeChecklist.exportCsvDone} onChange={e => setRecipeChecklist(current => ({ ...current, exportCsvDone: e.target.checked }))} />Export CSV</label>
          <label className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"><input type="checkbox" checked={recipeChecklist.filtersPersistDone} onChange={e => setRecipeChecklist(current => ({ ...current, filtersPersistDone: e.target.checked }))} />Persist filtres</label>
          <label className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"><input type="checkbox" checked={recipeChecklist.auditViewDone} onChange={e => setRecipeChecklist(current => ({ ...current, auditViewDone: e.target.checked }))} />Journal audit</label>
        </div>
      </div>

      {securityAlerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
          <p className="font-semibold">Alertes securite admin</p>
          <div className="mt-2 space-y-2">
            {securityAlerts.map(alert => (
              <div key={alert.id} className="rounded border border-amber-300/60 bg-white px-3 py-2 text-xs">
                <p className="font-semibold uppercase tracking-wide">{alert.severity === 'high' ? 'Critique' : 'Attention'} - {alert.label}</p>
                <p className="mt-1">{alert.detail}</p>
                <p className="mt-1 text-amber-700">{alert.createdAt ? new Date(alert.createdAt).toLocaleString('fr-FR') : '-'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Chargement...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <input type="checkbox" checked={filteredUsers.length > 0 && filteredUsers.every(user => selectedSet.has(user.id))} onChange={toggleSelectPage} />
                </th>
                {['Nom', 'Societe', 'Email externe', 'Telephone', 'Role', 'Statut', 'Type', 'Creation', 'Derniere connexion', 'Origine', 'Actions'].map(header => (
                  <th key={header} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 align-top"><input type="checkbox" checked={selectedSet.has(user.id)} onChange={() => toggleSelection(user.id)} /></td>
                  <td className="px-3 py-2 font-medium text-slate-700">{[user.prenom, user.nom].filter(Boolean).join(' ') || 'Non renseigne'}</td>
                  <td className="px-3 py-2 text-slate-500">{user.company_name ?? (typeof user.company_id === 'number' ? (companyById.get(user.company_id) ?? `Tenant #${user.company_id}`) : '-')}</td>
                  <td className="px-3 py-2 text-slate-600">{user.external_email ?? user.email ?? 'N/A'}</td>
                  <td className="px-3 py-2 text-slate-500">{user.phone ?? '-'}</td>
                  <td className="px-3 py-2">
                    {editId === user.id ? (
                      <select className={inp} value={editRole} onChange={e => setEditRole(e.target.value as Role)}>
                        {(Object.entries(ROLE_LABELS) as Array<[Role, string]>).map(([role, label]) => (
                          <option key={role} value={role}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      ROLE_LABELS[user.role as Role] ?? user.role
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editId === user.id ? (
                      <select className={inp} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                        <option value="actif">Actif</option>
                        <option value="suspendu">Suspendu</option>
                        <option value="desactive">Desactive</option>
                        <option value="archive">Archive</option>
                      </select>
                    ) : (
                      <StatusBadge status={user.account_status ?? 'actif'} />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editId === user.id ? (
                      <div className="space-y-2">
                        <select className={inp} value={editType} onChange={e => setEditType(e.target.value)}>
                          <option value="standard">Standard</option>
                          <option value="test">Test</option>
                          <option value="prospect">Prospect</option>
                          <option value="investisseur">Investisseur</option>
                          <option value="demo">Demo</option>
                        </select>
                        <select
                          className={inp}
                          value={editTemplateKey}
                          onChange={e => applyPermissionTemplate(e.target.value, 'edit')}
                        >
                          <option value="">Template permissions</option>
                          {permissionTemplates.map(template => (
                            <option key={template.key} value={template.key}>{template.label}</option>
                          ))}
                        </select>
                        <input
                          className={inp}
                          type="number"
                          min={1}
                          max={12}
                          value={editMaxScreens}
                          onChange={e => setEditMaxScreens(Math.max(1, Math.min(12, Number(e.target.value || 1))))}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div>{user.account_type ?? 'standard'}</div>
                        <div className="text-xs text-slate-500">{user.max_concurrent_screens ?? 1} ecran(s) max</div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('fr-FR') : 'Jamais'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{user.account_origin ?? 'manuel_admin'}</td>
                  <td className="px-3 py-2">
                    {editId === user.id ? (
                      <div className="space-y-2">
                        {permissionsCatalog.length > 0 ? (
                          <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-2">
                            <p className="text-xs font-medium text-slate-600">Permissions structurees</p>
                            {[...roleLabelByName.entries()].map(([resource, entries]) => (
                              <div key={resource} className="space-y-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{resource}</p>
                                <div className="flex flex-wrap gap-2">
                                  {entries.map(entry => (
                                    <label key={entry.name} className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={editPermissions.includes(entry.name)}
                                        onChange={() => toggleEditPermission(entry.name)}
                                      />
                                      <span>{entry.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <textarea className={inp} rows={2} value={editPermissionsCsv} onChange={e => setEditPermissionsCsv(e.target.value)} placeholder="permissions (csv)" />
                        )}
                        <input className={inp} type="email" value={editExternalEmail} onChange={e => setEditExternalEmail(e.target.value)} placeholder="email externe" />
                        <textarea className={inp} rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="note interne" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditId(null)} className="rounded border border-slate-300 px-2 py-1 text-xs">Annuler</button>
                          <button type="button" disabled={saving} onClick={() => void saveEdit()} className="rounded bg-slate-800 px-2 py-1 text-xs text-white">Sauver</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => startEdit(user)} className="rounded border border-slate-300 px-2 py-1 text-xs">Editer</button>
                        <button type="button" onClick={() => void applyAction(user.id, 'enable')} className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Activer</button>
                        <button type="button" onClick={() => void applyAction(user.id, 'suspend')} className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700">Suspendre</button>
                        <button type="button" onClick={() => void applyAction(user.id, 'disable')} className="rounded border border-orange-300 px-2 py-1 text-xs text-orange-700">Desactiver</button>
                        <button type="button" onClick={() => void requestLink(user.id, 'reset_password')} className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700">Reinit. MDP</button>
                        <button type="button" onClick={() => void requestLink(user.id, 'magic_link')} className="rounded border border-violet-300 px-2 py-1 text-xs text-violet-700">Lien magique</button>
                        <button type="button" onClick={() => setConfirmAction({ id: user.id, action: 'archive', name: [user.prenom, user.nom].filter(Boolean).join(' ') || user.email || user.id })} className="rounded border border-slate-300 px-2 py-1 text-xs">Archiver</button>
                        <button type="button" onClick={() => setConfirmAction({ id: user.id, action: 'delete', name: [user.prenom, user.nom].filter(Boolean).join(' ') || user.email || user.id })} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">Supprimer</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-sm text-slate-400">Aucun compte ne correspond aux filtres.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
        <div>{pagination.total} compte(s) au total</div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))} className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40">Precedent</button>
          <span>Page {page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(current => Math.min(totalPages, current + 1))} className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40">Suivant</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Demandes "Parler de votre projet"</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {['Nom', 'Societe', 'Email', 'Type besoin', 'Statut', 'Date', 'Actions'].map(header => (
                  <th key={header} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map(request => (
                <tr key={request.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{request.full_name}</td>
                  <td className="px-3 py-2">{request.company_name}</td>
                  <td className="px-3 py-2">{request.email}</td>
                  <td className="px-3 py-2">{request.need_type}</td>
                  <td className="px-3 py-2">{request.request_status}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{new Date(request.created_at).toLocaleString('fr-FR')}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={Boolean(request.linked_profile_id)}
                      onClick={() => void createFromRequest(request)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                    >
                      {request.linked_profile_id ? 'Compte deja cree' : 'Creer un compte depuis cette demande'}
                    </button>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">Aucune demande enregistree.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Historique des changements de role</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {['Date', 'Profil cible', 'Role precedent', 'Nouveau role', 'Source', 'Raison'].map(header => (
                  <th key={header} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roleChanges.map(change => (
                <tr key={change.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs text-slate-500">{change.changed_at ? new Date(change.changed_at).toLocaleString('fr-FR') : '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{change.target_profile_id ?? '-'}</td>
                  <td className="px-3 py-2">{change.previous_role ? (ROLE_LABELS[change.previous_role as Role] ?? change.previous_role) : '-'}</td>
                  <td className="px-3 py-2">{change.new_role ? (ROLE_LABELS[change.new_role as Role] ?? change.new_role) : '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{change.source ?? '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{change.change_reason ?? '-'}</td>
                </tr>
              ))}
              {roleChanges.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">Aucun changement de role enregistre.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Journal d audit technique</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Recherche audit">
            <input
              className={inp}
              placeholder="admin, type, cible"
              value={auditSearch}
              onChange={e => setAuditSearch(e.target.value)}
            />
          </Field>
          <Field label="Fenetre (jours)">
            <select className={inp} value={auditDays} onChange={e => setAuditDays(Math.max(1, Math.min(365, Number(e.target.value || 90))))}>
              <option value={30}>30</option>
              <option value={90}>90</option>
              <option value={180}>180</option>
              <option value={365}>365</option>
            </select>
          </Field>
          <Field label="Lignes audit">
            <select className={inp} value={auditPageSize} onChange={e => setAuditPageSize(Math.max(5, Math.min(100, Number(e.target.value || 25))))}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </Field>
          <div className="flex items-end text-xs text-slate-500">
            {auditPagination.total} evenement(s) sur {auditPagination.days} jour(s)
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {['Date', 'Admin', 'Type evenement', 'Cible', 'IP hash', 'Payload'].map(header => (
                  <th key={header} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditEvents.map(event => (
                <tr key={event.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs text-slate-500">{event.created_at ? new Date(event.created_at).toLocaleString('fr-FR') : '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">{event.admin_email ?? '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">{event.event_type ?? '-'}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{[event.target_type, event.target_id].filter(Boolean).join(':') || '-'}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-500">{event.ip_hash ? `${event.ip_hash.slice(0, 12)}...` : '-'}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-500">
                    {diffAuditPayload(event.payload).length > 0 ? (
                      <div className="space-y-1">
                        {diffAuditPayload(event.payload).map(item => (
                          <div key={`${event.id}-${item.key}`} className="rounded bg-slate-50 px-2 py-1">
                            <span className="font-semibold text-slate-700">{item.key}</span>: {String(item.before)} → {String(item.after)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <pre className="max-w-[420px] overflow-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-2">{event.payload ? JSON.stringify(event.payload) : '-'}</pre>
                    )}
                  </td>
                </tr>
              ))}
              {auditEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">Aucun evenement d audit enregistre.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-700">
          <div>Page audit {auditPage} / {auditTotalPages}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={auditPage <= 1}
              onClick={() => setAuditPage(current => Math.max(1, current - 1))}
              className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Precedent
            </button>
            <button
              type="button"
              disabled={auditPage >= auditTotalPages}
              onClick={() => setAuditPage(current => Math.min(auditTotalPages, current + 1))}
              className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <p className="text-sm font-medium text-slate-800">
              Confirmer <span className="font-bold">{confirmAction.action === 'delete' ? 'la suppression' : "l'archivage"}</span> de <span className="font-bold">{confirmAction.name}</span>&nbsp;?
            </p>
            {confirmAction.action === 'delete' && (
              <>
                <p className="mt-1 text-xs text-red-600">Cette action est irreversible. Le compte auth sera supprime.</p>
                <p className="mt-2 text-xs text-slate-600">Saisissez SUPPRIMER pour confirmer.</p>
                <input
                  className="mt-2 w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                  value={confirmDeleteText}
                  onChange={e => setConfirmDeleteText(e.target.value)}
                  placeholder="SUPPRIMER"
                />
              </>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmAction(null)} className="rounded border border-slate-300 px-3 py-1.5 text-sm">Annuler</button>
              <button
                type="button"
                onClick={() => void applyAction(confirmAction.id, confirmAction.action as 'archive' | 'delete', { confirmationText: confirmDeleteText })}
                disabled={confirmAction.action === 'delete' && confirmDeleteText.trim().toUpperCase() !== 'SUPPRIMER'}
                className={`rounded px-3 py-1.5 text-sm text-white ${confirmAction.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-800'}`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-800">{linkModal.title}</h3>
            <p className="mt-1 text-xs text-slate-500">Copiez ce lien et transmettez-le a l'utilisateur. Il expire rapidement.</p>
            <div className="mt-3 flex items-center gap-2">
              <input readOnly value={linkModal.link} className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700 outline-none" />
              <button
                type="button"
                onClick={() => { void navigator.clipboard.writeText(linkModal.link); setNotice('Lien copie !') }}
                className="shrink-0 rounded border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
              >
                Copier
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setLinkModal(null)} className="rounded border border-slate-300 px-3 py-1.5 text-sm">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    actif: 'bg-emerald-100 text-emerald-700',
    suspendu: 'bg-amber-100 text-amber-700',
    desactive: 'bg-red-100 text-red-700',
    archive: 'bg-slate-100 text-slate-600',
  }
  const cls = variants[status] ?? 'bg-gray-100 text-gray-700'
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-600">
      <span>{label}</span>
      {children}
    </label>
  )
}
