import { useEffect, useState } from 'react'
import NexoraTruckLogo from '@/components/layout/NexoraTruckLogo'
import { ROLE_ACCESS, ROLE_LABELS, type Role, useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

const ROLES: Role[] = ['dirigeant', 'exploitant', 'mecanicien', 'commercial', 'comptable', 'rh', 'conducteur', 'conducteur_affreteur', 'client', 'affreteur', 'administratif', 'facturation', 'flotte', 'maintenance', 'observateur', 'demo', 'investisseur']
const ROLE_SET = new Set<Role>(Object.keys(ROLE_LABELS) as Role[])

const ROLE_META: Partial<Record<Role, { accent: string; desc: string }>> = {
  admin: { accent: 'from-slate-700 to-slate-900', desc: 'Toutes les vues visibles sans restriction.' },
  dirigeant: { accent: 'from-violet-700 to-violet-900', desc: 'Pilotage global et supervision.' },
  exploitant: { accent: 'from-blue-700 to-blue-900', desc: 'Planning, OT et flux terrain.' },
  mecanicien: { accent: 'from-orange-700 to-orange-900', desc: 'Atelier, flotte et controles techniques.' },
  commercial: { accent: 'from-emerald-700 to-emerald-900', desc: 'Clients, ventes et facturation.' },
  comptable: { accent: 'from-slate-600 to-slate-800', desc: 'Factures, suivi financier et encours.' },
  rh: { accent: 'from-rose-700 to-rose-900', desc: 'Dossiers chauffeurs et alertes RH.' },
  conducteur: { accent: 'from-amber-700 to-amber-900', desc: 'Planning, tachygraphe et messagerie.' },
  conducteur_affreteur: { accent: 'from-orange-700 to-orange-900', desc: 'Suivi de route affrete sans acces frais internes.' },
  client: { accent: 'from-cyan-700 to-cyan-900', desc: 'Demandes transport, suivi et facturation.' },
  affreteur: { accent: 'from-teal-700 to-teal-900', desc: 'Contrats affretes et gestion des ressources externes.' },
  administratif: { accent: 'from-indigo-700 to-indigo-900', desc: 'Gestion administrative et conformite.' },
  facturation: { accent: 'from-yellow-700 to-yellow-900', desc: 'Factures, devis et suivi commercial.' },
  flotte: { accent: 'from-red-700 to-red-900', desc: 'Gestion flotte et maintenance.' },
  maintenance: { accent: 'from-red-700 to-red-900', desc: 'Entretien, interventions et carnet d\'atelier.' },
  observateur: { accent: 'from-gray-700 to-gray-900', desc: 'Acces en lecture seule, pas de modification.' },
  demo: { accent: 'from-emerald-600 to-emerald-800', desc: 'Acces complet a la plateforme de demonstration.' },
  investisseur: { accent: 'from-amber-600 to-amber-800', desc: 'Dashboard financier et indicateurs cles.' },
}

type ManagedUser = Tables<'profils'> & {
  email: string | null
  email_confirmed_at: string | null
  last_sign_in_at: string | null
}

type SessionUser = {
  id: string
  user_id: string | null
  matricule: string | null
  role: Role
  nom: string | null
  prenom: string | null
  email: string | null
  last_sign_in_at: string | null
}

function normalizeRole(value: unknown): Role | null {
  if (typeof value !== 'string') return null
  const token = value.trim().toLowerCase() as Role
  return ROLE_SET.has(token) ? token : null
}

async function loadSupabaseUsers(accessToken: string): Promise<SessionUser[]> {
  function transformUsers(users: ManagedUser[] | null | undefined): SessionUser[] {
    return (users ?? []).flatMap(user => {
      const role = normalizeRole(user.role)
      if (!role) return []
      return [{
        id: user.id,
        user_id: user.user_id,
        matricule: user.matricule ?? null,
        role,
        nom: user.nom ?? null,
        prenom: user.prenom ?? null,
        email: user.email ?? null,
        last_sign_in_at: user.last_sign_in_at ?? null,
      }]
    })
  }

  try {
    const response = await fetch('/.netlify/functions/admin-users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const contentType = response.headers.get('content-type') ?? ''
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : null

    if (!response.ok) {
      throw new Error(
        payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : 'Impossible de charger les sessions utilisateurs depuis la fonction admin-users.',
      )
    }

    const users = payload && typeof payload === 'object' && 'users' in payload && Array.isArray(payload.users)
      ? payload.users as ManagedUser[]
      : []

    return transformUsers(users)
  } catch (error) {
    console.warn('Echec admin-users, fallback direct supabase :', error)

    // Fallback direct sur la table profils si la fonction Netlify est indisponible.
    const { data, error: supabaseError } = await supabase.from('profils').select('id,user_id,matricule,role,nom,prenom').order('created_at')

    if (supabaseError) {
      throw new Error(`Impossible de charger les sessions utilisateurs (fallback Supabase) : ${supabaseError.message}`)
    }

    return transformUsers(data as ManagedUser[])
  }
}


function initials(prenom: string | null, nom: string | null) {
  const letters = `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.trim()
  return letters ? letters.toUpperCase() : 'DM'
}

export default function SessionPicker() {
  const {
    user,
    session,
    setSessionRole,
    resetSessionProfil,
    setSessionProfil,
    signOut,
  } = useAuth()
  const [supabaseUsers, setSupabaseUsers] = useState<SessionUser[]>([])
  const [loadingSupabaseUsers, setLoadingSupabaseUsers] = useState(false)
  const [supabaseUsersError, setSupabaseUsersError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.access_token) {
      setSupabaseUsers([])
      setSupabaseUsersError(null)
      setLoadingSupabaseUsers(false)
      return
    }

    let active = true

    void (async () => {
      setLoadingSupabaseUsers(true)
      setSupabaseUsersError(null)
      try {
        const users = await loadSupabaseUsers(session.access_token)
        if (!active) return
        setSupabaseUsers(users)
      } catch (error) {
        if (!active) return
        setSupabaseUsers([])
        setSupabaseUsersError(error instanceof Error ? error.message : 'Impossible de charger les sessions utilisateurs.')
      } finally {
        if (active) setLoadingSupabaseUsers(false)
      }
    })()

    return () => {
      active = false
    }
  }, [session?.access_token])

  function openRoleSession(role: Role) {
    resetSessionProfil()
    setSessionRole(role)
  }

  function openSupabaseUserSession(profile: SessionUser) {
    resetSessionProfil()
    setSessionProfil({
      id: profile.id,
      role: profile.role,
      nom: profile.nom,
      prenom: profile.prenom,
      email: profile.email,
      domain: 'Supabase',
    })
    setSessionRole(profile.role)
  }

  const currentUserId = session?.user?.id ?? null

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <div className="flex justify-center">
            <NexoraTruckLogo dark size="lg" subtitle="Control center" />
          </div>
          <h1 className="mt-3 text-3xl font-semibold">Choisir une session admin</h1>
          <p className="mt-3 text-sm text-slate-400">
            Connecte en tant que <span className="font-medium text-slate-100">{user?.email}</span>.
            Ouvre une vue metier ou une session utilisateur Supabase.
          </p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Simulation metier</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Ouvrir une vue par role</h2>
            </div>
            <button
              type="button"
              onClick={() => openRoleSession('admin')}
              className="rounded-2xl border border-white/15 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-slate-800"
            >
              Acces administrateur complet
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ROLES.map(role => {
              const meta = ROLE_META[role] ?? { accent: 'from-slate-700 to-slate-900', desc: 'Acces personnalise selon les permissions configurees.' }
              const pages = ROLE_ACCESS[role]
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => openRoleSession(role)}
                  className={`rounded-3xl border border-white/10 bg-gradient-to-br ${meta.accent} p-5 text-left shadow-lg transition-transform hover:scale-[1.01]`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">{ROLE_LABELS[role]}</p>
                  <p className="mt-3 text-sm text-white/80">{meta.desc}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {pages.slice(0, 4).map(page => (
                      <span key={page} className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium text-white/70">
                        {page}
                      </span>
                    ))}
                    {pages.length > 4 && (
                      <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium text-white/60">
                        +{pages.length - 4}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 shadow-2xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/70">Sessions Supabase</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Ouvrir un profil utilisateur reel</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Cette liste reprend tous les profils stockes dans `public.profils`.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
              {loadingSupabaseUsers ? 'Chargement des sessions...' : `${supabaseUsers.length} profils detectes`}
            </div>
          </div>

          {supabaseUsersError && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {supabaseUsersError}
            </div>
          )}

          {!loadingSupabaseUsers && !supabaseUsersError && supabaseUsers.length === 0 && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
              Aucun profil Supabase disponible.
            </div>
          )}

          {supabaseUsers.length > 0 && (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {supabaseUsers.map(profile => {
                const isCurrentAccount = Boolean(currentUserId && profile.user_id === currentUserId)
                const displayName = [profile.prenom, profile.nom].filter(Boolean).join(' ').trim() || profile.email || profile.user_id
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => openSupabaseUserSession(profile)}
                    disabled={isCurrentAccount}
                    className="flex items-start gap-4 rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-left transition-colors hover:border-emerald-400/40 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-sm font-semibold text-emerald-200">
                      {initials(profile.prenom, profile.nom)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{displayName}</p>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300">
                          {ROLE_LABELS[profile.role]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{profile.email ?? 'Email indisponible'}</p>
                      <p className="mt-1 text-xs font-mono text-emerald-200/80">{profile.matricule ?? 'Matricule a generer'}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {isCurrentAccount
                          ? 'Compte actuellement connecte'
                          : `Derniere connexion: ${profile.last_sign_in_at ? new Date(profile.last_sign_in_at).toLocaleString('fr-FR') : 'jamais'}`}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={signOut}
            className="text-sm text-slate-500 transition-colors hover:text-slate-300"
          >
            Se deconnecter
          </button>
        </div>
      </div>
    </div>
  )
}
