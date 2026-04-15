/**
 * SuperAdminPage.tsx
 * Backoffice plateforme Nexora Truck — Super Admin uniquement.
 *
 * FONCTIONNALITES :
 *   - Liste des tenants (companies)
 *   - Creation / modification tenant
 *   - Mode test : entrer dans un tenant avec un role choisi (impersonation)
 *   - Bouton "quitter le mode test"
 *   - Journal d'impersonation
 *
 * SECURITE :
 *   - Accessible uniquement aux platform_admins (is_platform_admin = true)
 *   - Verifie cote frontend (isPlatformAdmin) ET cote backend (RLS + RPC)
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, firstPage, type Role } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import {
  getTenantRoles,
  startImpersonation,
  type TenantRole,
} from '@/lib/multiTenantAuth'

// ─── Types ───────────────────────────────────────────────────────────────────

type Company = {
  id: number
  name: string
  slug: string
  status: 'active' | 'suspended' | 'trial' | 'cancelled'
  subscription_plan: 'starter' | 'pro' | 'enterprise'
  max_users: number
  max_screens: number
  user_count: number
  created_at: string
}

// ─── Statut badge ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  suspended: 'Suspendu',
  trial: 'Essai',
  cancelled: 'Annule',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  trial: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-slate-200 text-slate-600',
}

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

// ─── Panel d'impersonation pour un tenant ─────────────────────────────────────

function TenantImpersonationPanel({
  company,
  onStarted,
}: {
  company: Company
  onStarted: () => void
}) {
  const { loadImpersonation, setSessionRole } = useAuth()
  const navigate = useNavigate()
  const [roles, setRoles] = useState<TenantRole[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const r = await getTenantRoles(company.id)
      if (!active) return
      // Filtrer les roles tenant uniquement (pas platform)
      const tenantRoles = r.filter(role => role.scope === 'tenant')
      setRoles(tenantRoles)
      if (tenantRoles.length > 0 && !selectedRoleId) {
        setSelectedRoleId(tenantRoles[0].id)
      }
    })()
    return () => { active = false }
  }, [company.id, selectedRoleId])

  async function handleStart() {
    if (!selectedRoleId) return
    setLoading(true)
    setError(null)
    try {
      const { error: err } = await startImpersonation(company.id, selectedRoleId)
      if (err) throw new Error(err)
      // Charger la session d'impersonation dans le contexte
      await loadImpersonation()
      // Appliquer le role choisi
      const selectedRole = roles.find(r => r.id === selectedRoleId)
      if (selectedRole) {
        setSessionRole(selectedRole.name as Role)
      }
      onStarted()
      // Rediriger vers la premiere page accessible pour ce role
      const roleName = selectedRole?.name as Role | undefined
      if (roleName) {
        navigate(firstPage(roleName))
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h4 className="text-sm font-semibold text-blue-900">
        Tester en tant que — {company.name}
      </h4>
      <p className="mt-1 text-xs text-blue-700">
        Choisissez un role et entrez dans le tenant en mode test.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-blue-800">
          Role
          <select
            className="mt-1 block w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-800"
            value={selectedRoleId ?? ''}
            onChange={e => setSelectedRoleId(Number(e.target.value))}
          >
            {roles.map(r => (
              <option key={r.id} value={r.id}>
                {r.label} ({r.name})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={loading || !selectedRoleId}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          {loading ? 'Demarrage…' : 'Entrer en mode test'}
        </button>
      </div>
      {error && (
        <div className="mt-2 text-xs text-red-600">{error}</div>
      )}
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { isPlatformAdmin, impersonation, exitImpersonation, user } = useAuth()
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [expandedTenant, setExpandedTenant] = useState<number | null>(null)
  const [newTenantName, setNewTenantName] = useState('')
  const [newTenantSlug, setNewTenantSlug] = useState('')
  const [newTenantPlan, setNewTenantPlan] = useState<Company['subscription_plan']>('starter')
  const [newTenantMaxUsers, setNewTenantMaxUsers] = useState(10)
  const [newTenantMaxScreens, setNewTenantMaxScreens] = useState(3)

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expiree.')

      const response = await fetch('/.netlify/functions/v11-companies', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const raw = await response.text()
        let body: { error?: string } = {}
        if (raw) {
          try {
            body = JSON.parse(raw) as { error?: string }
          } catch {
            // Keep generic fallback when backend does not return JSON.
          }
        }
        throw new Error(body.error ?? `Erreur serveur (${response.status}).`)
      }

      const body = await response.json() as { companies: Company[] }
      setCompanies(body.companies ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.')
    } finally {
      setLoading(false)
    }
  }, [])

  async function handleCreateTenant() {
    setCreating(true)
    setError(null)
    setNotice(null)
    try {
      const trimmedName = newTenantName.trim()
      const trimmedSlug = newTenantSlug.trim().toLowerCase()
      if (trimmedName.length < 2) {
        throw new Error('Le nom du tenant est requis (min 2 caracteres).')
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expiree.')

      const response = await fetch('/.netlify/functions/v11-companies', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          slug: trimmedSlug || undefined,
          subscription_plan: newTenantPlan,
          max_users: Math.max(1, Math.trunc(newTenantMaxUsers)),
          max_screens: Math.max(1, Math.trunc(newTenantMaxScreens)),
        }),
      })

      const body = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) {
        throw new Error(body.error ?? 'Creation du tenant impossible.')
      }

      setNewTenantName('')
      setNewTenantSlug('')
      setNewTenantPlan('starter')
      setNewTenantMaxUsers(10)
      setNewTenantMaxScreens(3)
      setNotice('Tenant cree avec succes.')
      await fetchCompanies()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.')
    } finally {
      setCreating(false)
    }
  }

  async function handleExitImpersonation() {
    await exitImpersonation()
    setNotice('Mode test termine.')
  }

  useEffect(() => {
    void fetchCompanies()
  }, [fetchCompanies])

  // ─── Garde : acces refuse si non platform_admin ───────────────────────────

  if (!isPlatformAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-4xl">🔒</div>
        <p className="font-semibold text-slate-700">Acces reserve a la plateforme Nexora.</p>
        <p className="text-sm text-slate-500">Votre compte n'a pas les droits platform admin.</p>
      </div>
    )
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Bandeau d'impersonation active */}
        {impersonation && (
          <div className="mb-6 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white text-sm font-bold">⚡</span>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Mode test actif — {impersonation.tenantName} / {impersonation.roleLabel}
                </p>
                <p className="text-xs text-amber-700">
                  Toutes vos actions sont journalisees. Session expire a{' '}
                  {new Date(impersonation.expiresAt).toLocaleTimeString('fr-FR')}.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleExitImpersonation()}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              Quitter le mode test
            </button>
          </div>
        )}

        {/* En-tete */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Plateforme Nexora — Backoffice</h1>
            <p className="text-sm text-slate-500 mt-1">
              Super Admin — {user?.email ?? ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/session-picker')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Session Picker
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notice && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 mb-6">
            {notice}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        {/* Statistiques rapides */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tenants</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{companies.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Utilisateurs total</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {companies.reduce((sum, c) => sum + c.user_count, 0)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tenants actifs</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {companies.filter(c => c.status === 'active').length}
            </p>
          </div>
        </div>

        {/* Creation de tenant */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-800">Nouveau tenant</h2>
          <p className="mt-1 text-xs text-slate-500">Creation d'une company + tenant ERP associe.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="text-xs text-slate-600">
              Nom
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={newTenantName}
                onChange={event => setNewTenantName(event.target.value)}
                placeholder="Transport Alpes"
              />
            </label>
            <label className="text-xs text-slate-600">
              Slug (optionnel)
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={newTenantSlug}
                onChange={event => setNewTenantSlug(event.target.value)}
                placeholder="transport_alpes"
              />
            </label>
            <label className="text-xs text-slate-600">
              Plan
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={newTenantPlan}
                onChange={event => setNewTenantPlan(event.target.value as Company['subscription_plan'])}
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <label className="text-xs text-slate-600">
              Utilisateurs max
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                type="number"
                min={1}
                value={newTenantMaxUsers}
                onChange={event => setNewTenantMaxUsers(Math.max(1, Number(event.target.value || 1)))}
              />
            </label>
            <label className="text-xs text-slate-600">
              Ecrans max
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                type="number"
                min={1}
                value={newTenantMaxScreens}
                onChange={event => setNewTenantMaxScreens(Math.max(1, Number(event.target.value || 1)))}
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void handleCreateTenant()}
              disabled={creating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700"
            >
              {creating ? 'Creation…' : '+ Nouveau tenant'}
            </button>
          </div>
        </div>

        {/* Liste des tenants */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Chargement des tenants...</div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-700">
                Tenants ({companies.length})
              </h2>
              <button
                type="button"
                onClick={() => void fetchCompanies()}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Rafraichir
              </button>
            </div>

            <div className="space-y-3">
              {companies.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-400">
                  Aucun tenant.
                </div>
              )}
              {companies.map(company => (
                <div
                  key={company.id}
                  className="rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                        {company.id}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">{company.name}</p>
                        <p className="text-xs text-slate-500">
                          <span className="font-mono">{company.slug}</span>
                          {' — '}
                          <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[company.status] ?? ''}`}>
                            {STATUS_LABELS[company.status] ?? company.status}
                          </span>
                          {' — '}
                          {PLAN_LABELS[company.subscription_plan] ?? company.subscription_plan}
                          {' — '}
                          {company.user_count}/{company.max_users} users
                          {' — '}
                          {new Date(company.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedTenant(expandedTenant === company.id ? null : company.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          expandedTenant === company.id
                            ? 'bg-blue-600 text-white'
                            : 'border border-blue-300 text-blue-700 hover:bg-blue-50'
                        }`}
                      >
                        {expandedTenant === company.id ? 'Fermer' : 'Tester en tant que'}
                      </button>
                    </div>
                  </div>

                  {/* Panel d'impersonation pour ce tenant */}
                  {expandedTenant === company.id && (
                    <div className="px-4 pb-4">
                      <TenantImpersonationPanel
                        company={company}
                        onStarted={() => setExpandedTenant(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
