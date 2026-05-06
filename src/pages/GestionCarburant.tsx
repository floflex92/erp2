import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import {
  listCuves, createCuve, updateCuve, deleteCuve,
  listPleins, createPlein,
  listCommandes, createCommande,
  listConsommationsParVehicule,
  listAnomalies, createAnomalie,
  getNiveauxCuve, recordNiveauCuve,
  type Cuve, type Plein, type CommandeCarburant, type AnomalieCarburant, type NiveauCuve,
} from '@/lib/fuelManagement'
import { supabase } from '@/lib/supabase'
import { STATUTS_ABSENCE_ACTIFS } from '@/lib/absencesRh'
import { listUnifiedConducteurs } from '@/lib/services/personsService'

type Tab = 'cuves' | 'pleins' | 'commandes' | 'consommation' | 'anomalies' | 'niveaux'

interface Vehicule { id: string; immatriculation: string; numero_parc?: string }
interface Conducteur { id: string; prenom: string; nom: string }
interface DepotOption { id: string; nom: string; source: 'adresses' | 'sites_logistiques' }
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

const INPUT_CLS = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-slate-400'
const BTN_PRIMARY = 'px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium'
const BTN_SECONDARY = 'px-4 py-2 rounded-lg border border-line text-foreground hover:bg-surface-2 transition-colors text-sm font-medium'
const TAB_CLS = 'px-4 py-2 font-medium transition-colors border-b-2'
const TAB_ACTIVE = `${TAB_CLS} border-blue-600 text-blue-600`
const TAB_INACTIVE = `${TAB_CLS} border-transparent text-secondary hover:text-foreground`

export default function GestionCarburant() {
  const { companyId, role } = useAuth()
  const canManage = role === 'dirigeant' || role === 'exploitant'

  const [tab, setTab] = useState<Tab>('cuves')
  const [cuves, setCuves] = useState<Cuve[]>([])
  const [pleins, setPleins] = useState<Plein[]>([])
  const [commandes, setCommandes] = useState<CommandeCarburant[]>([])
  const [anomalies, setAnomalies] = useState<AnomalieCarburant[]>([])
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [conducteurs, setConducteurs] = useState<Conducteur[]>([])
  const [indisponiblesAujourdhui, setIndisponiblesAujourdhui] = useState<Set<string>>(new Set())
  const [depots, setDepots] = useState<DepotOption[]>([])

  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const loadAll = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const [
        cuvesList,
        pleinsList,
        commandesList,
        anomaliesList,
        vehiculesList,
        conducteursList,
        depotsAdresses,
        depotsSites,
      ] = await Promise.all([
        listCuves(companyId),
        listPleins(companyId),
        listCommandes(companyId),
        listAnomalies(companyId),
        supabase.from('vehicules').select('id, immatriculation, numero_parc').eq('company_id', companyId),
        listUnifiedConducteurs(companyId, { activeOnly: true }),
        supabase.from('adresses').select('id, nom_lieu').eq('company_id', companyId).eq('type_lieu', 'depot'),
        supabase.from('sites_logistiques').select('id, nom, type_site').eq('company_id', companyId).in('type_site', ['depot', 'entrepot']),
      ])
      setCuves(cuvesList)
      setPleins(pleinsList)
      setCommandes(commandesList)
      setAnomalies(anomaliesList)
      setVehicules((vehiculesList.data || []) as Vehicule[])
      const conducteursData = conducteursList as Conducteur[]
      setConducteurs(conducteursData)

      const conducteurIds = conducteursData.map(c => c.id)
      const todayIso = new Date().toISOString().slice(0, 10)
      const absencesRes = conducteurIds.length > 0
        ? await supabase
          .from('absences_rh')
          .select('employe_id')
          .in('employe_id', conducteurIds)
          .in('statut', Array.from(STATUTS_ABSENCE_ACTIFS))
          .lte('date_debut', todayIso)
          .gte('date_fin', todayIso)
        : { data: [], error: null }
      if (absencesRes.error) throw absencesRes.error
      setIndisponiblesAujourdhui(new Set((absencesRes.data ?? []).map(row => row.employe_id as string)))

      const depotMap = new Map<string, DepotOption>()
      for (const d of (depotsAdresses.data || []) as Array<{ id: string; nom_lieu: string }>) {
        depotMap.set(d.id, { id: d.id, nom: d.nom_lieu, source: 'adresses' })
      }
      for (const s of (depotsSites.data || []) as Array<{ id: string; nom: string }>) {
        if (!depotMap.has(s.id)) depotMap.set(s.id, { id: s.id, nom: s.nom, source: 'sites_logistiques' })
      }
      setDepots(Array.from(depotMap.values()).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')))
    } catch (err) {
      showNotice(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  function showNotice(msg: string, type: 'success' | 'error' = 'success') {
    setNotice({ msg, type })
    setTimeout(() => setNotice(null), 4000)
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-line-strong bg-surface px-6 py-4">
        <h1 className="text-2xl font-bold">Gestion du Carburant</h1>
        <p className="text-sm text-secondary mt-1">Cuves multi-dépôts, pleins, commandes TVA et anomalies</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line-strong bg-surface px-6 overflow-x-auto">
        <button className={tab === 'cuves' ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setTab('cuves')}>
          Cuves
        </button>
        <button className={tab === 'pleins' ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setTab('pleins')}>
          Pleins
        </button>
        <button className={tab === 'commandes' ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setTab('commandes')}>
          Commandes
        </button>
        <button className={tab === 'consommation' ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setTab('consommation')}>
          Consommation
        </button>
        <button className={tab === 'niveaux' ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setTab('niveaux')}>
          Niveaux
        </button>
        <button className={tab === 'anomalies' ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setTab('anomalies')}>
          Anomalies
        </button>
      </div>

      {/* Notice */}
      {notice && (
        <div className={`px-6 py-3 ${notice.type === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
          {notice.msg}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-secondary">Chargement...</div>
        ) : tab === 'cuves' ? (
          <CuvesTab cuves={cuves} depots={depots} companyId={companyId} onRefresh={loadAll} showNotice={showNotice} canManage={canManage} />
        ) : tab === 'pleins' ? (
          <PleinsTab pleins={pleins} vehicules={vehicules} conducteurs={conducteurs} indisponiblesAujourdhui={indisponiblesAujourdhui} cuves={cuves} companyId={companyId} onRefresh={loadAll} showNotice={showNotice} canManage={canManage} />
        ) : tab === 'commandes' ? (
          <CommandesTab commandes={commandes} cuves={cuves} companyId={companyId} onRefresh={loadAll} showNotice={showNotice} canManage={canManage} />
        ) : tab === 'consommation' ? (
          <ConsommationTab vehicules={vehicules} companyId={companyId} />
        ) : tab === 'niveaux' ? (
          <NiveauxTab cuves={cuves} companyId={companyId} onRefresh={loadAll} showNotice={showNotice} canManage={canManage} />
        ) : tab === 'anomalies' ? (
          <AnomaliesTab anomalies={anomalies} cuves={cuves} vehicules={vehicules} companyId={companyId} onRefresh={loadAll} showNotice={showNotice} canManage={canManage} />
        ) : null}
      </div>
    </div>
  )
}

// ── Onglet Cuves ──────────────────────────────────────────────────────────────

function CuvesTab({ cuves, depots, companyId, onRefresh, showNotice, canManage }: any) {
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
    try {
      const selectedDepot = (depots as DepotOption[]).find(d => d.id === form.depot_id) || null
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
      showNotice(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`, 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette cuve ?')) return
    try {
      await deleteCuve(id)
      showNotice('Cuve supprimée')
      await onRefresh()
    } catch (err) {
      showNotice(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`, 'error')
    }
  }

  const groupedByDepot = new Map<string, Cuve[]>()
  for (const cuve of cuves) {
    const key = cuve.depot_nom || '(aucun dépôt)'
    if (!groupedByDepot.has(key)) groupedByDepot.set(key, [])
    groupedByDepot.get(key)!.push(cuve)
  }

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
            <select className={INPUT_CLS} value={form.depot_id} onChange={e => setForm({ ...form, depot_id: e.target.value })}>
              <option value="">Dépôt (optionnel)</option>
              {depots.map((d: DepotOption) => (<option key={d.id} value={d.id}>{d.nom}</option>))}
            </select>
            <input type="text" placeholder="Numéro cuve (ex: C001)" className={INPUT_CLS} value={form.numero_cuve} onChange={e => setForm({ ...form, numero_cuve: e.target.value })} required />
            <select className={INPUT_CLS} value={form.type_carburant} onChange={e => setForm({ ...form, type_carburant: e.target.value as Cuve['type_carburant'] })}>
              <option value="gazole">Gazole</option>
              <option value="essence">Essence</option>
              <option value="adblue">AdBlue</option>
              <option value="autre">Autre</option>
            </select>
            <input type="number" placeholder="Capacité (litres)" className={INPUT_CLS} value={form.capacite_litres} onChange={e => setForm({ ...form, capacite_litres: Number(e.target.value) })} required />
            <input type="text" placeholder="Marque" className={INPUT_CLS} value={form.marque} onChange={e => setForm({ ...form, marque: e.target.value })} />
            <input type="text" placeholder="Modèle" className={INPUT_CLS} value={form.modele} onChange={e => setForm({ ...form, modele: e.target.value })} />
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
          <textarea placeholder="Notes" className={INPUT_CLS} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
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
                        const depotByName = (depots as DepotOption[]).find(d => d.nom === cuve.depot_nom)
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

function PleinsTab({ pleins, vehicules, conducteurs, indisponiblesAujourdhui, cuves, companyId, onRefresh, showNotice, canManage }: any) {
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
    try {
      const vehicule = (vehicules as Vehicule[]).find(v => v.id === form.vehicule_id)
      const cuve = (cuves as Cuve[]).find(c => c.id === form.cuve_id)

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
      showNotice(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`, 'error')
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
            <select className={INPUT_CLS} value={form.vehicule_id} onChange={e => setForm({ ...form, vehicule_id: e.target.value })} required>
              <option value="">Véhicule</option>
              {(vehicules as Vehicule[]).map(v => (<option key={v.id} value={v.id}>{v.immatriculation}</option>))}
            </select>
            <select className={INPUT_CLS} value={form.conducteur_id} onChange={e => setForm({ ...form, conducteur_id: e.target.value })} required>
              <option value="">Conducteur</option>
              {(conducteurs as Conducteur[]).map(c => (
                <option key={c.id} value={c.id}>
                  {c.prenom} {c.nom}{indisponiblesAujourdhui?.has(c.id) ? ' (Indisponible aujourd\'hui)' : ''}
                </option>
              ))}
            </select>
            <input type="text" placeholder="Identifiant 4 chiffres" maxLength={4} className={INPUT_CLS} value={form.conducteur_identifiant_4d} onChange={e => setForm({ ...form, conducteur_identifiant_4d: e.target.value })} required />
            <input type="text" placeholder="Code conducteur" className={INPUT_CLS} value={form.conducteur_code} onChange={e => setForm({ ...form, conducteur_code: e.target.value })} required />
            <input type="text" placeholder="N° parc" className={INPUT_CLS} value={form.conducteur_num_parc} onChange={e => setForm({ ...form, conducteur_num_parc: e.target.value })} required />
            <select className={INPUT_CLS} value={form.cuve_id} onChange={e => setForm({ ...form, cuve_id: e.target.value })}>
              <option value="">Cuve (optionnel)</option>
              {(cuves as Cuve[]).map(c => (<option key={c.id} value={c.id}>{c.numero_cuve} ({c.type_carburant})</option>))}
            </select>
            <input type="date" className={INPUT_CLS} value={form.date_plein} onChange={e => setForm({ ...form, date_plein: e.target.value })} required />
            <input type="time" className={INPUT_CLS} value={form.heure_plein} onChange={e => setForm({ ...form, heure_plein: e.target.value })} />
            <input type="number" placeholder="Litres versés" step="0.01" className={INPUT_CLS} value={form.litres_verses} onChange={e => setForm({ ...form, litres_verses: Number(e.target.value) })} required />
            <input type="number" placeholder="Prix/L TTC" step="0.01" className={INPUT_CLS} value={form.prix_unitaire_ttc} onChange={e => setForm({ ...form, prix_unitaire_ttc: Number(e.target.value) })} required />
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

function CommandesTab({ commandes, cuves, companyId, onRefresh, showNotice, canManage }: any) {
  const [showing, setShowing] = useState(false)
  const [form, setForm] = useState({
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
    try {
      const montantHt = form.quantite_litres * form.price_unit_ht
      const montantTva = montantHt * (form.taux_tva / 100)
      const montantTtc = montantHt + montantTva

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
      showNotice(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`, 'error')
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
            <input type="text" placeholder="Fournisseur" className={INPUT_CLS} value={form.fournisseur_nom} onChange={e => setForm({ ...form, fournisseur_nom: e.target.value })} required />
            <select className={INPUT_CLS} value={form.type_carburant} onChange={e => setForm({ ...form, type_carburant: e.target.value as any })}>
              <option value="gazole">Gazole</option>
              <option value="essence">Essence</option>
              <option value="adblue">AdBlue</option>
            </select>
            <input type="number" placeholder="Quantité (L)" className={INPUT_CLS} value={form.quantite_litres} onChange={e => setForm({ ...form, quantite_litres: Number(e.target.value) })} required />
            <input type="date" className={INPUT_CLS} value={form.date_commande} onChange={e => setForm({ ...form, date_commande: e.target.value })} required />
            <input type="date" placeholder="Livraison prévue" className={INPUT_CLS} value={form.date_livraison_prevue} onChange={e => setForm({ ...form, date_livraison_prevue: e.target.value })} />
            <select className={INPUT_CLS} value={form.cuve_id} onChange={e => setForm({ ...form, cuve_id: e.target.value })}>
              <option value="">Cuve (optionnel)</option>
              {cuves.map((c: any) => (<option key={c.id} value={c.id}>{c.numero_cuve}</option>))}
            </select>
            <input type="number" placeholder="Prix HT/L" step="0.01" className={INPUT_CLS} value={form.price_unit_ht} onChange={e => setForm({ ...form, price_unit_ht: Number(e.target.value) })} required />
            <input type="number" placeholder="Taux TVA %" className={INPUT_CLS} value={form.taux_tva} onChange={e => setForm({ ...form, taux_tva: Number(e.target.value) })} required />
          </div>
          <textarea placeholder="Notes" className={INPUT_CLS} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
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

function ConsommationTab({ companyId }: any) {
  const [consommations, setConsommations] = useState<any[]>([])
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
        <input type="date" className={INPUT_CLS + ' max-w-xs'} value={period.debut} onChange={e => setPeriod({ ...period, debut: e.target.value })} />
        <span>à</span>
        <input type="date" className={INPUT_CLS + ' max-w-xs'} value={period.fin} onChange={e => setPeriod({ ...period, fin: e.target.value })} />
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

function NiveauxTab({ cuves, showNotice, canManage }: any) {
  const [selectedCuve, setSelectedCuve] = useState<string | null>(null)
  const [niveaux, setNiveaux] = useState<NiveauCuve[]>([])
  const [form, setForm] = useState({ niveau_litres: 500, jauge_type: 'manuelle' as const, anomalie: false, anomalie_description: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedCuve) {
      setLoading(true)
      getNiveauxCuve(selectedCuve)
        .then(setNiveaux)
        .catch(err => showNotice(`Erreur: ${err.message}`, 'error'))
        .finally(() => setLoading(false))
    }
  }, [selectedCuve, showNotice])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCuve) return
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
      showNotice(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`, 'error')
    }
  }

  const selectedCuveData = cuves.find((c: any) => c.id === selectedCuve)

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end bg-surface border border-line rounded-lg p-4">
        <select className={INPUT_CLS + ' flex-1'} value={selectedCuve || ''} onChange={e => setSelectedCuve(e.target.value || null)}>
          <option value="">Sélectionner une cuve...</option>
          {cuves.map((c: any) => (<option key={c.id} value={c.id}>{c.numero_cuve} ({c.type_carburant}) - {c.capacite_litres}L</option>))}
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
                <input type="number" placeholder="Niveau (L)" className={INPUT_CLS} value={form.niveau_litres} onChange={e => setForm({ ...form, niveau_litres: Number(e.target.value) })} required />
                <select className={INPUT_CLS} value={form.jauge_type} onChange={e => setForm({ ...form, jauge_type: e.target.value as any })}>
                  <option value="electronique">Jauge électronique</option>
                  <option value="manuelle">Jauge manuelle</option>
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.anomalie} onChange={e => setForm({ ...form, anomalie: e.target.checked })} className="rounded" />
                <span className="text-sm">Anomalie détectée</span>
              </label>
              {form.anomalie && (
                <textarea placeholder="Description anomalie (évaporation, perte, etc.)" className={INPUT_CLS} value={form.anomalie_description} onChange={e => setForm({ ...form, anomalie_description: e.target.value })} rows={2} />
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

function AnomaliesTab({ anomalies, cuves, vehicules, companyId, onRefresh, showNotice, canManage }: any) {
  const [form, setForm] = useState({
    type: 'evaporation_cuve' as const,
    cuve_id: '',
    vehicule_id: '',
    litres_manquants: 10,
    description: '',
    gravite: 'warning' as const,
  })
  const [showing, setShowing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      showNotice(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`, 'error')
    }
  }

  const typeLabels: Record<string, string> = {
    evaporation_cuve: 'Évaporation cuve',
    consommation_anormale: 'Consommation anormale',
    perte_cuve: 'Perte cuve',
    autre: 'Autre',
  }

  const graviteColors: Record<string, string> = {
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
            <select className={INPUT_CLS} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
              <option value="evaporation_cuve">Évaporation cuve</option>
              <option value="consommation_anormale">Consommation anormale</option>
              <option value="perte_cuve">Perte cuve</option>
              <option value="autre">Autre</option>
            </select>
            <select className={INPUT_CLS} value={form.cuve_id} onChange={e => setForm({ ...form, cuve_id: e.target.value })}>
              <option value="">Cuve (optionnel)</option>
              {cuves.map((c: any) => (<option key={c.id} value={c.id}>{c.numero_cuve}</option>))}
            </select>
            <select className={INPUT_CLS} value={form.vehicule_id} onChange={e => setForm({ ...form, vehicule_id: e.target.value })}>
              <option value="">Véhicule (optionnel)</option>
              {vehicules.map((v: any) => (<option key={v.id} value={v.id}>{v.immatriculation}</option>))}
            </select>
            <input type="number" placeholder="Litres manquants" step="0.1" className={INPUT_CLS} value={form.litres_manquants} onChange={e => setForm({ ...form, litres_manquants: Number(e.target.value) })} />
            <select className={INPUT_CLS} value={form.gravite} onChange={e => setForm({ ...form, gravite: e.target.value as any })}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critique">Critique</option>
            </select>
          </div>
          <textarea placeholder="Description" className={INPUT_CLS} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} required />
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
