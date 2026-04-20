/**
 * TenantAdminPage.tsx
 * Réglages du tenant (company) : identité, domaine email, modules, utilisateurs.
 * Accessible aux rôles admin, super_admin, dirigeant.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  useTenantSettings,
  updateTenantIdentity,
  updateEmailDomain,
  updateEnabledModules,
  getTenantUsers,
  createTenantUser,
  setUserLoginEnabled,
  setUserForcePasswordReset,
  ALL_TENANT_MODULES,
  TENANT_MODULE_LABELS,
  type TenantCompany,
  type TenantUser,
  type TenantModule,
} from '@/lib/tenantAdmin'
import { ROLE_LABELS, type Role } from '@/lib/auth'

// ─── Constantes ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  suspended: 'Suspendu',
  trial: 'Essai',
  cancelled: 'Annulé',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

// ─── Composants utilitaires ──────────────────────────────────────────────────

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? STATUS_COLORS.cancelled}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-[color:var(--surface-card)] p-5 shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">{title}</h2>
      {children}
    </div>
  )
}

// ─── Section identité tenant ─────────────────────────────────────────────────

function IdentitySection({ company, onSaved }: { company: TenantCompany; onSaved: () => void }) {
  const [name, setName]       = useState(company.name)
  const [status, setStatus]   = useState(company.status)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    const { error: err } = await updateTenantIdentity({ name, status })
    setSaving(false)
    if (err) { setError(err); return }
    setSuccess(true)
    onSaved()
    setTimeout(() => setSuccess(false), 2500)
  }

  return (
    <SectionCard title="Identité du tenant">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-[color:var(--text-muted)] mb-1">Nom du tenant</label>
          <input
            className="w-full rounded-xl border bg-[color:var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
            style={{ borderColor: 'var(--border)' }}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[color:var(--text-muted)] mb-1">Slug (identifiant)</label>
          <input
            className="w-full rounded-xl border bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-muted)] cursor-not-allowed"
            style={{ borderColor: 'var(--border)' }}
            value={company.slug}
            readOnly
          />
          <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">Non modifiable (contacter le support Nexora).</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-[color:var(--text-muted)] mb-1">Statut</label>
          <select
            className="w-full rounded-xl border bg-[color:var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
            style={{ borderColor: 'var(--border)' }}
            value={status}
            onChange={e => setStatus(e.target.value as TenantCompany['status'])}
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[color:var(--text-muted)] mb-1">Plan</label>
          <input
            className="w-full rounded-xl border bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-muted)] cursor-not-allowed capitalize"
            style={{ borderColor: 'var(--border)' }}
            value={company.subscription_plan}
            readOnly
          />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-600">Sauvegardé.</p>}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </SectionCard>
  )
}

// ─── Section domaine email ───────────────────────────────────────────────────

function EmailDomainSection({ company, onSaved }: { company: TenantCompany; onSaved: () => void }) {
  const [domain, setDomain]   = useState(company.email_domain ?? '')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSave() {
    if (!domain.trim()) { setError('Le domaine email est obligatoire.'); return }
    setSaving(true)
    setError(null)
    const { error: err } = await updateEmailDomain(domain.trim())
    setSaving(false)
    if (err) { setError(err); return }
    setSuccess(true)
    onSaved()
    setTimeout(() => setSuccess(false), 2500)
  }

  return (
    <SectionCard title="Domaine email">
      <p className="mb-3 text-sm text-[color:var(--text-muted)]">
        Tous les utilisateurs créés auront une adresse <strong>@{domain || 'votre-domaine.fr'}</strong>.
        Ce champ est obligatoire pour la création de comptes.
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-[color:var(--text-muted)]">@</span>
        <input
          className="flex-1 rounded-xl border bg-[color:var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
          style={{ borderColor: 'var(--border)' }}
          placeholder="exemple.fr"
          value={domain}
          onChange={e => setDomain(e.target.value)}
        />
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? 'Sauvegarde…' : 'Mettre à jour'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {success && <p className="mt-2 text-sm text-green-600">Domaine mis à jour.</p>}
    </SectionCard>
  )
}

// ─── Section modules ─────────────────────────────────────────────────────────

function ModulesSection({ company, onSaved }: { company: TenantCompany; onSaved: () => void }) {
  const [selected, setSelected]  = useState<TenantModule[]>(
    company.enabled_modules.length > 0 ? company.enabled_modules : [...ALL_TENANT_MODULES]
  )
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setSelected(company.enabled_modules.length > 0 ? company.enabled_modules : [...ALL_TENANT_MODULES])
  }, [company.enabled_modules])

  function toggle(mod: TenantModule) {
    if (mod === 'settings') return // toujours actif
    setSelected(curr =>
      curr.includes(mod) ? curr.filter(m => m !== mod) : [...curr, mod]
    )
  }

  function enableAllModules() {
    setSelected([...ALL_TENANT_MODULES])
  }

  function disableAllModules() {
    setSelected(['settings'])
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const { error: err } = await updateEnabledModules(selected)
    setSaving(false)
    if (err) { setError(err); return }
    setSuccess(true)
    onSaved()
    setTimeout(() => setSuccess(false), 2500)
  }

  return (
    <SectionCard title="Modules activés">
      <p className="mb-3 text-sm text-[color:var(--text-muted)]">
        Les utilisateurs ne pourront pas accéder aux pages des modules désactivés.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={enableAllModules}
          className="rounded-xl border px-3 py-1.5 text-xs font-medium text-[color:var(--text-muted)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]"
          style={{ borderColor: 'var(--border)' }}
        >
          Tout activer
        </button>
        <button
          type="button"
          onClick={disableAllModules}
          className="rounded-xl border px-3 py-1.5 text-xs font-medium text-[color:var(--text-muted)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]"
          style={{ borderColor: 'var(--border)' }}
        >
          Tout désactiver
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ALL_TENANT_MODULES.map(mod => {
          const active = selected.includes(mod)
          const locked = mod === 'settings'
          return (
            <button
              key={mod}
              type="button"
              onClick={() => toggle(mod)}
              disabled={locked}
              className={[
                'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'border-[color:var(--primary)] bg-[color:var(--primary)] text-white'
                  : 'border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-muted)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]',
                locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
              ].join(' ')}
            >
              {TENANT_MODULE_LABELS[mod]}
              {locked && <span className="ml-1 text-[10px]">🔒</span>}
            </button>
          )
        })}
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-600">Modules mis à jour.</p>}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </SectionCard>
  )
}

// ─── Section utilisateurs ─────────────────────────────────────────────────────

function UsersSection({ tenantEmailDomain }: { tenantEmailDomain: string | null }) {
  const [users, setUsers]     = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [createEmail, setCreateEmail] = useState('')
  const [createNom, setCreateNom] = useState('')
  const [createPrenom, setCreatePrenom] = useState('')
  const [createRole, setCreateRole] = useState<Role>('dirigeant')
  const [createPassword, setCreatePassword] = useState('')
  const [createForceReset, setCreateForceReset] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error: err } = await getTenantUsers()
    setLoading(false)
    if (err) { setError(err); return }
    setUsers(data?.users ?? [])
  }

  useEffect(() => { void load() }, [])

  async function toggleLogin(user: TenantUser) {
    const { error: err } = await setUserLoginEnabled(user.id, !user.login_enabled)
    if (!err) await load()
  }

  async function handleForceReset(user: TenantUser) {
    const { error: err } = await setUserForcePasswordReset(user.id, true)
    if (!err) await load()
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    setCreateSuccess(null)
    setTempPassword(null)

    const rawEmail = createEmail.trim().toLowerCase()
    const normalizedEmail = (!rawEmail.includes('@') && tenantEmailDomain)
      ? `${rawEmail}@${tenantEmailDomain}`
      : rawEmail

    const { data, error: err } = await createTenantUser({
      email: normalizedEmail,
      nom: createNom.trim(),
      prenom: createPrenom.trim(),
      role: createRole,
      password: createPassword.trim() || undefined,
      force_password_reset: createForceReset,
    })

    setCreating(false)
    if (err) {
      setCreateError(err)
      return
    }

    setCreateEmail('')
    setCreateNom('')
    setCreatePrenom('')
    setCreateRole('dirigeant')
    setCreatePassword('')
    setCreateForceReset(true)
    setCreateSuccess('Utilisateur créé dans le tenant.')
    if (data?.temp_password) setTempPassword(data.temp_password)
    await load()
  }

  if (loading) return <SectionCard title="Utilisateurs"><p className="text-sm text-[color:var(--text-muted)]">Chargement…</p></SectionCard>
  if (error)   return <SectionCard title="Utilisateurs"><p className="text-sm text-red-500">{error}</p></SectionCard>

  return (
    <SectionCard title={`Utilisateurs (${users.length})`}>
      <form onSubmit={handleCreateUser} className="mb-4 space-y-3 rounded-xl border bg-[color:var(--surface)] p-3" style={{ borderColor: 'var(--border)' }}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--text-muted)]">Email</label>
            <input
              className="w-full rounded-lg border bg-[color:var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
              style={{ borderColor: 'var(--border)' }}
              placeholder={tenantEmailDomain ? `exemple@${tenantEmailDomain}` : 'exemple@domaine.fr'}
              value={createEmail}
              onChange={e => setCreateEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--text-muted)]">Prénom</label>
            <input
              className="w-full rounded-lg border bg-[color:var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
              style={{ borderColor: 'var(--border)' }}
              value={createPrenom}
              onChange={e => setCreatePrenom(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--text-muted)]">Nom</label>
            <input
              className="w-full rounded-lg border bg-[color:var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
              style={{ borderColor: 'var(--border)' }}
              value={createNom}
              onChange={e => setCreateNom(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--text-muted)]">Rôle</label>
            <select
              className="w-full rounded-lg border bg-[color:var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
              style={{ borderColor: 'var(--border)' }}
              value={createRole}
              onChange={e => setCreateRole(e.target.value as Role)}
            >
              {(Object.entries(ROLE_LABELS) as Array<[Role, string]>).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--text-muted)]">Mot de passe (optionnel)</label>
            <input
              className="w-full rounded-lg border bg-[color:var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
              style={{ borderColor: 'var(--border)' }}
              type="text"
              minLength={8}
              placeholder="Généré automatiquement si vide"
              value={createPassword}
              onChange={e => setCreatePassword(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm text-[color:var(--text)]">
              <input
                type="checkbox"
                checked={createForceReset}
                onChange={e => setCreateForceReset(e.target.checked)}
              />
              Forcer le changement du mot de passe
            </label>
          </div>
        </div>
        {createError && <p className="text-sm text-red-600">{createError}</p>}
        {createSuccess && <p className="text-sm text-green-700">{createSuccess}</p>}
        {tempPassword && (
          <p className="text-sm text-amber-700">
            Mot de passe temporaire: <span className="font-semibold">{tempPassword}</span>
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-[color:var(--primary)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {creating ? 'Création…' : 'Créer un utilisateur'}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]" style={{ borderColor: 'var(--border)' }}>
              <th className="pb-2 pr-4">Nom</th>
              <th className="pb-2 pr-4">Rôle</th>
              <th className="pb-2 pr-4">Connexion</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <td className="py-2 pr-4">
                  <div className="font-medium">{user.prenom} {user.nom}</div>
                  {user.force_password_reset && (
                    <span className="mt-0.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      Mdp à changer
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 text-[color:var(--text-muted)]">
                  {ROLE_LABELS[user.role as Role] ?? user.role}
                </td>
                <td className="py-2 pr-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${user.login_enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                    {user.login_enabled ? 'Actif' : 'Désactivé'}
                  </span>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleLogin(user)}
                      className="rounded-lg border px-2 py-1 text-xs hover:bg-[color:var(--surface-muted)] transition-colors"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      {user.login_enabled ? 'Désactiver' : 'Activer'}
                    </button>
                    {!user.force_password_reset && (
                      <button
                        type="button"
                        onClick={() => void handleForceReset(user)}
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-[color:var(--surface-muted)] transition-colors"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        Reset mdp
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-sm text-[color:var(--text-muted)]">
                  Aucun utilisateur dans ce tenant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function TenantAdminPage() {
  const { role } = useAuth()
  const { company, loading, error, reload } = useTenantSettings()

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">{error ?? 'Impossible de charger la configuration du tenant.'}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Réglages du tenant</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-[color:var(--text-muted)]">/{company.slug}</span>
            <Badge status={company.status} />
          </div>
        </div>
        {(role === 'admin' || role === 'super_admin') && (
          <a
            href="/super-admin"
            className="rounded-xl border px-3 py-2 text-xs font-medium text-[color:var(--text-muted)] hover:text-[color:var(--text)] transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            Plateforme →
          </a>
        )}
      </div>

      <IdentitySection      company={company} onSaved={reload} />
      <EmailDomainSection   company={company} onSaved={reload} />
      <ModulesSection       company={company} onSaved={reload} />
      <UsersSection tenantEmailDomain={company.email_domain} />
    </div>
  )
}
