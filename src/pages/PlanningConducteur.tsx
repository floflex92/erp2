import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { ST_EN_COURS, TRANSPORT_STATUS_LABELS } from '@/lib/transportCourses'

// ─── Types ────────────────────────────────────────────────────────────────────

type Mission = {
  id: string
  reference: string
  statut: string
  statut_transport: string | null
  statut_operationnel: string | null
  date_chargement_prevue: string | null
  date_livraison_prevue: string | null
  distance_km: number | null
  nature_marchandise: string | null
  client_nom: string
  chargement_ville: string | null
  livraison_ville: string | null
  vehicule_label: string | null
}

type GroupedMissions = {
  label: string
  dateISO: string
  missions: Mission[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bucket(iso: string | null): 'passe' | 'aujourd_hui' | 'futur' {
  if (!iso) return 'futur'
  const d = new Date(iso)
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  if (d < todayStart) return 'passe'
  if (d < tomorrowStart) return 'aujourd_hui'
  return 'futur'
}

function dateLabel(iso: string | null): string {
  if (!iso) return 'Date inconnue'
  const d = new Date(iso)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const afterTomorrow = new Date(tomorrowStart); afterTomorrow.setDate(afterTomorrow.getDate() + 1)
  if (d >= todayStart && d < tomorrowStart) return "Aujourd'hui"
  if (d >= tomorrowStart && d < afterTomorrow) return 'Demain'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function groupByDay(missions: Mission[]): GroupedMissions[] {
  const map = new Map<string, GroupedMissions>()
  for (const m of missions) {
    const key = m.date_chargement_prevue
      ? new Date(m.date_chargement_prevue).toISOString().slice(0, 10)
      : 'sans-date'
    if (!map.has(key)) {
      map.set(key, {
        label: dateLabel(m.date_chargement_prevue),
        dateISO: key,
        missions: [],
      })
    }
    map.get(key)!.missions.push(m)
  }
  return [...map.values()].sort((a, b) => a.dateISO.localeCompare(b.dateISO))
}

function formatHeure(iso: string | null) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function statutLabel(s: string) {
  const map: Record<string, string> = {
    ...TRANSPORT_STATUS_LABELS,
    brouillon: 'Brouillon', confirme: 'Confirmee', planifie: 'Planifiee',
    en_cours: 'En cours', livre: 'Livree', facture: 'Facturee', annule: 'Annulee',
  }
  return map[s] ?? s
}

function statutColor(s: string) {
  if (ST_EN_COURS.includes(s as never) || s === 'en_cours') return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  if (s === 'termine' || s === 'livre' || s === 'facture') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  if (s === 'annule') return 'bg-red-500/15 text-red-400 border-red-500/30'
  if (s === 'confirme' || s === 'planifie' || s === 'valide' || s === 'en_attente_planification' || s === 'en_attente_validation') return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
  return 'bg-slate-500/15 text-slate-400 border-slate-500/30'
}

// ─── Icônes ───────────────────────────────────────────────────────────────────

function IconRoute() {
  return <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M6 19c0-2.2 1.8-4 4-4h4a4 4 0 1 0-4-4H8a4 4 0 1 1 0-8h10" /><circle cx="18" cy="3" r="1.4" /><circle cx="6" cy="21" r="1.4" /></svg>
}
function IconPin() {
  return <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 21s6-5.8 6-11a6 6 0 1 0-12 0c0 5.2 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></svg>
}
function IconArrow() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
}
function IconTruck() {
  return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 7h11v9H3z" /><path d="M14 10h3l3 3v3h-6z" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></svg>
}
function IconRefresh() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
}

// ─── Filtre tabs ──────────────────────────────────────────────────────────────

type Filtre = 'all' | 'en_cours' | 'a_venir' | 'passe'

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PlanningConducteur() {
  const { profil } = useAuth()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtre, setFiltre] = useState<Filtre>('a_venir')
  const [refreshing, setRefreshing] = useState(false)

  const prenom = profil?.prenom ?? 'Conducteur'

  async function load(silent = false) {
    if (!profil) return
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      // Trouver conducteur
      const emailNorm = (profil.email ?? '').toLowerCase().trim()
      const { data: condData } = await supabase
        .from('conducteurs')
        .select('id')
        .eq('statut', 'actif')

      const conducteur = ((condData ?? []) as Array<{ id: string; email: string | null }>)
        .find(c => c.email && c.email.toLowerCase().trim() === emailNorm)

      if (!conducteur) {
        setError("Aucun profil conducteur trouvé en base. Contactez l'exploitation.")
        setLoading(false)
        setRefreshing(false)
        return
      }

      // Missions sur 14 jours passés + 30 jours à venir
      const dateDebut = new Date()
      dateDebut.setDate(dateDebut.getDate() - 14)
      const dateFin = new Date()
      dateFin.setDate(dateFin.getDate() + 30)

      const { data: ots, error: otsErr } = await supabase
        .from('ordres_transport')
        .select('id, reference, statut, statut_transport, statut_operationnel, date_chargement_prevue, date_livraison_prevue, distance_km, nature_marchandise, client_id, vehicule_id, clients!inner(nom)')
        .eq('conducteur_id', conducteur.id)
        .order('date_chargement_prevue', { ascending: true, nullsFirst: false })
        .limit(60)

      if (otsErr) throw otsErr

      const otList = ((ots ?? []) as unknown[]).map((o: unknown) => {
        const row = o as Record<string, unknown>
        const clientsRaw = row.clients
        const clientNom = (Array.isArray(clientsRaw)
          ? (clientsRaw[0] as { nom: string } | undefined)?.nom
          : (clientsRaw as { nom?: string } | null)?.nom) ?? ''
        return { ...row, client_nom: clientNom } as {
          id: string; reference: string; statut: string; statut_transport: string | null; statut_operationnel: string | null
          date_chargement_prevue: string | null; date_livraison_prevue: string | null
          distance_km: number | null; nature_marchandise: string | null
          client_nom: string; vehicule_id: string | null
        }
      })

      // Véhicules
      const vehiculeIds = [...new Set(otList.map(o => o.vehicule_id).filter(Boolean))]
      let vehiculeMap: Record<string, string> = {}
      if (vehiculeIds.length > 0) {
        const { data: vData } = await supabase
          .from('vehicules')
          .select('id, immatriculation, marque')
          .in('id', vehiculeIds as string[])
        ;(vData ?? []).forEach((v: { id: string; immatriculation: string; marque: string | null }) => {
          vehiculeMap[v.id] = [v.marque, v.immatriculation].filter(Boolean).join(' ')
        })
      }

      // Étapes (villes chargement + livraison)
      const otIds = otList.map(o => o.id)
      let stepsMap: Record<string, { chargement: string | null; livraison: string | null }> = {}
      if (otIds.length > 0) {
        const { data: steps } = await supabase
          .from('etapes_mission')
          .select('ot_id, type_etape, ville, adresse_libre')
          .in('ot_id', otIds)
        ;(steps ?? []).forEach((s: { ot_id: string; type_etape: string; ville: string | null; adresse_libre: string | null }) => {
          if (!stepsMap[s.ot_id]) stepsMap[s.ot_id] = { chargement: null, livraison: null }
          const lieu = s.ville || s.adresse_libre || null
          if (s.type_etape === 'chargement') stepsMap[s.ot_id].chargement = lieu
          if (s.type_etape === 'livraison') stepsMap[s.ot_id].livraison = lieu
        })
      }

      const result: Mission[] = otList.map(o => ({
        id: o.id,
        reference: o.reference,
        statut: o.statut,
        statut_transport: o.statut_transport,
        statut_operationnel: o.statut_operationnel,
        date_chargement_prevue: o.date_chargement_prevue,
        date_livraison_prevue: o.date_livraison_prevue,
        distance_km: o.distance_km,
        nature_marchandise: o.nature_marchandise,
        client_nom: o.client_nom,
        chargement_ville: stepsMap[o.id]?.chargement ?? null,
        livraison_ville: stepsMap[o.id]?.livraison ?? null,
        vehicule_label: o.vehicule_id ? (vehiculeMap[o.vehicule_id] ?? null) : null,
      }))

      setMissions(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil])

  const filtered = missions.filter(m => {
    const b = bucket(m.date_chargement_prevue)
    if (filtre === 'en_cours') return ST_EN_COURS.includes((m.statut_transport ?? m.statut) as never)
    if (filtre === 'a_venir') return b === 'futur' || b === 'aujourd_hui'
    if (filtre === 'passe') return b === 'passe' || m.statut_transport === 'termine' || m.statut === 'livre' || m.statut === 'facture'
    return true
  })

  const grouped = groupByDay(filtered)

  const counts = {
    en_cours: missions.filter(m => ST_EN_COURS.includes((m.statut_transport ?? m.statut) as never)).length,
    a_venir: missions.filter(m => {
      const b = bucket(m.date_chargement_prevue)
      return b === 'futur' || b === 'aujourd_hui'
    }).length,
    passe: missions.filter(m => {
      const b = bucket(m.date_chargement_prevue)
      return b === 'passe' || m.statut_transport === 'termine' || m.statut === 'livre' || m.statut === 'facture'
    }).length,
  }

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[color:var(--text)]">Mon planning</h1>
          <p className="text-xs text-[color:var(--muted)]">{prenom} — {missions.length} mission{missions.length > 1 ? 's' : ''} trouvée{missions.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border bg-[color:var(--surface)] text-[color:var(--muted)] transition hover:text-[color:var(--text)] active:scale-95"
          >
            <span className={refreshing ? 'animate-spin' : ''}><IconRefresh /></span>
          </button>
          <Link
            to="/feuille-route"
            className="flex h-9 items-center gap-1.5 rounded-xl border bg-[color:var(--primary)] px-3 text-xs font-semibold text-white"
          >
            Feuille de route <IconArrow />
          </Link>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          { key: 'a_venir', label: `À venir (${counts.a_venir})` },
          { key: 'en_cours', label: `En cours (${counts.en_cours})` },
          { key: 'passe', label: `Passées (${counts.passe})` },
          { key: 'all', label: 'Tout' },
        ] as { key: Filtre; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFiltre(tab.key)}
            className={[
              'flex-shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition',
              filtre === tab.key
                ? 'border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--primary)]'
                : 'border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted)]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Erreur ── */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Liste missions ── */}
      {grouped.length === 0 ? (
        <div className="rounded-2xl border bg-[color:var(--surface)] px-6 py-10 text-center">
          <p className="text-[color:var(--muted)] text-sm">Aucune mission pour ce filtre</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => (
            <div key={group.dateISO} className="space-y-2">

              {/* Label du jour */}
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
                  {group.label}
                </p>
                <div className="flex-1 border-t border-[color:var(--border)]" />
              </div>

              {/* Missions du jour */}
              {group.missions.map(m => (
                <Link
                  key={m.id}
                  to="/feuille-route"
                  className="block rounded-2xl border bg-[color:var(--surface)] p-4 transition hover:border-[color:var(--primary)]/40 active:scale-[0.99]"
                >
                  {/* Ligne 1 : ref + statut */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <IconRoute />
                      <span className="font-semibold text-sm text-[color:var(--text)]">{m.reference}</span>
                    </div>
                    <span className={['rounded-full border px-2 py-0.5 text-[10px] font-bold', statutColor(m.statut)].join(' ')}>
                      {statutLabel(m.statut)}
                    </span>
                  </div>

                  {/* Ligne 2 : client + marchandise */}
                  <p className="mt-1.5 text-xs text-[color:var(--muted)] truncate">
                    {m.client_nom}
                    {m.nature_marchandise ? ` · ${m.nature_marchandise}` : ''}
                  </p>

                  {/* Ligne 3 : horaires */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-[color:var(--bg)] px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-[color:var(--muted)]">Chargement</p>
                      <p className="mt-0.5 text-sm font-bold text-[color:var(--text)]">{formatHeure(m.date_chargement_prevue)}</p>
                      {m.chargement_ville && (
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[color:var(--muted)]">
                          <IconPin />
                          <span className="truncate">{m.chargement_ville}</span>
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl bg-[color:var(--bg)] px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-[color:var(--muted)]">Livraison</p>
                      <p className="mt-0.5 text-sm font-bold text-[color:var(--text)]">{formatHeure(m.date_livraison_prevue)}</p>
                      {m.livraison_ville && (
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[color:var(--muted)]">
                          <IconPin />
                          <span className="truncate">{m.livraison_ville}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ligne 4 : infos secondaires */}
                  {(m.distance_km || m.vehicule_label) && (
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-[color:var(--muted)]">
                      {m.vehicule_label && (
                        <span className="flex items-center gap-1">
                          <IconTruck />
                          {m.vehicule_label}
                        </span>
                      )}
                      {m.distance_km && m.distance_km > 0 && (
                        <span>{m.distance_km} km</span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="h-4" />
    </div>
  )
}
