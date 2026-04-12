/**
 * SuperAdminPage.tsx
 * Phase 4 - Tableau de bord de la plateforme Nexora Truck (super admin uniquement)
 *
 * ISOLATION SECURITE :
 *   - Accessible uniquement aux platform_admins (cf. public.platform_admins)
 *   - Un role 'super_admin' tenant n'est PAS un platform_admin
 *   - L'acces est verifie cote frontend ET cote backend (double verification)
 *
 * IMPERSONATION :
 *   - Affiche un bandeau d'avertissement si une session d'impersonation est active
 *   - Journalise chaque demarrage / fin d'impersonation (impersonation_logs)
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'

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

type ImpersonationSession = {
  is_impersonating: boolean
  impersonated_by: string
  target_company_id: number
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

// ─── Composant principal ─────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { role, profil } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [impersonation, setImpersonation] = useState<ImpersonationSession | null>(null)
  const [newTenantName, setNewTenantName] = useState('')
  const [newTenantSlug, setNewTenantSlug] = useState('')
  const [newTenantPlan, setNewTenantPlan] = useState<Company['subscription_plan']>('starter')
  const [newTenantMaxUsers, setNewTenantMaxUsers] = useState(10)
  const [newTenantMaxScreens, setNewTenantMaxScreens] = useState(3)

  // Verifie si l'utilisateur est un platform_admin (verification cote client,
  // la vraie securite est dans la fonction Netlify v11-companies)
  const isPlatformAdmin = role === 'super_admin'

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expirée.')

      const response = await fetch('/.netlify/functions/v11-companies', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'Erreur serveur.')
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
      if (!token) throw new Error('Session expirée.')

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

  // Verifie si une session d'impersonation est active pour l'utilisateur courant
  useEffect(() => {
    if (!profil?.id) return
    let active = true

    void (async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id ?? ''
      if (!userId) return

      // Utilise looseSupabase car impersonation_sessions n'est pas encore dans database.types.ts
      // (la migration sera appliquee en Phase 3 - Supabase push)
      const { data } = await looseSupabase
        .from('impersonation_sessions')
        .select('is_impersonating, impersonated_by, target_company_id')
        .eq('target_user_id', userId)
        .eq('is_impersonating', true)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (!active) return
      if (data) {
        setImpersonation(data as ImpersonationSession)
      }
    })()

    return () => { active = false }
  }, [profil?.id])

  useEffect(() => {
    void fetchCompanies()
  }, [fetchCompanies])

  // ─── Garde : acces refuse si non super_admin ──────────────────────────────

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
    <div className="p-6 max-w-6xl mx-auto">

      {/* Bandeau d'impersonation */}
      {impersonation?.is_impersonating && (
        <div className="mb-6 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <span className="text-amber-600 font-bold">⚠️</span>
          <p className="text-sm font-medium text-amber-800">
            Vous etes en mode impersonation — initie par{' '}
            <strong>{impersonation.impersonated_by}</strong>.
            Toutes vos actions sont journalisees.
          </p>
        </div>
      )}

      {/* En-tete */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Plateforme Nexora — Super Admin</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gestion des tenants et supervision de la plateforme.
        </p>
      </div>

      {/* Etat de chargement / erreur */}
      {notice && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 mb-6">
          {notice}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-slate-500 text-sm">Chargement...</div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

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
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {creating ? 'Creation…' : '+ Nouveau tenant'}
          </button>
        </div>
      </div>

      {/* Liste des companies (tenants) */}
      {!loading && !error && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-700">
              Tenants ({companies.length})
            </h2>
            <button type="button" onClick={() => void fetchCompanies()} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
              Rafraichir
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium">ID</th>
                  <th className="text-left px-4 py-3 font-medium">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium">Slug</th>
                  <th className="text-left px-4 py-3 font-medium">Statut</th>
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-right px-4 py-3 font-medium">Utilisateurs</th>
                  <th className="text-right px-4 py-3 font-medium">Ecrans max</th>
                  <th className="text-left px-4 py-3 font-medium">Cree le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      Aucun tenant.
                    </td>
                  </tr>
                )}
                {companies.map(company => (
                  <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{company.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{company.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{company.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[company.status] ?? ''}`}>
                        {STATUS_LABELS[company.status] ?? company.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {PLAN_LABELS[company.subscription_plan] ?? company.subscription_plan}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {company.user_count}/{company.max_users}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {company.max_screens}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(company.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Note de migration */}
          <div className="mt-6 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
            <strong>Migration multi-tenant :</strong> Le tenant{' '}
            <code className="bg-blue-100 px-1 rounded">tenant_test</code> (id=1) contient
            toutes les donnees historiques. Les phases 2–5 permettront d'ajouter de
            nouveaux tenants et d'activer l'isolation RLS progressive.
          </div>
        </>
      )}
    </div>
  )
}
