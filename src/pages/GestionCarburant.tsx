import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import {
  createCuve, updateCuve, deleteCuve,
  createPlein,
  createCommande,
  listConsommationsParVehicule,
  createAnomalie,
  getNiveauxCuve, recordNiveauCuve,
  type Cuve, type Plein, type CommandeCarburant, type AnomalieCarburant, type NiveauCuve, type ConsommationVehicule,
} from '@/lib/fuelManagement'
import { useFuelData, type Vehicule, type Conducteur, type DepotOption } from '@/pages/carburant/useFuelData'
import {
  canManageFuelByRole,
  computeCommandeTotals,
  formatFuelError,
  isNonNegativeNumber,
  isPositiveNumber,
  isValidDriverIdentifier4d,
  isValidTvaRate,
  type NoticeType,
} from '@/pages/carburant/fuelUtils'

type Tab = 'cuves' | 'pleins' | 'commandes' | 'consommation' | 'anomalies' | 'niveaux'

type CuveForm = {
  depot_id: string
  numero_cuve: string
  type_carburant: Cuve['type_carburant']
  capacite_litres: number
  marque: string
  modele: string
  jauge_electronique: boolean
  statut: Cuve['statut']
  notes: string
}
type ShowNotice = (msg: string, type?: NoticeType) => void

interface ManageTabBaseProps {
  companyId: number
  onRefresh: () => Promise<void>
  showNotice: ShowNotice
  canManage: boolean
}

interface CuvesTabProps extends ManageTabBaseProps {
  cuves: Cuve[]
  depots: DepotOption[]
}

interface PleinsTabProps extends ManageTabBaseProps {
  pleins: Plein[]
  vehicules: Vehicule[]
  conducteurs: Conducteur[]
  indisponiblesAujourdhui: Set<string>
  cuves: Cuve[]
}

interface CommandesTabProps extends ManageTabBaseProps {
  commandes: CommandeCarburant[]
  cuves: Cuve[]
}

interface ConsommationTabProps {
  companyId: number
}

interface NiveauxTabProps {
  cuves: Cuve[]
  showNotice: ShowNotice
  canManage: boolean
}

interface AnomaliesTabProps extends ManageTabBaseProps {
  anomalies: AnomalieCarburant[]
  cuves: Cuve[]
  vehicules: Vehicule[]
}

type CommandeForm = {
  fournisseur_nom: string
  type_carburant: CommandeCarburant['type_carburant']
  quantite_litres: number
  date_commande: string
  date_livraison_prevue: string
  cuve_id: string
  price_unit_ht: number
  taux_tva: number
  notes: string
}

type NiveauForm = {
  niveau_litres: number
  jauge_type: NiveauCuve['jauge_type']
  anomalie: boolean
  anomalie_description: string
}

type AnomalieForm = {
  type: AnomalieCarburant['type']
  cuve_id: string
  vehicule_id: string
  litres_manquants: number
  description: string
  gravite: AnomalieCarburant['gravite']
}

const INPUT_CLS = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-slate-400'
const BTN_PRIMARY = 'px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium'
const BTN_SECONDARY = 'px-4 py-2 rounded-lg border border-line text-foreground hover:bg-surface-2 transition-colors text-sm font-medium'
const TAB_CLS = 'px-4 py-2 font-medium transition-colors border-b-2'
const TAB_ACTIVE = `${TAB_CLS} border-blue-600 text-blue-600`
const TAB_INACTIVE = `${TAB_CLS} border-transparent text-secondary hover:text-foreground`

export default function GestionCarburant() {
  const { companyId, role } = useAuth()
  const canManage = canManageFuelByRole(role)

  const [tab, setTab] = useState<Tab>('cuves')
  const [notice, setNotice] = useState<{ msg: string; type: NoticeType } | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showNotice = useCallback((msg: string, type: NoticeType = 'success') => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    setNotice({ msg, type })
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4000)
  }, [])

  const {
    cuves,
    pleins,
    commandes,
    anomalies,
    vehicules,
    conducteurs,
    indisponiblesAujourdhui,
    depots,
    loading,
    loadAll,
  } = useFuelData({
    companyId,
    onError: useCallback((message: string) => showNotice(message, 'error'), [showNotice]),
  })

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-line-strong bg-surface px-6 py-4">
        <h1 className="text-2xl font-bold">Gestion du Carburant</h1>
        <p className="text-sm text-secondary mt-1">Cuves multi-dépôts, pleins, commandes TVA et anomalies</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line-strong bg-surface px-6 overflow-x-auto" role="tablist" aria-label="Sections gestion carburant">
        <button role="tab" aria-selected={tab === 'cuves'} className={tab === 'cuves' ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setTab('cuves')}>
          Cuves
        </button>
        <button role="tab" aria-selected={tab === 'pleins'} className={tab === 'pleins' ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setTab('pleins')}>
          Pleins
        </button>
        <button role="tab" aria-selected={tab === 'commandes'} className={tab === 'commandes' ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setTab('commandes')}>
          Commandes
        </button>
        <button role="tab" aria-selected={tab === 'consommation'} className={tab === 'consommation' ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setTab('consommation')}>
          Consommation
        </button>
        <button role="tab" aria-selected={tab === 'niveaux'} className={tab === 'niveaux' ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setTab('niveaux')}>
          Niveaux
        </button>
        <button role="tab" aria-selected={tab === 'anomalies'} className={tab === 'anomalies' ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setTab('anomalies')}>
          Anomalies
        </button>
      </div>

      {/* Notice */}
      {notice && (
        <div role="status" aria-live={notice.type === 'error' ? 'assertive' : 'polite'} className={`px-6 py-3 ${notice.type === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
          {notice.msg}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-secondary">Chargement...</div>
        ) : tab === 'cuves' ? (
          <CuvesTab cuves={cuves} depots={depots} companyId={companyId!} onRefresh={loadAll} showNotice={showNotice} canManage={canManage} />
        ) : tab === 'pleins' ? (
          <PleinsTab pleins={pleins} vehicules={vehicules} conducteurs={conducteurs} indisponiblesAujourdhui={indisponiblesAujourdhui} cuves={cuves} companyId={companyId!} onRefresh={loadAll} showNotice={showNotice} canManage={canManage} />
        ) : tab === 'commandes' ? (
          <CommandesTab commandes={commandes} cuves={cuves} companyId={companyId!} onRefresh={loadAll} showNotice={showNotice} canManage={canManage} />
        ) : tab === 'consommation' ? (
          <ConsommationTab companyId={companyId!} />
        ) : tab === 'niveaux' ? (
          <NiveauxTab cuves={cuves} showNotice={showNotice} canManage={canManage} />
        ) : tab === 'anomalies' ? (
          <AnomaliesTab anomalies={anomalies} cuves={cuves} vehicules={vehicules} companyId={companyId!} onRefresh={loadAll} showNotice={showNotice} canManage={canManage} />
        ) : null}
      </div>
    </div>
  )
}

// ── Onglet Cuves ──────────────────────────────────────────────────────────────

function CuvesTab({ cuves, depots, companyId, onRefresh, showNotice, canManage }: CuvesTabProps) {
  const [showing, setShowing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CuveForm>({
    depot_id: '',
    numero_cuve: '',
    type_carburant: 'gazole',
    capacite_litres: 1000,
    marque: '',
    modele: '',
    jauge_electronique: false,
    statut: 'active',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPositiveNumber(form.capacite_litres)) {
      showNotice('La capacité de cuve doit être supérieure à 0.', 'error')
      return
    }
    try {
      const selectedDepot = depots.find(d => d.id === form.depot_id) || null
      const payload = {
        ...form,
        depot_id: selectedDepot?.source === 'adresses' ? selectedDepot.id : null,
        depot_nom: selectedDepot?.nom || null,
      }
      if (editingId) {
        await updateCuve(editingId, payload)
        showNotice('Cuve mise à jour')
      } else {
        await createCuve({ company_id: companyId, numero_serie: null, ...payload })
        showNotice('Cuve créée')
      }
      setForm({ depot_id: '', numero_cuve: '', type_carburant: 'gazole', capacite_litres: 1000, marque: '', modele: '', jauge_electronique: false, statut: 'active', notes: '' })
      setEditingId(null)
      setShowing(false)
      await onRefresh()
    } catch (err) {
      showNotice(formatFuelError(err), 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette cuve ?')) return
    try {
      await deleteCuve(id)
      showNotice('Cuve supprimée')
      await onRefresh()
    } catch (err) {
      showNotice(formatFuelError(err), 'error')
    }
  }

  const groupedByDepot = useMemo(() => {
    const grouped = new Map<string, Cuve[]>()
    for (const cuve of cuves) {
      const key = cuve.depot_nom || '(aucun dépôt)'
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(cuve)
    }
    return grouped
  }, [cuves])

  return (
    <div className="space-y-6">
      {canManage && (
        <button onClick={() => setShowing(!showing)} className={BTN_PRIMARY}>
          {showing ? 'Fermer' : '+ Nouvelle cuve'}
        </button>
      )}

      {showing && (
        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <select aria-label="Depot" className={INPUT_CLS} value={form.depot_id} onChange={e => setForm({ ...form, depot_id: e.target.value })}>
              <option value="">Dépôt (optionnel)</option>
              {depots.map((d: DepotOption) => (<option key={d.id} value={d.id}>{d.nom}</option>))}
            </select>
            <input aria-label="Numero cuve" type="text" placeholder="Numéro cuve (ex: C001)" className={INPUT_CLS} value={form.numero_cuve} onChange={e => setForm({ ...form, numero_cuve: e.target.value })} required />
            <select aria-label="Type carburant" className={INPUT_CLS} value={form.type_carburant} onChange={e => setForm({ ...form, type_carburant: e.target.value as Cuve['type_carburant'] })}>
              <option value="gazole">Gazole</option>
              <option value="essence">Essence</option>
              <option value="adblue">AdBlue</option>
              <option value="autre">Autre</option>
            </select>
            <input aria-label="Capacite litres" type="number" placeholder="Capacité (litres)" min={1} step="0.01" className={INPUT_CLS} value={form.capacite_litres} onChange={e => setForm({ ...form, capacite_litres: Number(e.target.value) })} required />
            <input aria-label="Marque cuve" type="text" placeholder="Marque" className={INPUT_CLS} value={form.marque} onChange={e => setForm({ ...form, marque: e.target.value })} />
            <input aria-label="Modele cuve" type="text" placeholder="Modèle" className={INPUT_CLS} value={form.modele} onChange={e => setForm({ ...form, modele: e.target.value })} />
          </div>
          {depots.length === 0 && (
            <p className="text-xs text-amber-600">
              Aucun dépôt détecté. Crée un dépôt dans Entrepôts, puis reviens ici.
            </p>
          )}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.jauge_electronique} onChange={e => setForm({ ...form, jauge_electronique: e.target.checked })} className="rounded" />
            <span className="text-sm">Jauge électronique</span>
          </label>
          <textarea aria-label="Notes cuve" placeholder="Notes" className={INPUT_CLS} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
          <div className="flex gap-2">
            <button type="submit" className={BTN_PRIMARY}>Enregistrer</button>
            <button type="button" onClick={() => { setShowing(false); setEditingId(null) }} className={BTN_SECONDARY}>Annuler</button>
          </div>
        </form>
      )}

      {Array.from(groupedByDepot.entries()).map(([depot, cuvesList]) => (
        <div key={depot} className="space-y-3">
          <h3 className="font-bold text-lg">{depot}</h3>
          <div className="grid gap-3">
            {cuvesList.map(cuve => (
              <div key={cuve.id} className="bg-surface border border-line rounded-lg p-4 flex justify-between items-start">
                <div>
                  <p className="font-bold">{cuve.numero_cuve}</p>
                  <p className="text-sm text-secondary">{cuve.type_carburant} • {cuve.capacite_litres}L • {cuve.marque || 'N/A'} {cuve.modele || ''}</p>
                  <p className="text-xs text-muted mt-1">{cuve.jauge_electronique ? '✓ Jauge électronique' : 'Jauge manuelle'} • Statut: {cuve.statut}</p>
                  {cuve.notes && <p className="text-xs text-secondary mt-1">{cuve.notes}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const depotByName = depots.find(d => d.nom === cuve.depot_nom)
                        setForm({
                          depot_id: cuve.depot_id || depotByName?.id || '',
                          numero_cuve: cuve.numero_cuve,
                          type_carburant: cuve.type_carburant,
                          capacite_litres: cuve.capacite_litres,
                          marque: cuve.marque || '',
                          modele: cuve.modele || '',
                          jauge_electronique: cuve.jauge_electronique,
                          statut: cuve.statut,
                          notes: cuve.notes || '',
                        })
                        setEditingId(cuve.id)
                        setShowing(true)
                      }}
                      className={BTN_SECONDARY}
                    >
                      Modifier
                    </button>
                    <button onClick={() => handleDelete(cuve.id)} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors text-sm">Supprimer</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Onglet Pleins ──────────────────────────────────────────────────────────────

function PleinsTab({ pleins, vehicules, conducteurs, indisponiblesAujourdhui, cuves, companyId, onRefresh, showNotice, canManage }: PleinsTabProps) {
  const [showing, setShowing] = useState(false)
  const [form, setForm] = useState({
    vehicule_id: '',
    conducteur_id: '',
    conducteur_identifiant_4d: '',
    conducteur_code: '',
    conducteur_num_parc: '',
    date_plein: new Date().toISOString().slice(0, 10),
    heure_plein: new Date().toTimeString().slice(0, 5),
    cuve_id: '',
    litres_verses: 50,
    prix_unitaire_ttc: 1.8,
    statut: 'enregistre' as const,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidDriverIdentifier4d(form.conducteur_identifiant_4d)) {
      showNotice('L\'identifiant conducteur doit contenir exactement 4 chiffres.', 'error')
      return
    }
    if (!isPositiveNumber(form.litres_verses)) {
      showNotice('Le volume versé doit être supérieur à 0.', 'error')
      return
    }
    if (!isPositiveNumber(form.prix_unitaire_ttc)) {
      showNotice('Le prix unitaire TTC doit être supérieur à 0.', 'error')
      return
    }
    try {
      const vehicule = vehicules.find(v => v.id === form.vehicule_id)
      const cuve = cuves.find(c => c.id === form.cuve_id)

      await createPlein({
        company_id: companyId,
        vehicule_id: form.vehicule_id,
        vehicule_immat: vehicule?.immatriculation || null,
        conducteur_id: form.conducteur_id,
        conducteur_identifiant_4d: form.conducteur_identifiant_4d,
        conducteur_code: form.conducteur_code,
        conducteur_num_parc: form.conducteur_num_parc,
        date_plein: form.date_plein,
        heure_plein: form.heure_plein,
        cuve_id: form.cuve_id || null,
        cuve_numero: cuve?.numero_cuve || null,
        litres_verses: form.litres_verses,
        prix_unitaire_ttc: form.prix_unitaire_ttc,
        cout_total_ttc: form.litres_verses * form.prix_unitaire_ttc,
        statut: form.statut,
        facture_id: null,
        notes: null,
      })
      showNotice('Plein enregistré')
      setForm({ vehicule_id: '', conducteur_id: '', conducteur_identifiant_4d: '', conducteur_code: '', conducteur_num_parc: '', date_plein: new Date().toISOString().slice(0, 10), heure_plein: new Date().toTimeString().slice(0, 5), cuve_id: '', litres_verses: 50, prix_unitaire_ttc: 1.8, statut: 'enregistre' })
      setShowing(false)
      await onRefresh()
    } catch (err) {
      showNotice(formatFuelError(err), 'error')
    }
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <button onClick={() => setShowing(!showing)} className={BTN_PRIMARY}>
          {showing ? 'Fermer' : '+ Nouveau plein'}
        </button>
      )}

      {showing && (
        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <select aria-label="Vehicule" className={INPUT_CLS} value={form.vehicule_id} onChange={e => setForm({ ...form, vehicule_id: e.target.value })} required>
              <option value="">Véhicule</option>
              {vehicules.map(v => (<option key={v.id} value={v.id}>{v.immatriculation}</option>))}
            </select>
            <select aria-label="Conducteur" className={INPUT_CLS} value={form.conducteur_id} onChange={e => setForm({ ...form, conducteur_id: e.target.value })} required>
              <option value="">Conducteur</option>
              {conducteurs.map(c => (
                <option key={c.id} value={c.id}>
                  {c.prenom} {c.nom}{indisponiblesAujourdhui?.has(c.id) ? ' (Indisponible aujourd\'hui)' : ''}
                </option>
              ))}
            </select>
            <input aria-label="Identifiant conducteur 4 chiffres" type="text" placeholder="Identifiant 4 chiffres" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} className={INPUT_CLS} value={form.conducteur_identifiant_4d} onChange={e => setForm({ ...form, conducteur_identifiant_4d: e.target.value.replace(/\D/g, '').slice(0, 4) })} required />
            <input aria-label="Code conducteur" type="text" placeholder="Code conducteur" className={INPUT_CLS} value={form.conducteur_code} onChange={e => setForm({ ...form, conducteur_code: e.target.value })} required />
            <input aria-label="Numero parc conducteur" type="text" placeholder="N° parc" className={INPUT_CLS} value={form.conducteur_num_parc} onChange={e => setForm({ ...form, conducteur_num_parc: e.target.value })} required />
            <select aria-label="Cuve" className={INPUT_CLS} value={form.cuve_id} onChange={e => setForm({ ...form, cuve_id: e.target.value })}>
              <option value="">Cuve (optionnel)</option>
              {cuves.map(c => (<option key={c.id} value={c.id}>{c.numero_cuve} ({c.type_carburant})</option>))}
            </select>
            <input aria-label="Date plein" type="date" className={INPUT_CLS} value={form.date_plein} onChange={e => setForm({ ...form, date_plein: e.target.value })} required />
            <input aria-label="Heure plein" type="time" className={INPUT_CLS} value={form.heure_plein} onChange={e => setForm({ ...form, heure_plein: e.target.value })} />
            <input aria-label="Litres verses" type="number" placeholder="Litres versés" min={0.01} step="0.01" className={INPUT_CLS} value={form.litres_verses} onChange={e => setForm({ ...form, litres_verses: Number(e.target.value) })} required />
            <input aria-label="Prix unitaire TTC" type="number" placeholder="Prix/L TTC" min={0.01} step="0.01" className={INPUT_CLS} value={form.prix_unitaire_ttc} onChange={e => setForm({ ...form, prix_unitaire_ttc: Number(e.target.value) })} required />
          </div>
          <div className="flex gap-2">
            <button type="submit" className={BTN_PRIMARY}>Enregistrer</button>
            <button type="button" onClick={() => setShowing(false)} className={BTN_SECONDARY}>Annuler</button>
          </div>
        </form>
      )}

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 border-b border-line">
            <tr className="text-left">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Véhicule</th>
              <th className="px-4 py-2">Conducteur (4D)</th>
              <th className="px-4 py-2">Litres</th>
              <th className="px-4 py-2">Coût TTC</th>
              <th className="px-4 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {pleins.map((p: Plein) => (
              <tr key={p.id} className="border-b border-line/50 hover:bg-slate-900/20">
                <td className="px-4 py-2">{p.date_plein} {p.heure_plein || ''}</td>
                <td className="px-4 py-2 font-mono text-xs">{p.vehicule_immat}</td>
                <td className="px-4 py-2 text-xs">{p.conducteur_identifiant_4d} ({p.conducteur_code})</td>
                <td className="px-4 py-2">{p.litres_verses.toFixed(2)}L</td>
                <td className="px-4 py-2">{(p.cout_total_ttc || 0).toFixed(2)}€</td>
                <td className="px-4 py-2"><span className={`px-2 py-1 rounded text-xs font-mono ${p.statut === 'facture' ? 'bg-green-500/20 text-green-300' : p.statut === 'valide' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-500/20 text-slate-300'}`}>{p.statut}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Onglet Commandes ──────────────────────────────────────────────────────────

function CommandesTab({ commandes, cuves, companyId, onRefresh, showNotice, canManage }: CommandesTabProps) {
  const [showing, setShowing] = useState(false)
  const [form, setForm] = useState<CommandeForm>({
    fournisseur_nom: 'ALX',
    type_carburant: 'gazole' as const,
    quantite_litres: 1000,
    date_commande: new Date().toISOString().slice(0, 10),
    date_livraison_prevue: '',
    cuve_id: '',
    price_unit_ht: 1.5,
    taux_tva: 20,
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPositiveNumber(form.quantite_litres)) {
      showNotice('La quantité commandée doit être supérieure à 0.', 'error')
      return
    }
    if (!isPositiveNumber(form.price_unit_ht)) {
      showNotice('Le prix HT/L doit être supérieur à 0.', 'error')
      return
    }
    if (!isValidTvaRate(form.taux_tva)) {
      showNotice('Le taux de TVA doit être compris entre 0 et 100.', 'error')
      return
    }
    try {
      const { montantHt, montantTva, montantTtc } = computeCommandeTotals(
        form.quantite_litres,
        form.price_unit_ht,
        form.taux_tva,
      )

      const numeroCommande = `CMD-${new Date().getTime()}`

      await createCommande({
        company_id: companyId,
        numero_commande: numeroCommande,
        fournisseur_id: null,
        fournisseur_nom: form.fournisseur_nom,
        type_carburant: form.type_carburant,
        quantite_litres: form.quantite_litres,
        date_commande: form.date_commande,
        date_livraison_prevue: form.date_livraison_prevue || null,
        date_livraison_reelle: null,
        cuve_id: form.cuve_id || null,
        price_unit_ht: form.price_unit_ht,
        montant_ht: montantHt,
        taux_tva: form.taux_tva,
        montant_tva: montantTva,
        montant_ttc: montantTtc,
        statut: 'en_attente',
        facture_num: null,
        facture_date: null,
        compte_comptable: '601',
        centre_analytique: null,
        notes: form.notes,
      })
      showNotice('Commande créée')
      setForm({ fournisseur_nom: 'ALX', type_carburant: 'gazole', quantite_litres: 1000, date_commande: new Date().toISOString().slice(0, 10), date_livraison_prevue: '', cuve_id: '', price_unit_ht: 1.5, taux_tva: 20, notes: '' })
      setShowing(false)
      await onRefresh()
    } catch (err) {
      showNotice(formatFuelError(err), 'error')
    }
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <button onClick={() => setShowing(!showing)} className={BTN_PRIMARY}>
          {showing ? 'Fermer' : '+ Nouvelle commande'}
        </button>
      )}

      {showing && (
        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <input aria-label="Fournisseur" type="text" placeholder="Fournisseur" className={INPUT_CLS} value={form.fournisseur_nom} onChange={e => setForm({ ...form, fournisseur_nom: e.target.value })} required />
            <select aria-label="Type carburant commande" className={INPUT_CLS} value={form.type_carburant} onChange={e => setForm({ ...form, type_carburant: e.target.value as CommandeCarburant['type_carburant'] })}>
              <option value="gazole">Gazole</option>
              <option value="essence">Essence</option>
              <option value="adblue">AdBlue</option>
            </select>
            <input aria-label="Quantite commande litres" type="number" placeholder="Quantité (L)" min={0.01} step="0.01" className={INPUT_CLS} value={form.quantite_litres} onChange={e => setForm({ ...form, quantite_litres: Number(e.target.value) })} required />
            <input aria-label="Date commande" type="date" className={INPUT_CLS} value={form.date_commande} onChange={e => setForm({ ...form, date_commande: e.target.value })} required />
            <input aria-label="Date livraison prevue" type="date" placeholder="Livraison prévue" className={INPUT_CLS} value={form.date_livraison_prevue} onChange={e => setForm({ ...form, date_livraison_prevue: e.target.value })} />
            <select aria-label="Cuve cible commande" className={INPUT_CLS} value={form.cuve_id} onChange={e => setForm({ ...form, cuve_id: e.target.value })}>
              <option value="">Cuve (optionnel)</option>
              {cuves.map(c => (<option key={c.id} value={c.id}>{c.numero_cuve}</option>))}
            </select>
            <input aria-label="Prix HT par litre" type="number" placeholder="Prix HT/L" min={0.01} step="0.01" className={INPUT_CLS} value={form.price_unit_ht} onChange={e => setForm({ ...form, price_unit_ht: Number(e.target.value) })} required />
            <input aria-label="Taux TVA" type="number" placeholder="Taux TVA %" min={0} max={100} step="0.01" className={INPUT_CLS} value={form.taux_tva} onChange={e => setForm({ ...form, taux_tva: Number(e.target.value) })} required />
          </div>
          <textarea aria-label="Notes commande" placeholder="Notes" className={INPUT_CLS} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
          <div className="flex gap-2">
            <button type="submit" className={BTN_PRIMARY}>Créer commande</button>
            <button type="button" onClick={() => setShowing(false)} className={BTN_SECONDARY}>Annuler</button>
          </div>
        </form>
      )}

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 border-b border-line">
            <tr className="text-left">
              <th className="px-4 py-2">Commande</th>
              <th className="px-4 py-2">Fournisseur</th>
              <th className="px-4 py-2">Quantité</th>
              <th className="px-4 py-2">HT</th>
              <th className="px-4 py-2">TVA</th>
              <th className="px-4 py-2">TTC</th>
              <th className="px-4 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {commandes.map((c: CommandeCarburant) => (
              <tr key={c.id} className="border-b border-line/50 hover:bg-slate-900/20">
                <td className="px-4 py-2 font-mono">{c.numero_commande}</td>
                <td className="px-4 py-2">{c.fournisseur_nom}</td>
                <td className="px-4 py-2">{c.quantite_litres}L</td>
                <td className="px-4 py-2">{(c.montant_ht || 0).toFixed(2)}€</td>
                <td className="px-4 py-2">{(c.montant_tva || 0).toFixed(2)}€</td>
                <td className="px-4 py-2 font-bold">{(c.montant_ttc || 0).toFixed(2)}€</td>
                <td className="px-4 py-2"><span className={`px-2 py-1 rounded text-xs font-mono ${c.statut === 'payee' ? 'bg-green-500/20 text-green-300' : c.statut === 'facturee' ? 'bg-blue-500/20 text-blue-300' : c.statut === 'livree' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-500/20 text-slate-300'}`}>{c.statut}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Onglet Consommation ────────────────────────────────────────────────────────

function ConsommationTab({ companyId }: ConsommationTabProps) {
  const [consommations, setConsommations] = useState<ConsommationVehicule[]>([])
  const [period, setPeriod] = useState({ debut: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), fin: new Date().toISOString().slice(0, 10) })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const result = await listConsommationsParVehicule(companyId, period.debut, period.fin)
        setConsommations(result)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [period, companyId])

  const totalLitres = consommations.reduce((acc, c) => acc + c.litres_consommes, 0)
  const totalCout = consommations.reduce((acc, c) => acc + (c.cout_total_carburant || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center bg-surface border border-line rounded-lg p-4">
        <input aria-label="Debut periode consommation" type="date" className={INPUT_CLS + ' max-w-xs'} value={period.debut} onChange={e => setPeriod({ ...period, debut: e.target.value })} />
        <span>à</span>
        <input aria-label="Fin periode consommation" type="date" className={INPUT_CLS + ' max-w-xs'} value={period.fin} onChange={e => setPeriod({ ...period, fin: e.target.value })} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-secondary">Chargement...</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface border border-line rounded-lg p-4">
              <p className="text-sm text-secondary">Total litres</p>
              <p className="text-2xl font-bold">{totalLitres.toFixed(0)}L</p>
            </div>
            <div className="bg-surface border border-line rounded-lg p-4">
              <p className="text-sm text-secondary">Coût total</p>
              <p className="text-2xl font-bold">{totalCout.toFixed(2)}€</p>
            </div>
            <div className="bg-surface border border-line rounded-lg p-4">
              <p className="text-sm text-secondary">Prix moyen/L</p>
              <p className="text-2xl font-bold">{totalLitres > 0 ? (totalCout / totalLitres).toFixed(2) : '0'}€</p>
            </div>
          </div>

          <div className="bg-surface border border-line rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 border-b border-line">
                <tr className="text-left">
                  <th className="px-4 py-2">Véhicule</th>
                  <th className="px-4 py-2">Pleins</th>
                  <th className="px-4 py-2">Litres</th>
                  <th className="px-4 py-2">Coût</th>
                  <th className="px-4 py-2">€/L</th>
                </tr>
              </thead>
              <tbody>
                {consommations.map(c => (
                  <tr key={c.vehicule_id} className="border-b border-line/50 hover:bg-slate-900/20">
                    <td className="px-4 py-2 font-mono">{c.vehicule_immat}</td>
                    <td className="px-4 py-2">{c.nombre_pleins}</td>
                    <td className="px-4 py-2">{c.litres_consommes.toFixed(2)}L</td>
                    <td className="px-4 py-2">{(c.cout_total_carburant || 0).toFixed(2)}€</td>
                    <td className="px-4 py-2">{c.litres_consommes > 0 ? ((c.cout_total_carburant || 0) / c.litres_consommes).toFixed(2) : '0'}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Onglet Niveaux ────────────────────────────────────────────────────────────

function NiveauxTab({ cuves, showNotice, canManage }: NiveauxTabProps) {
  const [selectedCuve, setSelectedCuve] = useState<string | null>(null)
  const [niveaux, setNiveaux] = useState<NiveauCuve[]>([])
  const [form, setForm] = useState<NiveauForm>({ niveau_litres: 500, jauge_type: 'manuelle', anomalie: false, anomalie_description: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedCuve) {
      setLoading(true)
      getNiveauxCuve(selectedCuve)
        .then(setNiveaux)
        .catch(err => showNotice(formatFuelError(err), 'error'))
        .finally(() => setLoading(false))
    }
  }, [selectedCuve, showNotice])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCuve) return
    const selectedCapacity = selectedCuveData?.capacite_litres ?? 0
    if (!isNonNegativeNumber(form.niveau_litres)) {
      showNotice('Le niveau relevé ne peut pas être négatif.', 'error')
      return
    }
    if (selectedCapacity > 0 && form.niveau_litres > selectedCapacity) {
      showNotice('Le niveau relevé dépasse la capacité de la cuve.', 'error')
      return
    }
    try {
      await recordNiveauCuve({
        cuve_id: selectedCuve,
        date_releve: new Date().toISOString().slice(0, 10),
        heure_releve: new Date().toTimeString().slice(0, 5),
        niveau_litres: form.niveau_litres,
        jauge_type: form.jauge_type,
        releve_par_id: null,
        releve_par_nom: null,
        anomalie_suspectee: form.anomalie,
        anomalie_description: form.anomalie ? form.anomalie_description : null,
      })
      showNotice('Relevé enregistré')
      setForm({ niveau_litres: 500, jauge_type: 'manuelle', anomalie: false, anomalie_description: '' })
      const updated = await getNiveauxCuve(selectedCuve)
      setNiveaux(updated)
    } catch (err) {
      showNotice(formatFuelError(err), 'error')
    }
  }

  const selectedCuveData = cuves.find(c => c.id === selectedCuve)

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end bg-surface border border-line rounded-lg p-4">
        <select aria-label="Selection cuve" className={INPUT_CLS + ' flex-1'} value={selectedCuve || ''} onChange={e => setSelectedCuve(e.target.value || null)}>
          <option value="">Sélectionner une cuve...</option>
          {cuves.map(c => (<option key={c.id} value={c.id}>{c.numero_cuve} ({c.type_carburant}) - {c.capacite_litres}L</option>))}
        </select>
      </div>

      {selectedCuveData && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-surface border border-line rounded-lg p-4">
              <p className="text-sm text-secondary">Capacité</p>
              <p className="text-2xl font-bold">{selectedCuveData.capacite_litres}L</p>
            </div>
            <div className="bg-surface border border-line rounded-lg p-4">
              <p className="text-sm text-secondary">Type carburant</p>
              <p className="text-xl font-bold">{selectedCuveData.type_carburant}</p>
            </div>
            <div className="bg-surface border border-line rounded-lg p-4">
              <p className="text-sm text-secondary">Jauge</p>
              <p className="text-lg font-bold">{selectedCuveData.jauge_electronique ? '⚡ Électronique' : '🔧 Manuelle'}</p>
            </div>
            <div className="bg-surface border border-line rounded-lg p-4">
              <p className="text-sm text-secondary">Statut</p>
              <p className="text-lg font-bold text-green-400">{selectedCuveData.statut}</p>
            </div>
          </div>

          {canManage && (
            <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <input aria-label="Niveau releve litres" type="number" placeholder="Niveau (L)" min={0} step="0.01" className={INPUT_CLS} value={form.niveau_litres} onChange={e => setForm({ ...form, niveau_litres: Number(e.target.value) })} required />
                <select aria-label="Type jauge" className={INPUT_CLS} value={form.jauge_type} onChange={e => setForm({ ...form, jauge_type: e.target.value as NiveauCuve['jauge_type'] })}>
                  <option value="electronique">Jauge électronique</option>
                  <option value="manuelle">Jauge manuelle</option>
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.anomalie} onChange={e => setForm({ ...form, anomalie: e.target.checked })} className="rounded" />
                <span className="text-sm">Anomalie détectée</span>
              </label>
              {form.anomalie && (
                <textarea aria-label="Description anomalie niveau" placeholder="Description anomalie (évaporation, perte, etc.)" className={INPUT_CLS} value={form.anomalie_description} onChange={e => setForm({ ...form, anomalie_description: e.target.value })} rows={2} />
              )}
              <button type="submit" className={BTN_PRIMARY}>Enregistrer relevé</button>
            </form>
          )}

          <div className="bg-surface border border-line rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 border-b border-line">
                <tr className="text-left">
                  <th className="px-4 py-2">Date/Heure</th>
                  <th className="px-4 py-2">Niveau</th>
                  <th className="px-4 py-2">%</th>
                  <th className="px-4 py-2">Jauge</th>
                  <th className="px-4 py-2">Anomalie</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-secondary">Chargement...</td></tr>
                ) : niveaux.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-secondary">Aucun relevé</td></tr>
                ) : (
                  niveaux.map(n => (
                    <tr key={n.id} className="border-b border-line/50 hover:bg-slate-900/20">
                      <td className="px-4 py-2">{n.date_releve} {n.heure_releve || ''}</td>
                      <td className="px-4 py-2 font-mono">{n.niveau_litres}L</td>
                      <td className="px-4 py-2">{((n.niveau_litres / selectedCuveData.capacite_litres) * 100).toFixed(0)}%</td>
                      <td className="px-4 py-2 text-xs">{n.jauge_type === 'electronique' ? '⚡' : '🔧'}</td>
                      <td className="px-4 py-2">{n.anomalie_suspectee ? <span className="text-red-400">⚠ {n.anomalie_description}</span> : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Onglet Anomalies ──────────────────────────────────────────────────────────

function AnomaliesTab({ anomalies, cuves, vehicules, companyId, onRefresh, showNotice, canManage }: AnomaliesTabProps) {
  const [form, setForm] = useState<AnomalieForm>({
    type: 'evaporation_cuve',
    cuve_id: '',
    vehicule_id: '',
    litres_manquants: 10,
    description: '',
    gravite: 'warning',
  })
  const [showing, setShowing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isNonNegativeNumber(form.litres_manquants)) {
      showNotice('Les litres manquants ne peuvent pas être négatifs.', 'error')
      return
    }
    try {
      await createAnomalie({
        company_id: companyId,
        date_anomalie: new Date().toISOString().slice(0, 10),
        type: form.type,
        cuve_id: form.cuve_id || null,
        vehicule_id: form.vehicule_id || null,
        litres_manquants: form.litres_manquants,
        description: form.description,
        gravite: form.gravite,
        statut: 'nouveau',
        resolution_notes: null,
      })
      showNotice('Anomalie enregistrée')
      setForm({ type: 'evaporation_cuve', cuve_id: '', vehicule_id: '', litres_manquants: 10, description: '', gravite: 'warning' })
      setShowing(false)
      await onRefresh()
    } catch (err) {
      showNotice(formatFuelError(err), 'error')
    }
  }

  const typeLabels: Record<AnomalieCarburant['type'], string> = {
    evaporation_cuve: 'Évaporation cuve',
    consommation_anormale: 'Consommation anormale',
    perte_cuve: 'Perte cuve',
    autre: 'Autre',
  }

  const graviteColors: Record<AnomalieCarburant['gravite'], string> = {
    info: 'bg-blue-500/20 text-blue-300',
    warning: 'bg-amber-500/20 text-amber-300',
    critique: 'bg-red-500/20 text-red-300',
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <button onClick={() => setShowing(!showing)} className={BTN_PRIMARY}>
          {showing ? 'Fermer' : '+ Nouvelle anomalie'}
        </button>
      )}

      {showing && (
        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <select aria-label="Type anomalie" className={INPUT_CLS} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as AnomalieCarburant['type'] })}>
              <option value="evaporation_cuve">Évaporation cuve</option>
              <option value="consommation_anormale">Consommation anormale</option>
              <option value="perte_cuve">Perte cuve</option>
              <option value="autre">Autre</option>
            </select>
            <select aria-label="Cuve associee anomalie" className={INPUT_CLS} value={form.cuve_id} onChange={e => setForm({ ...form, cuve_id: e.target.value })}>
              <option value="">Cuve (optionnel)</option>
              {cuves.map(c => (<option key={c.id} value={c.id}>{c.numero_cuve}</option>))}
            </select>
            <select aria-label="Vehicule associe anomalie" className={INPUT_CLS} value={form.vehicule_id} onChange={e => setForm({ ...form, vehicule_id: e.target.value })}>
              <option value="">Véhicule (optionnel)</option>
              {vehicules.map(v => (<option key={v.id} value={v.id}>{v.immatriculation}</option>))}
            </select>
            <input aria-label="Litres manquants anomalie" type="number" placeholder="Litres manquants" min={0} step="0.1" className={INPUT_CLS} value={form.litres_manquants} onChange={e => setForm({ ...form, litres_manquants: Number(e.target.value) })} />
            <select aria-label="Gravite anomalie" className={INPUT_CLS} value={form.gravite} onChange={e => setForm({ ...form, gravite: e.target.value as AnomalieCarburant['gravite'] })}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critique">Critique</option>
            </select>
          </div>
          <textarea aria-label="Description anomalie" placeholder="Description" className={INPUT_CLS} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} required />
          <div className="flex gap-2">
            <button type="submit" className={BTN_PRIMARY}>Enregistrer</button>
            <button type="button" onClick={() => setShowing(false)} className={BTN_SECONDARY}>Annuler</button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {anomalies.length === 0 ? (
          <div className="text-center py-12 text-secondary">Aucune anomalie</div>
        ) : (
          anomalies.map((a: AnomalieCarburant) => (
            <div key={a.id} className="bg-surface border border-line rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex gap-2 items-center mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-mono ${graviteColors[a.gravite]}`}>{a.gravite}</span>
                    <span className="text-sm font-semibold">{typeLabels[a.type] || a.type}</span>
                    <span className={`px-2 py-1 rounded text-xs font-mono ${a.statut === 'resolu' ? 'bg-green-500/20 text-green-300' : a.statut === 'enquete' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-500/20 text-slate-300'}`}>{a.statut}</span>
                  </div>
                  <p className="text-sm text-secondary mb-1">{a.description}</p>
                  {a.litres_manquants && <p className="text-sm text-secondary">Litres manquants: {a.litres_manquants}L</p>}
                  <p className="text-xs text-muted mt-2">{a.date_anomalie}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
