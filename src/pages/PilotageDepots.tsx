import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { listUnifiedConducteurs } from '@/lib/services/personsService'
import { normalizeTenantDepotSites } from '@/lib/depotSites'
import {
  listActiveDepotAssignments,
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

  const [tab, setTab] = useState<'centres' | 'effectif' | 'flotte'>('centres')
  const [filter, setFilter] = useState<DepotFilter>('all')
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const [showCreateCenterModal, setShowCreateCenterModal] = useState(false)
  const [centerSaving, setCenterSaving] = useState(false)
  const [centerForm, setCenterForm] = useState({
    nom: '',
    adresse: '',
    code_postal: '',
    ville: '',
    pays: 'France',
    est_depot_relais: true,
    notes: '',
    set_primary: false,
  })

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

  const loadDepotSites = useCallback(async (tenantCompanyId: number): Promise<DepotSite[]> => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) throw new Error('Session expirée. Recharge la page puis reconnecte-toi.')

    const response = await fetch('/.netlify/functions/v11-logistic-sites', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await response.json().catch(() => ({} as { data?: Array<Record<string, unknown>>; error?: string }))
    if (!response.ok) {
      throw new Error(typeof body.error === 'string' ? body.error : `Erreur HTTP ${response.status}`)
    }

    const data: Array<Record<string, unknown>> = Array.isArray(body.data) ? body.data : []
    return normalizeTenantDepotSites(data, tenantCompanyId) as DepotSite[]
  }, [])

  const loadAll = useCallback(async () => {
    if (typeof companyId !== 'number') return

    setLoading(true)
    const [
      depotSitesRes,
      conducteursRes,
      profilsRes,
      vehiculesRes,
      remorquesRes,
      staffRes,
      assetsRes,
    ] = await Promise.allSettled([
      loadDepotSites(companyId),
      listUnifiedConducteurs(companyId, { activeOnly: true }),
      supabase.from('profils').select('id, nom, prenom, role').eq('company_id', companyId).in('role', ['exploitant', 'mecanicien']).order('nom').order('prenom'),
      supabase.from('vehicules').select('id, immatriculation, statut').eq('company_id', companyId).order('immatriculation'),
      supabase.from('remorques').select('id, immatriculation, statut').eq('company_id', companyId).order('immatriculation'),
      listActiveDepotAssignments(companyId),
      listActiveAssetDepotAssignments(companyId),
    ])

    const errors: string[] = []

    if (depotSitesRes.status === 'fulfilled') {
      setDepots(depotSitesRes.value)
    } else {
      setDepots([])
      errors.push(`centres: ${depotSitesRes.reason instanceof Error ? depotSitesRes.reason.message : 'inconnu'}`)
    }

    if (conducteursRes.status === 'fulfilled') {
      setConducteurs((conducteursRes.value as ConducteurLite[]).filter(c => c.statut !== 'inactif'))
    } else {
      setConducteurs([])
      errors.push(`conducteurs: ${conducteursRes.reason instanceof Error ? conducteursRes.reason.message : 'inconnu'}`)
    }

    if (profilsRes.status === 'fulfilled') {
      setProfils((profilsRes.value.data ?? []) as ProfilLite[])
    } else {
      setProfils([])
      errors.push(`profils: ${profilsRes.reason instanceof Error ? profilsRes.reason.message : 'inconnu'}`)
    }

    if (vehiculesRes.status === 'fulfilled') {
      setVehicules((vehiculesRes.value.data ?? []) as VehiculeLite[])
    } else {
      setVehicules([])
      errors.push(`vehicules: ${vehiculesRes.reason instanceof Error ? vehiculesRes.reason.message : 'inconnu'}`)
    }

    if (remorquesRes.status === 'fulfilled') {
      setRemorques((remorquesRes.value.data ?? []) as RemorqueLite[])
    } else {
      setRemorques([])
      errors.push(`remorques: ${remorquesRes.reason instanceof Error ? remorquesRes.reason.message : 'inconnu'}`)
    }

    if (staffRes.status === 'fulfilled') {
      setStaffAssignments(staffRes.value)
    } else {
      setStaffAssignments([])
      errors.push(`affectations effectif: ${staffRes.reason instanceof Error ? staffRes.reason.message : 'inconnu'}`)
    }

    if (assetsRes.status === 'fulfilled') {
      setAssetAssignments(assetsRes.value)
    } else {
      setAssetAssignments([])
      errors.push(`affectations flotte: ${assetsRes.reason instanceof Error ? assetsRes.reason.message : 'inconnu'}`)
    }

    if (errors.length > 0) {
      showNotice(`Chargement partiel: ${errors.join(' | ')}`, 'error')
    }

    setLoading(false)
  }, [companyId, loadDepotSites, showNotice])

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

  function openCreateCenterModal() {
    setCenterForm({
      nom: '',
      adresse: '',
      code_postal: '',
      ville: '',
      pays: 'France',
      est_depot_relais: true,
      notes: '',
      set_primary: depots.length === 0,
    })
    setShowCreateCenterModal(true)
  }

  async function submitCreateCenter(e: React.FormEvent) {
    e.preventDefault()
    if (!centerForm.nom.trim()) {
      showNotice('Le nom du centre est obligatoire.', 'error')
      return
    }
    if (!centerForm.adresse.trim()) {
      showNotice('L\'adresse du centre est obligatoire.', 'error')
      return
    }

    setCenterSaving(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expirée. Recharge la page puis reconnecte-toi.')

      const payload = {
        nom: centerForm.nom.trim(),
        adresse: centerForm.adresse.trim(),
        code_postal: centerForm.code_postal.trim() || null,
        ville: centerForm.ville.trim() || null,
        pays: centerForm.pays.trim() || 'France',
        type_site: 'depot',
        usage_type: 'mixte',
        est_depot_relais: centerForm.est_depot_relais,
        notes: centerForm.notes.trim() || null,
      }

      const createRes = await fetch('/.netlify/functions/v11-logistic-sites', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const createBody = await createRes.json().catch(() => ({} as { error?: string; data?: { id?: string } }))
      if (!createRes.ok) {
        throw new Error(typeof createBody.error === 'string' ? createBody.error : `Erreur HTTP ${createRes.status}`)
      }

      const createdId = typeof createBody.data?.id === 'string' ? createBody.data.id : null
      if (centerForm.set_primary && createdId) {
        const primaryRes = await fetch(`/.netlify/functions/v11-logistic-sites?action=set_primary&site_id=${encodeURIComponent(createdId)}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        })
        const primaryBody = await primaryRes.json().catch(() => ({} as { error?: string }))
        if (!primaryRes.ok) {
          throw new Error(typeof primaryBody.error === 'string' ? primaryBody.error : `Erreur HTTP ${primaryRes.status}`)
        }
      }

      setShowCreateCenterModal(false)
      await loadAll()
      if (createdId) setFilter(createdId)
      setTab('effectif')
      showNotice('Centre créé. Tu peux maintenant affecter effectif et flotte.', 'success')
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Creation du centre impossible.', 'error')
    } finally {
      setCenterSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-secondary">Chargement du pilotage depots...</div>
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="border-b border-line-strong bg-surface px-6 py-4">
        <h1 className="text-2xl font-bold">Pilotage centres</h1>
        <p className="text-sm text-secondary mt-1">Centralise les centres, puis pilote les affectations effectif et flotte.</p>
      </div>

      {notice && (
        <div className={`px-6 py-3 text-sm ${notice.type === 'error' ? 'bg-red-500/15 text-red-300' : 'bg-green-500/15 text-green-300'}`}>
          {notice.message}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="rounded-xl border border-line bg-surface p-4 flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 border-b border-line-strong">
            <button className={`${TAB_BUTTON} ${tab === 'centres' ? 'border-blue-600 text-blue-600' : 'border-transparent text-secondary hover:text-foreground'}`} onClick={() => setTab('centres')}>
              Centres
            </button>
            <button className={`${TAB_BUTTON} ${tab === 'effectif' ? 'border-blue-600 text-blue-600' : 'border-transparent text-secondary hover:text-foreground'}`} onClick={() => setTab('effectif')}>
              Effectif
            </button>
            <button className={`${TAB_BUTTON} ${tab === 'flotte' ? 'border-blue-600 text-blue-600' : 'border-transparent text-secondary hover:text-foreground'}`} onClick={() => setTab('flotte')}>
              Flotte
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-secondary">Filtre centre</span>
            <select className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" value={filter} onChange={e => setFilter(e.target.value as DepotFilter)}>
              <option value="all">Tous les centres</option>
              <option value="unassigned">Non affectes</option>
              {depots.map(depot => (
                <option key={depot.id} value={depot.id}>{depot.nom}</option>
              ))}
            </select>
            {canManage && tab === 'centres' && (
              <button className={BTN_PRIMARY} onClick={openCreateCenterModal} type="button">
                + Nouveau centre
              </button>
            )}
          </div>
        </div>

        {tab === 'centres' && (
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
        )}

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
            Aucun centre disponible. Cree d'abord un centre dans Pilotage centres.
          </div>
        )}
      </div>

      {showCreateCenterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={submitCreateCenter} className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
              <h2 className="font-semibold text-slate-100">Nouveau centre tenant</h2>
              <button type="button" onClick={() => setShowCreateCenterModal(false)} className="text-discreet hover:text-slate-300 text-xl">✕</button>
            </div>
            <div className="overflow-y-auto px-6 py-4 space-y-3 flex-1">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Nom du centre *</label>
                <input
                  value={centerForm.nom}
                  onChange={e => setCenterForm(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="Ex: Centre Nord Lyon"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Adresse *</label>
                <input
                  value={centerForm.adresse}
                  onChange={e => setCenterForm(prev => ({ ...prev, adresse: e.target.value }))}
                  placeholder="Rue, numero..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Code postal</label>
                  <input
                    value={centerForm.code_postal}
                    onChange={e => setCenterForm(prev => ({ ...prev, code_postal: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Ville</label>
                  <input
                    value={centerForm.ville}
                    onChange={e => setCenterForm(prev => ({ ...prev, ville: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Pays</label>
                  <input
                    value={centerForm.pays}
                    onChange={e => setCenterForm(prev => ({ ...prev, pays: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Notes</label>
                <textarea
                  value={centerForm.notes}
                  onChange={e => setCenterForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={centerForm.est_depot_relais}
                  onChange={e => setCenterForm(prev => ({ ...prev, est_depot_relais: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-300">Activer les depots/relais depuis le planning</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={centerForm.set_primary}
                  onChange={e => setCenterForm(prev => ({ ...prev, set_primary: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-300">Definir ce centre comme principal</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800 flex-shrink-0">
              <button type="button" onClick={() => setShowCreateCenterModal(false)} className="px-4 py-2 rounded-lg text-sm text-muted hover:text-slate-200 transition-colors">Annuler</button>
              <button type="submit" disabled={centerSaving} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {centerSaving ? 'Enregistrement...' : 'Creer le centre'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
