import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/lib/database.types'
import { STATUT_OPS, StatutOpsDot, type StatutOps } from '@/lib/statut-ops'
import BourseAffretementPanel from '@/components/transports/BourseAffretementPanel'
import { useLogisticSites } from '@/hooks/useLogisticSites'
import { useTransportStatusHistory } from '@/hooks/useTransportStatusHistory'
import { useAuth } from '@/lib/auth'
import {
  evaluateAffretementCompletionReadiness,
  findAffreteurOnboardingForScope,
  getAffretementContractByOtId,
  listAffreteurOnboardings,
  listAffretementContractsByOnboarding,
  subscribeAffretementPortalUpdates,
} from '@/lib/affretementPortal'
import {
  setCourseAffretement,
  TRANSPORT_SOURCES,
  TRANSPORT_STATUS_FLOW,
  TRANSPORT_STATUS_LABELS,
  type TransportStatus,
} from '@/lib/transportCourses'

type OT = Tables<'ordres_transport'>
type EtapeMission = Tables<'etapes_mission'>
type ClientLookup = { id: string; nom: string }
type ConducteurLookup = { id: string; nom: string; prenom: string }
type VehiculeLookup = { id: string; immatriculation: string; marque: string | null }
type AffreteurLookup = { id: string; company_name: string }

const STATUT_COLORS: Record<string, string> = {
  brouillon:   'bg-slate-100 text-slate-600',
  confirme:    'bg-blue-100 text-blue-700',
  en_cours:    'bg-yellow-100 text-yellow-700',
  livre:       'bg-green-100 text-green-700',
  facture:     'bg-purple-100 text-purple-700',
  annule:      'bg-red-100 text-red-600',
}
const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', confirme: 'Confirmé', en_cours: 'En cours',
  livre: 'Livré', facture: 'Facturé', annule: 'Annulé',
}
const TRANSPORT_STATUS_COLORS: Record<TransportStatus, string> = {
  en_attente_validation: 'bg-slate-100 text-slate-700',
  valide: 'bg-blue-100 text-blue-700',
  en_attente_planification: 'bg-indigo-100 text-indigo-700',
  planifie: 'bg-cyan-100 text-cyan-700',
  en_cours_approche_chargement: 'bg-amber-100 text-amber-700',
  en_chargement: 'bg-orange-100 text-orange-700',
  en_transit: 'bg-purple-100 text-purple-700',
  en_livraison: 'bg-fuchsia-100 text-fuchsia-700',
  termine: 'bg-emerald-100 text-emerald-700',
  annule: 'bg-red-100 text-red-700',
}
const TYPE_TRANSPORT_LABELS: Record<string, string> = {
  complet: 'Complet', partiel: 'Partiel', express: 'Express', groupage: 'Groupage',
}

const EMPTY_OT: TablesInsert<'ordres_transport'> = {
  client_id: '', type_transport: 'complet', statut: 'brouillon',
  source_course: 'manuel', statut_transport: 'en_attente_validation',
  donneur_ordre_id: '', est_affretee: false, affreteur_id: null,
  chargement_site_id: null, livraison_site_id: null,
  reference_externe: null,
  nature_marchandise: null, poids_kg: null, volume_m3: null, nombre_colis: null,
  date_chargement_prevue: null, date_livraison_prevue: null,
  conducteur_id: null, vehicule_id: null, remorque_id: null,
  prix_ht: null, taux_tva: 20, distance_km: null,
  numero_cmr: null, numero_bl: null,
  instructions: null, notes_internes: null,
}

const inp = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}

export default function Transports() {
  const { role, profil, user } = useAuth()
  const isAffreteurSession = role === 'affreteur'
  const canCreateOt = !isAffreteurSession
  const canChangeOtStatus = !isAffreteurSession
  const canDeleteOt = !isAffreteurSession
  const canUseBourse = role === 'admin' || role === 'dirigeant' || role === 'exploitant'

  const [list, setList] = useState<OT[]>([])
  const [clients, setClients] = useState<ClientLookup[]>([])
  const [conducteurs, setConducteurs] = useState<ConducteurLookup[]>([])
  const [vehicules, setVehicules] = useState<VehiculeLookup[]>([])
  const [affreteurs, setAffreteurs] = useState<AffreteurLookup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('tous')
  const [listView, setListView] = useState<'principal' | 'affretement'>('principal')
  const [transportTab, setTransportTab] = useState<'ot' | 'bourse'>('ot')
  const [statusGuardNotice, setStatusGuardNotice] = useState<string | null>(null)
  const [affreteurOtIds, setAffreteurOtIds] = useState<string[]>([])

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TablesInsert<'ordres_transport'>>(EMPTY_OT)
  const [saving, setSaving] = useState(false)

  // Detail panel
  const [selected, setSelected] = useState<OT | null>(null)
  const [etapes, setEtapes] = useState<EtapeMission[]>([])
  const [loadingEtapes, setLoadingEtapes] = useState(false)
  const { sites, addSite } = useLogisticSites()
  const { history: transportStatusHistory, loading: loadingTransportHistory, updateStatus: updateTransportStatus, load: loadTransportHistory } = useTransportStatusHistory()

  async function loadAll() {
    setLoading(true)
    const [ots, cls, conds, vehs] = await Promise.all([
      supabase.from('ordres_transport').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, nom').order('nom'),
      supabase.from('conducteurs').select('id, nom, prenom').order('nom'),
      supabase.from('vehicules').select('id, immatriculation, marque').order('immatriculation'),
    ])
    setList(ots.data ?? [])
    setClients(cls.data ?? [])
    setConducteurs(conds.data ?? [])
    setVehicules(vehs.data ?? [])
    const affList = listAffreteurOnboardings()
      .filter(item => item.status === 'validee')
      .map(item => ({ id: item.id, company_name: item.companyName }))
    setAffreteurs(affList)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (!isAffreteurSession || !profil?.id) {
      setAffreteurOtIds([])
      return
    }

    const reloadAffreteurScope = () => {
      const onboarding = findAffreteurOnboardingForScope({
        profileId: profil.id,
        email: user?.email,
      })
      if (!onboarding) {
        setAffreteurOtIds([])
        return
      }
      const contracts = listAffretementContractsByOnboarding(onboarding.id)
      setAffreteurOtIds(Array.from(new Set(contracts.map(contract => contract.otId))))
    }

    reloadAffreteurScope()
    const unsubscribe = subscribeAffretementPortalUpdates(reloadAffreteurScope)
    return unsubscribe
  }, [isAffreteurSession, profil?.id, user?.email])

  async function loadEtapes(otId: string) {
    setLoadingEtapes(true)
    const { data } = await supabase.from('etapes_mission').select('*').eq('ot_id', otId).order('ordre')
    setEtapes(data ?? [])
    setLoadingEtapes(false)
  }

  function openOT(ot: OT) {
    setSelected(ot)
    void loadEtapes(ot.id)
    void loadTransportHistory(ot.id)
  }

  const scopedList = useMemo(
    () => isAffreteurSession ? list.filter(ot => affreteurOtIds.includes(ot.id)) : list,
    [affreteurOtIds, isAffreteurSession, list],
  )

  useEffect(() => {
    if (selected && !scopedList.some(ot => ot.id === selected.id)) {
      setSelected(null)
    }
  }, [scopedList, selected])

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.nom]))
  const conducteurMap = Object.fromEntries(conducteurs.map(c => [c.id, `${c.prenom} ${c.nom}`]))
  const vehiculeMap = Object.fromEntries(vehicules.map(v => [v.id, `${v.immatriculation}${v.marque ? ` · ${v.marque}` : ''}`]))
  const siteMap = Object.fromEntries(sites.map(site => [site.id, site]))
  const affreteurMap = Object.fromEntries(affreteurs.map(item => [item.id, item.company_name]))

  const filtered = scopedList.filter(ot => {
    const matchSearch = ot.reference.toLowerCase().includes(search.toLowerCase()) ||
      (ot.reference_transport ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (clientMap[ot.client_id] ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatut = filterStatut === 'tous' || ot.statut === filterStatut
    const matchView = listView === 'principal' ? !ot.est_affretee : ot.est_affretee
    return matchSearch && matchStatut && matchView
  })

  function setF<K extends keyof TablesInsert<'ordres_transport'>>(k: K, v: TablesInsert<'ordres_transport'>[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canCreateOt) {
      setStatusGuardNotice('Creation OT bloquee: un affreteur doit passer par un compte client dedie.')
      return
    }
    if (!form.client_id) return
    setSaving(true)
    await supabase.from('ordres_transport').insert({
      ...form,
      donneur_ordre_id: form.donneur_ordre_id || form.client_id,
    })
    setSaving(false)
    setShowForm(false)
    setForm(EMPTY_OT)
    void loadAll()
  }

  async function toggleAffretement(ot: OT, onboardingId: string | null) {
    await setCourseAffretement(ot.id, onboardingId)
    if (selected?.id === ot.id) {
      setSelected({
        ...selected,
        est_affretee: Boolean(onboardingId),
        affreteur_id: onboardingId,
      })
    }
    void loadAll()
  }

  async function quickCreateSite(kind: 'chargement' | 'livraison') {
    const nom = window.prompt(`Nom du site ${kind}`)?.trim()
    if (!nom) return
    const adresse = window.prompt(`Adresse du site ${kind}`)?.trim()
    if (!adresse) return
    try {
      const created = await addSite({
        nom,
        adresse,
        entreprise_id: form.donneur_ordre_id || form.client_id || null,
      })
      if (kind === 'chargement') setF('chargement_site_id', created.id)
      if (kind === 'livraison') setF('livraison_site_id', created.id)
    } catch {
      setStatusGuardNotice('Creation du site logistique impossible pour le moment.')
    }
  }

  async function updateStatut(ot: OT, statut: string) {
    if (!canChangeOtStatus) return

    let nextStatut = statut
    const contract = getAffretementContractByOtId(ot.id)
    if (contract && (statut === 'livre' || statut === 'facture')) {
      const readiness = evaluateAffretementCompletionReadiness(contract)
      if (!readiness.readyForCompletion) {
        nextStatut = 'en_cours'
        setStatusGuardNotice('Statut force en cours: renseignez tous les statuts de course affretee avant livraison/facturation.')
      } else {
        setStatusGuardNotice(null)
      }
    }

    await supabase.from('ordres_transport').update({ statut: nextStatut }).eq('id', ot.id)
    if (selected?.id === ot.id) setSelected({ ...ot, statut: nextStatut })
    void loadAll()
  }

  async function del(id: string) {
    if (!canDeleteOt) return
    if (!confirm('Supprimer cet ordre de transport ?')) return
    await supabase.from('ordres_transport').delete().eq('id', id)
    if (selected?.id === id) setSelected(null)
    void loadAll()
  }

  return (
    <div className="space-y-4">
      <div className="nx-panel overflow-hidden">
        <div className="border-b px-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-4">
            <button type="button" onClick={() => setTransportTab('ot')} className={`px-1 py-3 text-sm font-semibold ${transportTab === 'ot' ? 'nx-tab nx-tab-active' : 'nx-tab hover:text-slate-700'}`}>Ordres de transport</button>
            {canUseBourse && (
              <button type="button" onClick={() => setTransportTab('bourse')} className={`px-1 py-3 text-sm font-semibold ${transportTab === 'bourse' ? 'nx-tab nx-tab-active' : 'nx-tab hover:text-slate-700'}`}>Bourse du fret</button>
            )}
          </div>
        </div>
      </div>

      {statusGuardNotice && <div className="nx-status-warning rounded-xl border border-amber-200 px-3 py-2 text-sm">{statusGuardNotice}</div>}

      {transportTab === 'bourse' && canUseBourse ? (
        <BourseAffretementPanel orders={list} clientMap={clientMap} onRefresh={() => { void loadAll() }} />
      ) : (
        <div className="flex gap-6 h-full">
      {/* Left: list */}
      <div className={`flex-1 min-w-0 ${selected ? 'hidden lg:block lg:max-w-[55%]' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Ordres de Transport</h2>
            <p className="text-slate-500 text-sm">{scopedList.length} OT{scopedList.length !== 1 ? 's' : ''}</p>
            {isAffreteurSession && <p className="text-xs text-slate-500 mt-1">Vue affreteur: exploitation des courses affretees uniquement.</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setListView('principal')}
              className={`px-3 py-1.5 text-xs rounded-lg border ${listView === 'principal' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600'}`}
            >
              Planning principal
            </button>
            <button
              type="button"
              onClick={() => setListView('affretement')}
              className={`px-3 py-1.5 text-xs rounded-lg border ${listView === 'affretement' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600'}`}
            >
              Suivi affretement
            </button>
          <button
            onClick={() => setShowForm(true)}
            disabled={!canCreateOt}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {canCreateOt ? '+ Nouvel OT' : 'Compte client requis'}
          </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="Référence ou client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-56 outline-none focus:ring-2 focus:ring-slate-300"
          />
          <div className="flex gap-1 flex-wrap">
            {['tous', ...Object.keys(STATUT_LABELS)].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatut(s)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  filterStatut === s ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s === 'tous' ? 'Tous' : STATUT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              {search || filterStatut !== 'tous' ? 'Aucun résultat' : 'Aucun ordre de transport enregistré'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Référence OT', 'Réf. transport', 'Donneur ordre', 'Type', 'Livraison prévue', 'Affrété', 'Statut transport', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ot, i) => (
                  <tr
                    key={ot.id}
                    onClick={() => openOT(ot)}
                    className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                      selected?.id === ot.id ? 'bg-blue-50' : i % 2 !== 0 ? 'bg-slate-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 font-mono text-xs">
                      <span className="flex items-center gap-1.5">
                        <StatutOpsDot statut={ot.statut_operationnel} size="sm" />
                        {ot.reference}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{clientMap[ot.client_id] ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{ot.reference_transport ?? 'Générée à l insertion'}</td>
                    <td className="px-4 py-3 text-slate-600">{clientMap[ot.donneur_ordre_id] ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{TYPE_TRANSPORT_LABELS[ot.type_transport] ?? ot.type_transport}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {ot.date_livraison_prevue ? new Date(ot.date_livraison_prevue).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${ot.est_affretee ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {ot.est_affretee ? `Oui (${affreteurMap[ot.affreteur_id ?? ''] ?? 'A renseigner'})` : 'Non'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${TRANSPORT_STATUS_COLORS[ot.statut_transport as TransportStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                        {TRANSPORT_STATUS_LABELS[ot.statut_transport as TransportStatus] ?? ot.statut_transport}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canDeleteOt && (
                        <button
                          onClick={ev => { ev.stopPropagation(); del(ot.id) }}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                        >
                          Suppr.
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: detail panel */}
      {selected && (
        <div className="w-full lg:w-[45%] shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between p-5 border-b">
              <div>
                <p className="text-xs font-mono text-slate-400 mb-0.5">{selected.reference}</p>
                <h3 className="text-lg font-bold text-slate-800">{clientMap[selected.client_id] ?? '—'}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_COLORS[selected.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                    {STATUT_LABELS[selected.statut] ?? selected.statut}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TRANSPORT_STATUS_COLORS[selected.statut_transport as TransportStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                    {TRANSPORT_STATUS_LABELS[selected.statut_transport as TransportStatus] ?? selected.statut_transport}
                  </span>
                  <span className="text-xs text-slate-500">{TYPE_TRANSPORT_LABELS[selected.type_transport] ?? selected.type_transport}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>

            <div className="px-5 py-3 border-b bg-slate-50">
              <p className="text-xs font-medium text-slate-500 mb-2">Affretement</p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className={`${inp} max-w-xs`}
                  value={selected.affreteur_id ?? ''}
                  onChange={event => { void toggleAffretement(selected, event.target.value || null) }}
                >
                  <option value="">Non affretee</option>
                  {affreteurs.map(item => <option key={item.id} value={item.id}>{item.company_name}</option>)}
                </select>
                <span className="text-xs text-slate-500">
                  {selected.est_affretee ? 'Course retiree du planning principal et suivie dans la vue affretement.' : 'Course visible dans le planning principal.'}
                </span>
              </div>
            </div>

            <div className="px-5 py-3 border-b bg-slate-50/50">
              <p className="text-xs font-medium text-slate-500 mb-2">Statut transport</p>
              <div className="flex gap-1.5 flex-wrap">
                {TRANSPORT_STATUS_FLOW.map(statusKey => (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => { void updateTransportStatus(selected.id, statusKey) }}
                    disabled={selected.statut_transport === statusKey}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      selected.statut_transport === statusKey
                        ? 'bg-slate-200 text-slate-500 cursor-default'
                        : 'border border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    {TRANSPORT_STATUS_LABELS[statusKey]}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Historique statut transport</p>
                {loadingTransportHistory ? (
                  <p className="text-xs text-slate-400 mt-1">Chargement historique...</p>
                ) : transportStatusHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 mt-1">Aucun historique disponible.</p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {transportStatusHistory.slice(0, 5).map(entry => (
                      <p key={entry.id} className="text-xs text-slate-600">
                        {new Date(entry.changed_at).toLocaleString('fr-FR')} - {TRANSPORT_STATUS_LABELS[entry.statut_nouveau as TransportStatus] ?? entry.statut_nouveau}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Statut actions */}
            <div className="px-5 py-3 border-b bg-slate-50">
              <p className="text-xs font-medium text-slate-500 mb-2">Changer le statut</p>
              {canChangeOtStatus ? (
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(STATUT_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => updateStatut(selected, k)}
                      disabled={selected.statut === k}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        selected.statut === k
                          ? 'bg-slate-200 text-slate-500 cursor-default'
                          : 'border border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Statut OT gere par la societe mere. Utilisez l espace affreteur pour le suivi operationnel.</p>
              )}
            </div>

            {/* Statut opérationnel */}
            <div className="px-5 py-3 border-b bg-slate-50/50">
              <p className="text-xs font-medium text-slate-500 mb-2">Statut opérationnel</p>
              <div className="flex gap-1.5 flex-wrap">
                {(Object.entries(STATUT_OPS) as [StatutOps, typeof STATUT_OPS[StatutOps]][]).map(([k, cfg]) => (
                  <button
                    key={k}
                    onClick={async () => {
                      const newVal = selected.statut_operationnel === k ? null : k
                      await supabase.from('ordres_transport').update({ statut_operationnel: newVal }).eq('id', selected.id)
                      setSelected(s => s ? { ...s, statut_operationnel: newVal } : s)
                      setList(l => l.map(o => o.id === selected.id ? { ...o, statut_operationnel: newVal } : o))
                    }}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-all border ${
                      selected.statut_operationnel === k
                        ? `${cfg.dot} text-white border-transparent`
                        : 'border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="p-5 grid grid-cols-2 gap-3 text-sm border-b">
              <Info label="Conducteur" value={selected.conducteur_id ? conducteurMap[selected.conducteur_id] : null} />
              <Info label="Véhicule" value={selected.vehicule_id ? vehiculeMap[selected.vehicule_id] : null} />
              <Info label="Référence transport" value={selected.reference_transport} />
              <Info label="Référence externe" value={selected.reference_externe} />
              <Info label="Source course" value={selected.source_course} />
              <Info label="Donneur d ordre" value={clientMap[selected.donneur_ordre_id]} />
              <Info label="Chargement" value={selected.chargement_site_id ? `${siteMap[selected.chargement_site_id]?.nom ?? ''} - ${siteMap[selected.chargement_site_id]?.adresse ?? ''}` : null} />
              <Info label="Livraison" value={selected.livraison_site_id ? `${siteMap[selected.livraison_site_id]?.nom ?? ''} - ${siteMap[selected.livraison_site_id]?.adresse ?? ''}` : null} />
              <Info label="Chargement prévu" value={selected.date_chargement_prevue ? new Date(selected.date_chargement_prevue).toLocaleDateString('fr-FR') : null} />
              <Info label="Livraison prévue" value={selected.date_livraison_prevue ? new Date(selected.date_livraison_prevue).toLocaleDateString('fr-FR') : null} />
              <Info label="Livraison réelle" value={selected.date_livraison_reelle ? new Date(selected.date_livraison_reelle).toLocaleDateString('fr-FR') : null} />
              <Info label="Marchandise" value={selected.nature_marchandise} />
              <Info label="Poids" value={selected.poids_kg ? `${selected.poids_kg} kg` : null} />
              <Info label="Volume" value={selected.volume_m3 ? `${selected.volume_m3} m³` : null} />
              <Info label="Nombre de colis" value={selected.nombre_colis?.toString() ?? null} />
              <Info label="Distance" value={selected.distance_km ? `${selected.distance_km} km` : null} />
              <Info label="Prix HT" value={selected.prix_ht != null ? `${selected.prix_ht.toLocaleString('fr-FR')} €` : null} />
              <Info label="TVA" value={selected.taux_tva ? `${selected.taux_tva}%` : null} />
              {selected.prix_ht && selected.taux_tva && (
                <Info label="Prix TTC" value={`${(selected.prix_ht * (1 + selected.taux_tva / 100)).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`} />
              )}
              <Info label="N° CMR" value={selected.numero_cmr} />
              <Info label="N° BL" value={selected.numero_bl} />
              {selected.instructions && (
                <div className="col-span-2">
                  <span className="text-xs font-medium text-slate-500">Instructions</span>
                  <p className="text-slate-600 mt-0.5 text-sm">{selected.instructions}</p>
                </div>
              )}
              {selected.notes_internes && (
                <div className="col-span-2">
                  <span className="text-xs font-medium text-slate-500">Notes internes</span>
                  <p className="text-slate-600 mt-0.5 text-sm">{selected.notes_internes}</p>
                </div>
              )}
            </div>

            {/* Etapes */}
            <div className="p-5">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Étapes de mission</h4>
              {loadingEtapes ? (
                <p className="text-xs text-slate-400">Chargement...</p>
              ) : etapes.length === 0 ? (
                <p className="text-xs text-slate-400">Aucune étape enregistrée</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-slate-200" />
                  <div className="space-y-3">
                    {etapes.map(et => (
                      <div key={et.id} className="relative flex gap-4 pl-8">
                        <div className={`absolute left-2 top-2 w-3 h-3 rounded-full border-2 ${
                          et.type_etape === 'chargement' ? 'bg-blue-500 border-blue-300' :
                          et.type_etape === 'livraison' ? 'bg-green-500 border-green-300' :
                          'bg-slate-300 border-slate-200'
                        }`} />
                        <div className="flex-1 bg-slate-50 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className={`text-xs font-medium ${
                                et.type_etape === 'chargement' ? 'text-blue-600' :
                                et.type_etape === 'livraison' ? 'text-green-600' : 'text-slate-600'
                              }`}>
                                {et.type_etape === 'chargement' ? 'Chargement' :
                                 et.type_etape === 'livraison' ? 'Livraison' : et.type_etape}
                              </span>
                              <p className="text-sm font-medium text-slate-800 mt-0.5">
                                {et.adresse_libre ?? [et.ville, et.code_postal].filter(Boolean).join(', ')}
                              </p>
                              {et.contact_nom && <p className="text-xs text-slate-500">{et.contact_nom}{et.contact_tel ? ` · ${et.contact_tel}` : ''}</p>}
                            </div>
                            {et.date_prevue && (
                              <span className="text-xs text-slate-500 shrink-0">
                                {new Date(et.date_prevue).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                          </div>
                          <span className={`mt-1.5 inline-block text-xs px-2 py-0.5 rounded-full ${
                            et.statut === 'realise' ? 'bg-green-100 text-green-700' :
                            et.statut === 'en_cours' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {et.statut === 'realise' ? 'Réalisé' : et.statut === 'en_cours' ? 'En cours' : 'En attente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: new OT */}
      {showForm && canCreateOt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Nouvel Ordre de Transport</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={submit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Client *">
                    <select className={inp} value={form.client_id} onChange={e => { setF('client_id', e.target.value); if (!form.donneur_ordre_id) setF('donneur_ordre_id', e.target.value) }} required>
                      <option value="">Sélectionner un client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Donneur d ordre *">
                  <select className={inp} value={form.donneur_ordre_id ?? ''} onChange={e => setF('donneur_ordre_id', e.target.value)} required>
                    <option value="">Sélectionner une entreprise</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </Field>
                <Field label="Source course">
                  <select className={inp} value={form.source_course ?? 'manuel'} onChange={e => setF('source_course', e.target.value)}>
                    {TRANSPORT_SOURCES.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Type de transport">
                  <select className={inp} value={form.type_transport ?? 'complet'} onChange={e => setF('type_transport', e.target.value)}>
                    {Object.entries(TYPE_TRANSPORT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Statut transport">
                  <select className={inp} value={form.statut_transport ?? 'en_attente_validation'} onChange={e => setF('statut_transport', e.target.value)}>
                    {TRANSPORT_STATUS_FLOW.map(item => <option key={item} value={item}>{TRANSPORT_STATUS_LABELS[item]}</option>)}
                  </select>
                </Field>
                <Field label="Statut initial">
                  <select className={inp} value={form.statut ?? 'brouillon'} onChange={e => setF('statut', e.target.value)}>
                    {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Référence externe">
                  <input className={inp} value={form.reference_externe ?? ''} onChange={e => setF('reference_externe', e.target.value || null)} />
                </Field>

                <div className="col-span-2 border-t pt-4 mt-1">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Lieux logistiques</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Field label="Site de chargement">
                        <select className={inp} value={form.chargement_site_id ?? ''} onChange={e => setF('chargement_site_id', e.target.value || null)}>
                          <option value="">Sélectionner un site</option>
                          {sites.map(site => <option key={site.id} value={site.id}>{site.nom} - {site.adresse}</option>)}
                        </select>
                      </Field>
                      <button type="button" className="mt-2 text-xs text-blue-700 hover:text-blue-800" onClick={() => { void quickCreateSite('chargement') }}>+ Ajouter un site chargement</button>
                    </div>
                    <div>
                      <Field label="Site de livraison">
                        <select className={inp} value={form.livraison_site_id ?? ''} onChange={e => setF('livraison_site_id', e.target.value || null)}>
                          <option value="">Sélectionner un site</option>
                          {sites.map(site => <option key={site.id} value={site.id}>{site.nom} - {site.adresse}</option>)}
                        </select>
                      </Field>
                      <button type="button" className="mt-2 text-xs text-blue-700 hover:text-blue-800" onClick={() => { void quickCreateSite('livraison') }}>+ Ajouter un site livraison</button>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4 mt-1">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Planification</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Date de chargement"><input className={inp} type="datetime-local" value={form.date_chargement_prevue ?? ''} onChange={e => setF('date_chargement_prevue', e.target.value || null)} /></Field>
                    <Field label="Date de livraison"><input className={inp} type="datetime-local" value={form.date_livraison_prevue ?? ''} onChange={e => setF('date_livraison_prevue', e.target.value || null)} /></Field>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Ressources</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Conducteur">
                      <select className={inp} value={form.conducteur_id ?? ''} onChange={e => setF('conducteur_id', e.target.value || null)}>
                        <option value="">— Non affecté</option>
                        {conducteurs.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
                      </select>
                    </Field>
                    <Field label="Véhicule">
                      <select className={inp} value={form.vehicule_id ?? ''} onChange={e => setF('vehicule_id', e.target.value || null)}>
                        <option value="">— Non affecté</option>
                        {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation}{v.marque ? ` · ${v.marque}` : ''}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Marchandise</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Field label="Nature de la marchandise"><input className={inp} value={form.nature_marchandise ?? ''} onChange={e => setF('nature_marchandise', e.target.value || null)} /></Field>
                    </div>
                    <Field label="Poids (kg)"><input className={inp} type="number" value={form.poids_kg ?? ''} onChange={e => setF('poids_kg', parseFloat(e.target.value) || null)} /></Field>
                    <Field label="Volume (m³)"><input className={inp} type="number" value={form.volume_m3 ?? ''} onChange={e => setF('volume_m3', parseFloat(e.target.value) || null)} /></Field>
                    <Field label="Nombre de colis"><input className={inp} type="number" value={form.nombre_colis ?? ''} onChange={e => setF('nombre_colis', parseInt(e.target.value) || null)} /></Field>
                    <Field label="Distance (km)"><input className={inp} type="number" value={form.distance_km ?? ''} onChange={e => setF('distance_km', parseFloat(e.target.value) || null)} /></Field>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Tarification</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Prix HT (€)"><input className={inp} type="number" step="0.01" value={form.prix_ht ?? ''} onChange={e => setF('prix_ht', parseFloat(e.target.value) || null)} /></Field>
                    <Field label="TVA (%)"><input className={inp} type="number" value={form.taux_tva ?? 20} onChange={e => setF('taux_tva', parseFloat(e.target.value) || null)} /></Field>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Documents</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="N° CMR"><input className={inp} value={form.numero_cmr ?? ''} onChange={e => setF('numero_cmr', e.target.value || null)} /></Field>
                    <Field label="N° BL"><input className={inp} value={form.numero_bl ?? ''} onChange={e => setF('numero_bl', e.target.value || null)} /></Field>
                  </div>
                </div>

                <div className="col-span-2">
                  <Field label="Instructions chauffeur"><textarea className={`${inp} resize-none h-16`} value={form.instructions ?? ''} onChange={e => setF('instructions', e.target.value || null)} /></Field>
                </div>
                <div className="col-span-2">
                  <Field label="Notes internes"><textarea className={`${inp} resize-none h-16`} value={form.notes_internes ?? ''} onChange={e => setF('notes_internes', e.target.value || null)} /></Field>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {saving ? 'Enregistrement...' : "Créer l'OT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <p className="text-slate-700 mt-0.5">{value || '—'}</p>
    </div>
  )
}
