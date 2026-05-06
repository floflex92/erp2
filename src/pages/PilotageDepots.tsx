import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { listUnifiedConducteurs } from '@/lib/services/personsService'
import {
  listActiveDepotAssignments,
  listDepotSites,
  transferConducteurToDepot,
  transferProfilToDepot,
  type DepotSite,
  type StaffDepotAssignment,
} from '@/lib/staffDepots'
import {
  listActiveAssetDepotAssignments,
  transferVehiculeToDepot,
  transferRemorqueToDepot,
  type AssetDepotAssignment,
} from '@/lib/assetDepots'

type ConducteurLite = { id: string; nom: string; prenom: string; statut: string | null }
type ProfilLite = { id: string; nom: string | null; prenom: string | null; role: string | null }
type VehiculeLite = { id: string; immatriculation: string; statut: string | null }
type RemorqueLite = { id: string; immatriculation: string; statut: string | null }

type DepotFilter = 'all' | 'unassigned' | string

type Notice = { type: 'success' | 'error'; message: string } | null

const TAB_BUTTON = 'px-4 py-2 font-medium border-b-2 transition-colors'
const BTN_PRIMARY = 'px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors'

function profilLabel(profil: ProfilLite) {
  const fullName = [profil.prenom, profil.nom].filter(Boolean).join(' ').trim()
  const roleLabel = profil.role === 'exploitant'
    ? 'Exploitant'
    : profil.role === 'mecanicien'
      ? 'Mecano'
      : profil.role ?? 'Profil'
  return fullName ? `${fullName} (${roleLabel})` : roleLabel
}

function DepotBadge({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${primary ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-slate-500/15 text-slate-300 border-slate-500/30'}`}>
      {primary && <span>★</span>}
      {label}
    </span>
  )
}

export default function PilotageDepots() {
  const { companyId, role } = useAuth()
  const canManage = ['admin', 'dirigeant', 'exploitant', 'logisticien', 'flotte'].includes(role ?? '')

  const [tab, setTab] = useState<'effectif' | 'flotte'>('effectif')
  const [filter, setFilter] = useState<DepotFilter>('all')
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice>(null)

  const [depots, setDepots] = useState<DepotSite[]>([])
  const [conducteurs, setConducteurs] = useState<ConducteurLite[]>([])
  const [profils, setProfils] = useState<ProfilLite[]>([])
  const [vehicules, setVehicules] = useState<VehiculeLite[]>([])
  const [remorques, setRemorques] = useState<RemorqueLite[]>([])
  const [staffAssignments, setStaffAssignments] = useState<StaffDepotAssignment[]>([])
  const [assetAssignments, setAssetAssignments] = useState<AssetDepotAssignment[]>([])

  const showNotice = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ type, message })
    setTimeout(() => setNotice(null), 4000)
  }, [])

  const loadAll = useCallback(async () => {
    if (typeof companyId !== 'number') return

    setLoading(true)
    try {
      const [
        depotSites,
        conducteursRes,
        profilsRes,
        vehiculesRes,
        remorquesRes,
        staff,
        assets,
      ] = await Promise.all([
        listDepotSites(companyId),
        listUnifiedConducteurs(companyId, { activeOnly: true }),
        supabase.from('profils').select('id, nom, prenom, role').eq('company_id', companyId).in('role', ['exploitant', 'mecanicien']).order('nom').order('prenom'),
        supabase.from('vehicules').select('id, immatriculation, statut').eq('company_id', companyId).order('immatriculation'),
        supabase.from('remorques').select('id, immatriculation, statut').eq('company_id', companyId).order('immatriculation'),
        listActiveDepotAssignments(companyId),
        listActiveAssetDepotAssignments(companyId),
      ])

      setDepots(depotSites)
  setConducteurs((conducteursRes as ConducteurLite[]).filter(c => c.statut !== 'inactif'))
      setProfils((profilsRes.data ?? []) as ProfilLite[])
      setVehicules((vehiculesRes.data ?? []) as VehiculeLite[])
      setRemorques((remorquesRes.data ?? []) as RemorqueLite[])
      setStaffAssignments(staff)
      setAssetAssignments(assets)
    } catch (err) {
      showNotice(`Erreur de chargement: ${err instanceof Error ? err.message : 'inconnue'}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [companyId, showNotice])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const depotMap = useMemo(() => {
    return new Map(depots.map(depot => [depot.id, depot]))
  }, [depots])

  const conducteurDepot = useMemo(() => {
    const map = new Map<string, string>()
    for (const assignment of staffAssignments) {
      if (assignment.conducteur_id) map.set(assignment.conducteur_id, assignment.depot_site_id)
    }
    return map
  }, [staffAssignments])

  const profilDepot = useMemo(() => {
    const map = new Map<string, string>()
    for (const assignment of staffAssignments) {
      if (assignment.profil_id) map.set(assignment.profil_id, assignment.depot_site_id)
    }
    return map
  }, [staffAssignments])

  const vehiculeDepot = useMemo(() => {
    const map = new Map<string, string>()
    for (const assignment of assetAssignments) {
      if (assignment.vehicule_id) map.set(assignment.vehicule_id, assignment.depot_site_id)
    }
    return map
  }, [assetAssignments])

  const remorqueDepot = useMemo(() => {
    const map = new Map<string, string>()
    for (const assignment of assetAssignments) {
      if (assignment.remorque_id) map.set(assignment.remorque_id, assignment.depot_site_id)
    }
    return map
  }, [assetAssignments])

  const matchFilter = useCallback((depotId: string | undefined) => {
    if (filter === 'all') return true
    if (filter === 'unassigned') return !depotId
    return depotId === filter
  }, [filter])

  const stats = useMemo(() => {
    return depots.map(depot => ({
      depot,
      conducteurs: conducteurs.filter(c => conducteurDepot.get(c.id) === depot.id).length,
      profils: profils.filter(p => profilDepot.get(p.id) === depot.id).length,
      vehicules: vehicules.filter(v => vehiculeDepot.get(v.id) === depot.id).length,
      remorques: remorques.filter(r => remorqueDepot.get(r.id) === depot.id).length,
    }))
  }, [depots, conducteurs, profils, vehicules, remorques, conducteurDepot, profilDepot, vehiculeDepot, remorqueDepot])

  const unassigned = useMemo(() => ({
    conducteurs: conducteurs.filter(c => !conducteurDepot.has(c.id)).length,
    profils: profils.filter(p => !profilDepot.has(p.id)).length,
    vehicules: vehicules.filter(v => !vehiculeDepot.has(v.id)).length,
    remorques: remorques.filter(r => !remorqueDepot.has(r.id)).length,
  }), [conducteurs, profils, vehicules, remorques, conducteurDepot, profilDepot, vehiculeDepot, remorqueDepot])

  async function handleTransfer(
    key: string,
    action: () => Promise<boolean>,
    successLabel: string,
    sameLabel: string,
  ) {
    setBusyKey(key)
    try {
      const changed = await action()
      showNotice(changed ? successLabel : sameLabel, changed ? 'success' : 'error')
      await loadAll()
    } catch (err) {
      showNotice(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`, 'error')
    } finally {
      setBusyKey(null)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-secondary">Chargement du pilotage depots...</div>
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="border-b border-line-strong bg-surface px-6 py-4">
        <h1 className="text-2xl font-bold">Pilotage Depots</h1>
        <p className="text-sm text-secondary mt-1">Visualise l'effectif et la flotte affectes a chaque depot, avec acces aux non affectes.</p>
      </div>

      {notice && (
        <div className={`px-6 py-3 text-sm ${notice.type === 'error' ? 'bg-red-500/15 text-red-300' : 'bg-green-500/15 text-green-300'}`}>
          {notice.message}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(item => (
            <div key={item.depot.id} className="rounded-xl border border-line bg-surface p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{item.depot.nom}</p>
                {item.depot.is_primary && <DepotBadge label="Principal" primary />}
              </div>
              <p className="text-xs text-secondary">Conducteurs {item.conducteurs} • Equipe {item.profils}</p>
              <p className="text-xs text-secondary">Camions {item.vehicules} • Remorques {item.remorques}</p>
            </div>
          ))}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
            <p className="font-semibold text-amber-300">Non affectes</p>
            <p className="text-xs text-amber-200">Conducteurs {unassigned.conducteurs} • Equipe {unassigned.profils}</p>
            <p className="text-xs text-amber-200">Camions {unassigned.vehicules} • Remorques {unassigned.remorques}</p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 border-b border-line-strong">
            <button className={`${TAB_BUTTON} ${tab === 'effectif' ? 'border-blue-600 text-blue-600' : 'border-transparent text-secondary hover:text-foreground'}`} onClick={() => setTab('effectif')}>
              Effectif
            </button>
            <button className={`${TAB_BUTTON} ${tab === 'flotte' ? 'border-blue-600 text-blue-600' : 'border-transparent text-secondary hover:text-foreground'}`} onClick={() => setTab('flotte')}>
              Flotte
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-secondary">Filtre depot</span>
            <select className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" value={filter} onChange={e => setFilter(e.target.value as DepotFilter)}>
              <option value="all">Tous les depots</option>
              <option value="unassigned">Non affectes</option>
              {depots.map(depot => (
                <option key={depot.id} value={depot.id}>{depot.nom}</option>
              ))}
            </select>
          </div>
        </div>

        {tab === 'effectif' ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-line bg-surface p-4 space-y-3">
              <h2 className="font-semibold">Conducteurs</h2>
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {conducteurs
                  .filter(c => matchFilter(conducteurDepot.get(c.id)))
                  .map(conducteur => {
                    const currentDepotId = conducteurDepot.get(conducteur.id)
                    const currentDepot = currentDepotId ? depotMap.get(currentDepotId) ?? null : null
                    const rowKey = `conducteur-${conducteur.id}`
                    return (
                      <div key={conducteur.id} className="rounded-lg border border-line px-3 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium">{conducteur.prenom} {conducteur.nom}</p>
                          <p className="text-xs text-secondary">{currentDepot ? `Depot ${currentDepot.nom}` : 'Non affecte'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            disabled={!canManage || busyKey === rowKey}
                            defaultValue={currentDepotId ?? ''}
                            className="rounded-lg border border-line bg-surface px-2 py-2 text-sm"
                            onChange={e => {
                              const value = e.target.value || null
                              void handleTransfer(
                                rowKey,
                                () => transferConducteurToDepot({
                                  companyId: companyId as number,
                                  conducteurId: conducteur.id,
                                  depotSiteId: value,
                                  source: 'manual_transfer',
                                }),
                                `Conducteur ${conducteur.prenom} ${conducteur.nom} transfere`,
                                'Aucun changement de depot',
                              )
                            }}
                          >
                            <option value="">Non affecte</option>
                            {depots.map(d => (
                              <option key={d.id} value={d.id}>{d.nom}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </section>

            <section className="rounded-xl border border-line bg-surface p-4 space-y-3">
              <h2 className="font-semibold">Exploitants & Mecanos</h2>
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {profils
                  .filter(p => matchFilter(profilDepot.get(p.id)))
                  .map(profil => {
                    const currentDepotId = profilDepot.get(profil.id)
                    const currentDepot = currentDepotId ? depotMap.get(currentDepotId) ?? null : null
                    const rowKey = `profil-${profil.id}`
                    return (
                      <div key={profil.id} className="rounded-lg border border-line px-3 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium">{profilLabel(profil)}</p>
                          <p className="text-xs text-secondary">{currentDepot ? `Depot ${currentDepot.nom}` : 'Non affecte'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            disabled={!canManage || busyKey === rowKey}
                            defaultValue={currentDepotId ?? ''}
                            className="rounded-lg border border-line bg-surface px-2 py-2 text-sm"
                            onChange={e => {
                              const value = e.target.value || null
                              void handleTransfer(
                                rowKey,
                                () => transferProfilToDepot({
                                  companyId: companyId as number,
                                  profilId: profil.id,
                                  depotSiteId: value,
                                  source: 'manual_transfer',
                                }),
                                `${profilLabel(profil)} transfere`,
                                'Aucun changement de depot',
                              )
                            }}
                          >
                            <option value="">Non affecte</option>
                            {depots.map(d => (
                              <option key={d.id} value={d.id}>{d.nom}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </section>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-line bg-surface p-4 space-y-3">
              <h2 className="font-semibold">Camions</h2>
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {vehicules
                  .filter(v => matchFilter(vehiculeDepot.get(v.id)))
                  .map(vehicule => {
                    const currentDepotId = vehiculeDepot.get(vehicule.id)
                    const currentDepot = currentDepotId ? depotMap.get(currentDepotId) ?? null : null
                    const rowKey = `vehicule-${vehicule.id}`
                    return (
                      <div key={vehicule.id} className="rounded-lg border border-line px-3 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium">{vehicule.immatriculation}</p>
                          <p className="text-xs text-secondary">{currentDepot ? `Depot ${currentDepot.nom}` : 'Non affecte'} • Statut {vehicule.statut ?? 'n/a'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            disabled={!canManage || busyKey === rowKey}
                            defaultValue={currentDepotId ?? ''}
                            className="rounded-lg border border-line bg-surface px-2 py-2 text-sm"
                            onChange={e => {
                              const value = e.target.value || null
                              void handleTransfer(
                                rowKey,
                                () => transferVehiculeToDepot({
                                  companyId: companyId as number,
                                  vehiculeId: vehicule.id,
                                  depotSiteId: value,
                                  source: 'manual_transfer',
                                }),
                                `Vehicule ${vehicule.immatriculation} transfere`,
                                'Aucun changement de depot',
                              )
                            }}
                          >
                            <option value="">Non affecte</option>
                            {depots.map(d => (
                              <option key={d.id} value={d.id}>{d.nom}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </section>

            <section className="rounded-xl border border-line bg-surface p-4 space-y-3">
              <h2 className="font-semibold">Remorques</h2>
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {remorques
                  .filter(r => matchFilter(remorqueDepot.get(r.id)))
                  .map(remorque => {
                    const currentDepotId = remorqueDepot.get(remorque.id)
                    const currentDepot = currentDepotId ? depotMap.get(currentDepotId) ?? null : null
                    const rowKey = `remorque-${remorque.id}`
                    return (
                      <div key={remorque.id} className="rounded-lg border border-line px-3 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium">{remorque.immatriculation}</p>
                          <p className="text-xs text-secondary">{currentDepot ? `Depot ${currentDepot.nom}` : 'Non affecte'} • Statut {remorque.statut ?? 'n/a'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            disabled={!canManage || busyKey === rowKey}
                            defaultValue={currentDepotId ?? ''}
                            className="rounded-lg border border-line bg-surface px-2 py-2 text-sm"
                            onChange={e => {
                              const value = e.target.value || null
                              void handleTransfer(
                                rowKey,
                                () => transferRemorqueToDepot({
                                  companyId: companyId as number,
                                  remorqueId: remorque.id,
                                  depotSiteId: value,
                                  source: 'manual_transfer',
                                }),
                                `Remorque ${remorque.immatriculation} transferee`,
                                'Aucun changement de depot',
                              )
                            }}
                          >
                            <option value="">Non affecte</option>
                            {depots.map(d => (
                              <option key={d.id} value={d.id}>{d.nom}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </section>
          </div>
        )}

        {!canManage && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Vous etes en lecture seule pour les affectations depot.
          </div>
        )}

        {depots.length === 0 && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Aucun depot disponible. Cree d'abord un depot dans Entrepots.
          </div>
        )}
      </div>
    </div>
  )
}
