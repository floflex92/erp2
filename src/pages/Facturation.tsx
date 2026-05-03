import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'
import { evaluateAffretementCompletionReadiness, getAffretementContractByOtId } from '@/lib/affretementPortal'
import { buildInvoicePdf } from '@/lib/invoicePdf'

type Facture = Tables<'factures'>
type FactureFournisseur = Tables<'compta_factures_fournisseurs'>
type ClientLookup = {
  id: string
  nom: string
  conditions_paiement: number | null
  mode_paiement_defaut: string | null
  taux_tva_defaut: number | null
  type_echeance: string | null
  jour_echeance: number | null
}
type OTLookup = {
  id: string
  reference: string
  client_id: string
  numero_facturation: string | null
  prix_ht: number | null
  facturation_id: string | null
  statut: string
}
type Tab = 'factures' | 'fournisseurs' | 'tva' | 'tresorerie' | 'previsionnel' | 'rapports' | 'journal' | 'tarifs'

const STATUT_COLORS: Record<string, string> = {
  brouillon:  'bg-surface-2 text-secondary',
  envoyee:    'bg-blue-100 text-blue-700',
  payee:      'bg-green-100 text-green-700',
  en_retard:  'bg-red-100 text-red-600',
  annulee:    'bg-surface-2 text-muted',
}
const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', envoyee: 'Envoyée', payee: 'Payée', en_retard: 'En retard', annulee: 'Annulée',
}
const FOURN_STATUT_COLORS: Record<string, string> = {
  recu: 'bg-amber-100 text-amber-700',
  validee: 'bg-blue-100 text-blue-700',
  payee: 'bg-green-100 text-green-700',
  annulee: 'bg-surface-2 text-muted',
}
const FOURN_STATUT_LABELS: Record<string, string> = {
  recu: 'Reçue',
  validee: 'Validée',
  payee: 'Payée',
  annulee: 'Annulée',
}
const MODE_PAIEMENT_LABELS: Record<string, string> = {
  virement: 'Virement', cheque: 'Chèque', prelevement: 'Prélèvement', especes: 'Espèces', traite: 'Traite', autre: 'Autre',
}
const TYPE_ECHEANCE_LABELS: Record<string, string> = {
  date_facture_plus_delai: 'Date facture + délai',
  fin_de_mois: 'Fin de mois',
  fin_de_mois_le_10: 'Fin de mois + 10',
  jour_fixe: 'Jour fixe',
  comptant: 'Comptant',
}
const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const TAUX_TVA_OPTIONS = [0, 2.1, 5.5, 8.5, 10, 20]

const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary-soft)]'

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function formatIsoDate(value: Date) {
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-')
}

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0)
}

function getFactureDisplayState(facture: Pick<Facture, 'statut' | 'date_echeance'>, today = new Date()) {
  if (facture.statut === 'payee' || facture.statut === 'annulee' || facture.statut === 'brouillon') {
    return { statut: facture.statut, retardJours: 0, isLate: false }
  }

  if (!facture.date_echeance) {
    return { statut: facture.statut, retardJours: 0, isLate: facture.statut === 'en_retard' }
  }

  const todayDate = startOfDay(today)
  const dueDate = startOfDay(parseIsoDate(facture.date_echeance))
  const retardJours = Math.floor((todayDate.getTime() - dueDate.getTime()) / 86400000)
  const isLate = facture.statut === 'en_retard' || retardJours > 0

  return {
    statut: isLate ? 'en_retard' : facture.statut,
    retardJours: isLate ? Math.max(retardJours, 0) : 0,
    isLate,
  }
}

function computeDateEcheance(client: ClientLookup | null, dateEmission: string) {
  if (!client) return null
  const emissionDate = parseIsoDate(dateEmission)
  const shiftedDate = addDays(emissionDate, client.conditions_paiement ?? 0)

  switch (client.type_echeance) {
    case 'comptant':
      return formatIsoDate(emissionDate)
    case 'fin_de_mois':
      return formatIsoDate(endOfMonth(shiftedDate))
    case 'fin_de_mois_le_10': {
      const monthEnd = endOfMonth(shiftedDate)
      return formatIsoDate(new Date(monthEnd.getFullYear(), monthEnd.getMonth() + 1, 10))
    }
    case 'jour_fixe': {
      if (!client.jour_echeance) return formatIsoDate(shiftedDate)
      const fixedDay = Math.min(Math.max(client.jour_echeance, 1), 31)
      let candidate = new Date(shiftedDate.getFullYear(), shiftedDate.getMonth(), 1)
      candidate.setDate(Math.min(fixedDay, endOfMonth(candidate).getDate()))
      if (candidate < shiftedDate) {
        candidate = new Date(shiftedDate.getFullYear(), shiftedDate.getMonth() + 1, 1)
        candidate.setDate(Math.min(fixedDay, endOfMonth(candidate).getDate()))
      }
      return formatIsoDate(candidate)
    }
    case 'date_facture_plus_delai':
    default:
      return formatIsoDate(shiftedDate)
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-secondary">{label}</label>
      {children}
    </div>
  )
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'factures',    label: 'Factures' },
    { key: 'fournisseurs',label: 'Achats fournisseur' },
    { key: 'tva',         label: 'TVA & Taxes' },
    { key: 'tresorerie',  label: 'Trésorerie' },
    { key: 'previsionnel',label: 'Prévisionnel' },
    { key: 'rapports',    label: 'Rapports' },
    { key: 'journal',     label: 'Journal' },
    { key: 'tarifs',      label: 'Tarifs transport' },
  ]
  return (
    <div className="flex gap-1 mb-6 border-b border-line pb-0">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === t.key
              ? 'border-slate-800 text-foreground'
              : 'border-transparent text-discreet hover:text-foreground'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Bar chart (CSS) ─────────────────────────────────────────────────────────
function BarChart({ data, height = 120, color = '#1e293b' }: {
  data: { label: string; value: number }[]
  height?: number
  color?: string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0 h-full">
          <div className="flex-1 w-full flex items-end">
            <div
              className="w-full rounded-t transition-all"
              style={{ height: `${(d.value / max) * 100}%`, background: color, minHeight: d.value > 0 ? 4 : 0 }}
            />
          </div>
          <span className="text-[10px] text-muted truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function DualBarChart({ data, height = 120 }: {
  data: { label: string; a: number; b: number; labelA?: string; labelB?: string }[]
  height?: number
}) {
  const max = Math.max(...data.flatMap(d => [d.a, d.b]), 1)
  return (
    <div className="flex items-end gap-2 w-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0 h-full">
          <div className="flex-1 w-full flex items-end gap-0.5">
            <div className="flex-1 rounded-t transition-all bg-slate-700" style={{ height: `${(d.a / max) * 100}%`, minHeight: d.a > 0 ? 4 : 0 }} />
            <div className="flex-1 rounded-t transition-all bg-emerald-400" style={{ height: `${(d.b / max) * 100}%`, minHeight: d.b > 0 ? 4 : 0 }} />
          </div>
          <span className="text-[10px] text-muted truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── MiniStat ────────────────────────────────────────────────────────────────
function MiniStat({ label, value, color, sub }: { label: string; value: string; color: 'blue' | 'red' | 'green' | 'slate' | 'amber'; sub?: string }) {
  const cls = {
    blue:  'bg-blue-50 text-blue-700 border-blue-100',
    red:   'bg-red-50 text-red-700 border-red-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    slate: 'bg-surface-soft text-foreground border-line',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }[color]
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-xs font-medium text-discreet">{label}</span>
      <p className="text-foreground mt-0.5">{value || '—'}</p>
    </div>
  )
}

// ─── Journal entry type ───────────────────────────────────────────────────────
type JournalEntry = {
  id: string
  date: string
  libelle: string
  compte: string
  debit: number
  credit: number
}

type RelanceScenario = {
  id: string
  nom: string
  niveau: number
  delai_apres_echeance: number
  type: string
  sujet_template: string | null
  corps_template: string | null
  actif: boolean
}

type RelanceHistorique = {
  id: string
  facture_id: string
  scenario_id: string | null
  niveau: number
  date_envoi: string
  mode: string
  montant_relance: number
  statut: string
  notes: string | null
}

const COMPTES_COMPTABLES = [
  '101 - Capital social', '106 - Réserves', '110 - Report à nouveau',
  '401 - Fournisseurs', '411 - Clients', '421 - Personnel – rémunérations',
  '431 - Sécurité sociale', '444 - Etat – IS', '445 - TVA',
  '512 - Banque', '530 - Caisse',
  '601 - Achats matières', '606 - Achats non stockés', '607 - Achats marchandises',
  '611 - Sous-traitance', '615 - Entretien réparations', '622 - Honoraires',
  '625 - Déplacements', '641 - Salaires', '645 - Charges sociales',
  '681 - Dotations amortissement',
  '706 - Prestations de services', '707 - Ventes marchandises',
  '708 - Produits activités annexes', '758 - Produits divers',
]

// ─── Tarifs Transport component ──────────────────────────────────────────────
type TarifClient = {
  id: string; client_id: string; libelle: string; tarif_km: number
  coeff_gazole: boolean; peages_refactures: boolean; forfait_minimum: number | null
  actif: boolean; date_debut: string
}
type CnrIndice = { id: string; annee: number; mois: number; indice_gazole: number; indice_reference: number }

const fmtEur2 = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function TarifsTransportTab({ clients }: { clients: ClientLookup[] }) {
  const [tarifs, setTarifs] = useState<TarifClient[]>([])
  const [cnrIndices, setCnrIndices] = useState<CnrIndice[]>([])
  const [showTarifForm, setShowTarifForm] = useState(false)
  const [showCnrForm, setShowCnrForm] = useState(false)
  const [saving, setSaving] = useState(false)
  // Tarif form
  const [tClientId, setTClientId] = useState('')
  const [tLibelle, setTLibelle] = useState('Tarif standard')
  const [tTarifKm, setTTarifKm] = useState('1.20')
  const [tCoeffGazole, setTCoeffGazole] = useState(true)
  const [tPeages, setTPeages] = useState(false)
  const [tForfait, setTForfait] = useState('')
  const [tDateDebut, setTDateDebut] = useState(new Date().toISOString().slice(0,10))
  // CNR form
  const [cAnnee, setCAnnee] = useState(String(new Date().getFullYear()))
  const [cMois, setCMois] = useState(String(new Date().getMonth() + 1))
  const [cIndice, setCIndice] = useState('')
  const [cRef, setCRef] = useState('145.00')
  // Calculator
  const [calcKm, setCalcKm] = useState('')
  const [calcTarifBase, setCalcTarifBase] = useState('')
  const [calcCnrIdx, setCalcCnrIdx] = useState('')
  const [calcRef, setCalcRef] = useState('145.00')

  const loadTarifs = async () => {
    const { data } = await supabase.from('transport_tarifs_clients' as any).select('*').order('created_at', { ascending: false })
    if (data) setTarifs(data as unknown as TarifClient[])
  }
  const loadCnr = async () => {
    const { data } = await supabase.from('transport_cnr_indices' as any).select('*').order('annee', { ascending: false }).order('mois', { ascending: false })
    if (data) setCnrIndices(data as unknown as CnrIndice[])
  }

  useEffect(() => { loadTarifs(); loadCnr() }, [])

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.nom]))

  const resetTarifForm = () => {
    setTClientId(''); setTLibelle('Tarif standard'); setTTarifKm('1.20')
    setTCoeffGazole(true); setTPeages(false); setTForfait(''); setTDateDebut(new Date().toISOString().slice(0,10))
    setShowTarifForm(false)
  }

  const saveTarif = async () => {
    if (!tClientId) return
    setSaving(true)
    await supabase.from('transport_tarifs_clients' as any).insert({
      client_id: tClientId, libelle: tLibelle, tarif_km: parseFloat(tTarifKm) || 0,
      coeff_gazole: tCoeffGazole, peages_refactures: tPeages,
      forfait_minimum: tForfait ? parseFloat(tForfait) : null,
      date_debut: tDateDebut, actif: true,
    })
    await loadTarifs(); setSaving(false); resetTarifForm()
  }

  const toggleActif = async (t: TarifClient) => {
    await supabase.from('transport_tarifs_clients' as any).update({ actif: !t.actif }).eq('id', t.id)
    await loadTarifs()
  }

  const deleteTarif = async (id: string) => {
    if (!confirm('Supprimer ce tarif ?')) return
    await supabase.from('transport_tarifs_clients' as any).delete().eq('id', id)
    await loadTarifs()
  }

  const saveCnr = async () => {
    if (!cIndice) return
    setSaving(true)
    await supabase.from('transport_cnr_indices' as any).upsert({
      annee: parseInt(cAnnee), mois: parseInt(cMois),
      indice_gazole: parseFloat(cIndice), indice_reference: parseFloat(cRef) || 145,
    }, { onConflict: 'annee,mois' })
    await loadCnr(); setSaving(false); setCIndice(''); setShowCnrForm(false)
  }

  // Calcul CNR : prix_ht = km × tarif_base × (1 + coeff × (indice/ref - 1))
  const calcResult = (() => {
    const km = parseFloat(calcKm); const base = parseFloat(calcTarifBase)
    const idx = parseFloat(calcCnrIdx); const ref = parseFloat(calcRef)
    if (!km || !base) return null
    const prix = idx && ref ? km * base * (1 + 0.25 * (idx / ref - 1)) : km * base
    return prix
  })()

  return (
    <div className="space-y-6">
      {/* ── Barèmes tarifaires ── */}
      <div className="bg-surface rounded-xl border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Barèmes tarifaires clients</h3>
          <button onClick={() => setShowTarifForm(true)}
            className="px-3 py-1.5 bg-[color:var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">
            + Nouveau tarif
          </button>
        </div>

        {showTarifForm && (
          <div className="mb-4 p-4 border rounded-xl bg-surface-soft grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-secondary mb-1">Client</label>
              <select value={tClientId} onChange={e => setTClientId(e.target.value)} className={inp}>
                <option value="">— Sélectionner un client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Libellé</label>
              <input value={tLibelle} onChange={e => setTLibelle(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Tarif / km (€)</label>
              <input type="number" step="0.0001" value={tTarifKm} onChange={e => setTTarifKm(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Forfait minimum (€)</label>
              <input type="number" step="0.01" value={tForfait} onChange={e => setTForfait(e.target.value)} placeholder="Facultatif" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Date début</label>
              <input type="date" value={tDateDebut} onChange={e => setTDateDebut(e.target.value)} className={inp} />
            </div>
            <div className="col-span-2 flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={tCoeffGazole} onChange={e => setTCoeffGazole(e.target.checked)} className="w-4 h-4" />
                Clause gazole CNR
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={tPeages} onChange={e => setTPeages(e.target.checked)} className="w-4 h-4" />
                Péages refacturés
              </label>
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button onClick={resetTarifForm} className="px-3 py-1.5 border rounded-lg text-sm text-secondary hover:bg-surface-2">Annuler</button>
              <button onClick={saveTarif} disabled={saving || !tClientId}
                className="px-3 py-1.5 bg-[color:var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? 'Sauvegarde…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-surface-soft text-xs text-discreet uppercase">
              <th className="px-3 py-2 text-left">Client</th>
              <th className="px-3 py-2 text-left">Libellé</th>
              <th className="px-3 py-2 text-right">Tarif/km</th>
              <th className="px-3 py-2 text-center">Gazole CNR</th>
              <th className="px-3 py-2 text-center">Péages</th>
              <th className="px-3 py-2 text-right">Forfait min.</th>
              <th className="px-3 py-2 text-center">Statut</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {tarifs.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted text-sm">Aucun barème enregistré</td></tr>
            )}
            {tarifs.map(t => (
              <tr key={t.id} className="border-b hover:bg-surface-soft">
                <td className="px-3 py-2 font-medium">{clientMap[t.client_id] ?? t.client_id.slice(0,8)}</td>
                <td className="px-3 py-2 text-secondary">{t.libelle}</td>
                <td className="px-3 py-2 text-right font-mono">{t.tarif_km.toFixed(4)} €</td>
                <td className="px-3 py-2 text-center">{t.coeff_gazole ? '✓' : '—'}</td>
                <td className="px-3 py-2 text-center">{t.peages_refactures ? '✓' : '—'}</td>
                <td className="px-3 py-2 text-right">{t.forfait_minimum != null ? fmtEur2(t.forfait_minimum) : '—'}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => toggleActif(t)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.actif ? 'bg-green-100 text-green-700' : 'bg-surface-2 text-discreet'}`}>
                    {t.actif ? 'Actif' : 'Inactif'}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => deleteTarif(t.id)} className="text-red-400 hover:text-red-600 text-xs">Suppr.</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ── Indices CNR ── */}
        <div className="bg-surface rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Indices CNR gazole</h3>
            <button onClick={() => setShowCnrForm(v => !v)}
              className="px-3 py-1.5 bg-[color:var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">
              + Ajouter
            </button>
          </div>
          {showCnrForm && (
            <div className="mb-4 p-3 border rounded-lg bg-surface-soft grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Année</label>
                <input type="number" value={cAnnee} onChange={e => setCAnnee(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Mois</label>
                <select value={cMois} onChange={e => setCMois(e.target.value)} className={inp}>
                  {MOIS_LABELS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Indice gazole</label>
                <input type="number" step="0.01" value={cIndice} onChange={e => setCIndice(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Indice de référence</label>
                <input type="number" step="0.01" value={cRef} onChange={e => setCRef(e.target.value)} className={inp} />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <button onClick={() => setShowCnrForm(false)} className="px-3 py-1.5 border rounded-lg text-sm text-secondary">Annuler</button>
                <button onClick={saveCnr} disabled={saving || !cIndice}
                  className="px-3 py-1.5 bg-[color:var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {saving ? '…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-surface-soft text-xs text-discreet uppercase">
              <th className="px-3 py-2 text-left">Période</th>
              <th className="px-3 py-2 text-right">Indice gazole</th>
              <th className="px-3 py-2 text-right">Référence</th>
              <th className="px-3 py-2 text-right">Variation</th>
            </tr></thead>
            <tbody>
              {cnrIndices.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-muted text-sm">Aucun indice</td></tr>
              )}
              {cnrIndices.map(c => {
                const variation = ((c.indice_gazole - c.indice_reference) / c.indice_reference * 100)
                return (
                  <tr key={c.id} className="border-b hover:bg-surface-soft">
                    <td className="px-3 py-2 font-medium">{MOIS_LABELS[c.mois-1]} {c.annee}</td>
                    <td className="px-3 py-2 text-right font-mono">{c.indice_gazole.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted">{c.indice_reference.toFixed(2)}</td>
                    <td className={`px-3 py-2 text-right font-medium ${variation >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Calculateur CNR ── */}
        <div className="bg-surface rounded-xl border p-5">
          <h3 className="font-semibold text-foreground mb-4">Calculateur gazole CNR</h3>
          <p className="text-xs text-discreet mb-4">
            Prix = km × tarif × (1 + 0,25 × (indice / référence − 1))
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Distance (km)</label>
              <input type="number" value={calcKm} onChange={e => setCalcKm(e.target.value)} placeholder="ex: 450" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Tarif de base (€/km)</label>
              <input type="number" step="0.0001" value={calcTarifBase} onChange={e => setCalcTarifBase(e.target.value)} placeholder="ex: 1.2500" className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Indice CNR du mois</label>
                <input type="number" step="0.01" value={calcCnrIdx} onChange={e => setCalcCnrIdx(e.target.value)} placeholder="ex: 157.30" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Indice de référence</label>
                <input type="number" step="0.01" value={calcRef} onChange={e => setCalcRef(e.target.value)} className={inp} />
              </div>
            </div>
            {calcResult != null && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                <p className="text-xs text-blue-500 mb-1">Prix transport calculé HT</p>
                <p className="text-2xl font-bold text-blue-700">{fmtEur2(calcResult)}</p>
                {calcCnrIdx && calcRef && (
                  <p className="text-xs text-blue-400 mt-1">
                    Coefficient gazole : {(1 + 0.25 * (parseFloat(calcCnrIdx) / parseFloat(calcRef) - 1)).toFixed(4)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Facturation() {
  const [tab, setTab] = useState<Tab>('factures')
  const [list, setList] = useState<Facture[]>([])
  const [supplierInvoices, setSupplierInvoices] = useState<FactureFournisseur[]>([])
  const [clients, setClients] = useState<ClientLookup[]>([])
  const [ots, setOts] = useState<OTLookup[]>([])
  const [loading, setLoading] = useState(true)

  // Factures tab state
  const [filterStatut, setFilterStatut] = useState('tous')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    ot_id: null as string | null,
    montant_ht: 0,
    taux_tva: 20,
    date_emission: new Date().toISOString().split('T')[0],
    date_echeance: null as string | null,
    statut: 'brouillon',
    mode_paiement: null as string | null,
    notes: null as string | null,
  })
  const [selectedOtIds, setSelectedOtIds] = useState<string[]>([])
  const [lastAutoMontantHt, setLastAutoMontantHt] = useState<number | null>(null)
  const [paymentDefaultsLocked, setPaymentDefaultsLocked] = useState(true)
  const [dueDateDefaultsLocked, setDueDateDefaultsLocked] = useState(true)
  const [vatDefaultsLocked, setVatDefaultsLocked] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Facture | null>(null)

  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [supplierSaving, setSupplierSaving] = useState(false)
  const [supplierError, setSupplierError] = useState<string | null>(null)
  const [supplierForm, setSupplierForm] = useState({
    fournisseur_nom: '',
    montant_ht: 0,
    taux_tva: 20,
    date_facture: new Date().toISOString().split('T')[0],
    date_echeance: null as string | null,
    statut: 'recu',
    mode_paiement: null as string | null,
    notes: null as string | null,
    compte_charge_code: '606100',
    compte_fournisseur_code: '401000',
    compte_tva_deductible_code: '445660',
  })

  // Écriture comptable liée à la facture sélectionnée (Epic A3)
  const [comptaInfo, setComptaInfo] = useState<{ statut: string; numero_mouvement: number; date_ecriture: string } | null>(null)
  const [comptaLoading, setComptaLoading] = useState(false)
  const [comptaRefreshKey, setComptaRefreshKey] = useState(0)
  const [generatingEcriture, setGeneratingEcriture] = useState(false)

  // TVA tab state
  const [tvaCalcHT, setTvaCalcHT] = useState('')
  const [tvaCalcTaux, setTvaCalcTaux] = useState(20)
  const [tvaPeriod, setTvaPeriod] = useState<'mensuel' | 'trimestriel' | 'annuel'>('trimestriel')

  // Prévisionnel tab state
  const thisYear = new Date().getFullYear()
  const [budgets, setBudgets] = useState<number[]>(Array(12).fill(0))
  const [editBudget, setEditBudget] = useState<number | null>(null)
  const [budgetInput, setBudgetInput] = useState('')

  // Relances state
  const [relancesScenarios, setRelancesScenarios] = useState<RelanceScenario[]>([])
  const [relancesHistorique, setRelancesHistorique] = useState<RelanceHistorique[]>([])
  const [loadingRelances, setLoadingRelances] = useState(false)
  const [showRelanceModal, setShowRelanceModal] = useState(false)
  const [relanceScenarioId, setRelanceScenarioId] = useState('')

  // Journal tab state
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loadingJournal, setLoadingJournal] = useState(false)
  const [journalForm, setJournalForm] = useState({
    date: new Date().toISOString().split('T')[0],
    libelle: '',
    compte: '',
    debit: '',
    credit: '',
  })

  async function loadAll() {
    setLoading(true)
    const [facts, supplierFacts, cls, otList] = await Promise.all([
      supabase.from('factures').select('*').order('date_emission', { ascending: false }),
      supabase.from('compta_factures_fournisseurs').select('*').order('date_facture', { ascending: false }),
      supabase.from('clients').select('id, nom, conditions_paiement, mode_paiement_defaut, taux_tva_defaut, type_echeance, jour_echeance').order('nom'),
      supabase.from('ordres_transport').select('id, reference, client_id, numero_facturation, prix_ht, facturation_id, statut').order('reference'),
    ])
    setList(facts.data ?? [])
    setSupplierInvoices(supplierFacts.data ?? [])
    setClients(cls.data ?? [])
    setOts(otList.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (!selected) { setComptaInfo(null); return }
    if (selected.statut === 'brouillon' || selected.statut === 'annulee') { setComptaInfo(null); return }
    setComptaLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    db
      .from('compta_pieces')
      .select('id')
      .eq('source_table', 'factures')
      .eq('source_id', selected.id)
      .maybeSingle()
      .then(async ({ data: piece }: { data: { id: string } | null }) => {
        if (!piece) { setComptaInfo(null); setComptaLoading(false); return }
        const { data: e } = await db
          .from('compta_ecritures')
          .select('statut, numero_mouvement, date_ecriture')
          .eq('piece_id', piece.id)
          .maybeSingle()
        setComptaInfo(e ? { statut: e.statut, numero_mouvement: e.numero_mouvement, date_ecriture: e.date_ecriture } : null)
        setComptaLoading(false)
      })
  }, [selected?.id, selected?.statut, comptaRefreshKey])

  // ── Chargement scénarios de relance (une fois) ────────────────────────────
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    db.from('relances_scenarios').select('*').eq('actif', true).order('niveau')
      .then(({ data }: { data: RelanceScenario[] | null }) => {
        if (data) {
          setRelancesScenarios(data)
          if (data.length > 0) setRelanceScenarioId(data[0].id)
        }
      })
  }, [])

  // ── Chargement historique relances par facture sélectionnée ───────────────
  useEffect(() => {
    if (!selected) { setRelancesHistorique([]); return }
    setLoadingRelances(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    db.from('relances_historique').select('*').eq('facture_id', selected.id).order('date_envoi', { ascending: false })
      .then(({ data }: { data: RelanceHistorique[] | null }) => {
        setRelancesHistorique(data ?? [])
        setLoadingRelances(false)
      })
  }, [selected?.id])

  // ── Chargement journal manuel ─────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'journal') return
    setLoadingJournal(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    db.from('compta_journal_manuel').select('*').order('date', { ascending: false })
      .then(({ data }: { data: (JournalEntry & { created_by?: string })[] | null }) => {
        setEntries(data ?? [])
        setLoadingJournal(false)
      })
  }, [tab])

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c.nom])), [clients])
  const otMap = useMemo(() => Object.fromEntries(ots.map(o => [o.id, o.reference])), [ots])
  const factureDisplayStateById = useMemo(
    () => Object.fromEntries(list.map(f => [f.id, getFactureDisplayState(f)])),
    [list],
  )
  const factureOtMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    ots.forEach(ot => {
      if (!ot.facturation_id) return
      map[ot.facturation_id] = [...(map[ot.facturation_id] ?? []), ot.reference]
    })
    return map
  }, [ots])
  const fmtEur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
  const fmtPct = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'
  const selectedClient = useMemo(() => clients.find(client => client.id === form.client_id) ?? null, [clients, form.client_id])

  // ── Computed aggregates ───────────────────────────────────────────────────
  const activeList = list.filter(f => f.statut !== 'annulee')
  const activeSupplierInvoices = supplierInvoices.filter(f => f.statut !== 'annulee')
  const selectedDisplayState = selected ? getFactureDisplayState(selected) : null

  const totalCA = useMemo(() => activeList.reduce((s, f) => s + f.montant_ht, 0), [activeList])
  const totalTVACollectee = useMemo(() => activeList.reduce((s, f) => s + (f.montant_tva ?? 0), 0), [activeList])
  const totalEncaisse = useMemo(() => activeList.filter(f => factureDisplayStateById[f.id]?.statut === 'payee').reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0), [activeList, factureDisplayStateById])
  const totalEnAttente = useMemo(() => activeList.filter(f => factureDisplayStateById[f.id]?.statut === 'envoyee').reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0), [activeList, factureDisplayStateById])
  const totalEnRetard = useMemo(() => activeList.filter(f => factureDisplayStateById[f.id]?.statut === 'en_retard').reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0), [activeList, factureDisplayStateById])
  const totalAchatsHt = useMemo(() => activeSupplierInvoices.reduce((sum, facture) => sum + facture.montant_ht, 0), [activeSupplierInvoices])
  const totalAchatsTtc = useMemo(() => activeSupplierInvoices.reduce((sum, facture) => sum + (facture.montant_ttc ?? facture.montant_ht), 0), [activeSupplierInvoices])

  const startOfMonth = useMemo(() => {
    const currentDate = new Date()
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
  }, [])
  const totalPayeeMois = useMemo(() => list
    .filter(f => f.statut === 'payee' && f.date_paiement && f.date_paiement >= startOfMonth)
    .reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0), [list, startOfMonth])

  // Monthly CA (current year)
  const monthlyCA = useMemo(() => {
    const months = Array(12).fill(0)
    activeList.forEach(f => {
      const d = new Date(f.date_emission)
      if (d.getFullYear() === thisYear) months[d.getMonth()] += f.montant_ht
    })
    return months
  }, [activeList, thisYear])

  // Monthly TVA collected (current year)
  const monthlyTVA = useMemo(() => {
    const months = Array(12).fill(0)
    activeList.forEach(f => {
      const d = new Date(f.date_emission)
      if (d.getFullYear() === thisYear) months[d.getMonth()] += (f.montant_tva ?? 0)
    })
    return months
  }, [activeList, thisYear])

  // Monthly encaissé
  const monthlyEncaisse = useMemo(() => {
    const months = Array(12).fill(0)
    list.filter(f => f.statut === 'payee' && f.date_paiement).forEach(f => {
      const d = new Date(f.date_paiement!)
      if (d.getFullYear() === thisYear) months[d.getMonth()] += (f.montant_ttc ?? f.montant_ht)
    })
    return months
  }, [list, thisYear])

  // Quarterly TVA
  const quarterlyTVA = useMemo(() => {
    const q = [0, 0, 0, 0]
    monthlyTVA.forEach((v, i) => { q[Math.floor(i / 3)] += v })
    return q
  }, [monthlyTVA])

  // Top clients
  const topClients = useMemo(() => {
    const map: Record<string, number> = {}
    activeList.filter(f => f.statut === 'payee').forEach(f => {
      map[f.client_id] = (map[f.client_id] ?? 0) + f.montant_ht
    })
    return Object.entries(map)
      .map(([id, ca]) => ({ nom: clientMap[id] ?? 'Inconnu', ca }))
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 5)
  }, [activeList, clientMap])

  // Taux de recouvrement
  const tauxRecouvrement = useMemo(() => {
    const total = list.filter(f => f.statut !== 'brouillon' && f.statut !== 'annulee').reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0)
    return total > 0 ? (totalEncaisse / total) * 100 : 0
  }, [list, totalEncaisse])

  // Upcoming invoices (due in next 30 days)
  const upcoming = useMemo(() => {
    const now = new Date()
    const in30 = new Date(now)
    in30.setDate(in30.getDate() + 30)
    return list.filter(f =>
      factureDisplayStateById[f.id]?.statut === 'envoyee' && f.date_echeance &&
      new Date(f.date_echeance) <= in30 &&
      new Date(f.date_echeance) >= now
    ).sort((a, b) => (a.date_echeance! > b.date_echeance! ? 1 : -1))
  }, [factureDisplayStateById, list])

  // TVA by rate breakdown
  const tvaByRate = useMemo(() => {
    const map: Record<number, { ht: number; tva: number }> = {}
    activeList.forEach(f => {
      const t = f.taux_tva ?? 20
      if (!map[t]) map[t] = { ht: 0, tva: 0 }
      map[t].ht += f.montant_ht
      map[t].tva += (f.montant_tva ?? 0)
    })
    return Object.entries(map).map(([taux, v]) => ({ taux: parseFloat(taux), ...v })).sort((a, b) => b.taux - a.taux)
  }, [activeList])

  // TVA by period for declarations
  const tvaDeclarations = useMemo(() => {
    if (tvaPeriod === 'mensuel') {
      return MOIS_FR.map((label, i) => ({ label, tva: monthlyTVA[i], ht: monthlyCA[i] }))
    }
    if (tvaPeriod === 'trimestriel') {
      return ['T1', 'T2', 'T3', 'T4'].map((label, i) => ({
        label,
        tva: quarterlyTVA[i],
        ht: monthlyCA.slice(i * 3, i * 3 + 3).reduce((s, v) => s + v, 0),
      }))
    }
    // annuel
    return [{ label: String(thisYear), tva: monthlyTVA.reduce((s, v) => s + v, 0), ht: monthlyCA.reduce((s, v) => s + v, 0) }]
  }, [tvaPeriod, monthlyTVA, monthlyCA, quarterlyTVA, thisYear])

  // IS estimation (simplified: 15% up to 42500, 25% above)
  const resultatBrut = totalCA * 0.3 // assuming 30% net margin (simplified)
  const isEstimate = resultatBrut <= 42500
    ? resultatBrut * 0.15
    : 42500 * 0.15 + (resultatBrut - 42500) * 0.25

  // ── Factures tab helpers ────────────────────────────────────────────────────
  const filtered = list.filter(f => {
    const matchSearch =
      f.numero.toLowerCase().includes(search.toLowerCase()) ||
      (clientMap[f.client_id] ?? '').toLowerCase().includes(search.toLowerCase())
    const displayStatut = factureDisplayStateById[f.id]?.statut ?? f.statut
    const matchStatut = filterStatut === 'tous' || displayStatut === filterStatut
    return matchSearch && matchStatut
  })

  function setF<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function applyClientPaymentDefaults(clientId: string, dateEmission: string) {
    const client = clients.find(item => item.id === clientId) ?? null
    setForm(current => ({
      ...current,
      mode_paiement: client?.mode_paiement_defaut ?? null,
      taux_tva: client?.taux_tva_defaut ?? current.taux_tva,
      date_echeance: computeDateEcheance(client, dateEmission),
    }))
    setPaymentDefaultsLocked(true)
    setDueDateDefaultsLocked(true)
    setVatDefaultsLocked(true)
  }

  function syncOtSelectionToForm(otIds: string[]) {
    setForm(current => {
      const linkedOts = ots.filter(item => otIds.includes(item.id))
      const autoMontantHt = linkedOts.reduce((sum, item) => sum + (item.prix_ht ?? 0), 0)
      const shouldAutofillAmount = current.montant_ht <= 0 || current.montant_ht === lastAutoMontantHt
      return {
        ...current,
        ot_id: otIds[0] ?? null,
        montant_ht: shouldAutofillAmount ? autoMontantHt : current.montant_ht,
      }
    })
    setSelectedOtIds(otIds)
    setLastAutoMontantHt(otIds.length > 0 ? otIds.reduce((sum, otId) => sum + (ots.find(item => item.id === otId)?.prix_ht ?? 0), 0) : 0)
  }

  function resetInvoiceForm() {
    setForm({
      client_id: '',
      ot_id: null,
      montant_ht: 0,
      taux_tva: 20,
      date_emission: new Date().toISOString().split('T')[0],
      date_echeance: null,
      statut: 'brouillon',
      mode_paiement: null,
      notes: null,
    })
    setSelectedOtIds([])
    setLastAutoMontantHt(null)
    setPaymentDefaultsLocked(true)
    setDueDateDefaultsLocked(true)
    setVatDefaultsLocked(true)
    setFormError(null)
  }

  function buildFallbackInvoiceNumber(dateEmission: string) {
    const invoiceYear = parseIsoDate(dateEmission).getFullYear()
    const prefix = `FA-${invoiceYear}-`
    const maxForYear = list.reduce((currentMax, facture) => {
      if (!facture.numero.startsWith(prefix)) return currentMax
      const suffix = Number.parseInt(facture.numero.slice(prefix.length), 10)
      return Number.isFinite(suffix) ? Math.max(currentMax, suffix) : currentMax
    }, 0)
    return `${prefix}${String(maxForYear + 1).padStart(4, '0')}`
  }

  function buildFallbackSupplierInvoiceNumber(dateFacture: string) {
    const invoiceYear = parseIsoDate(dateFacture).getFullYear()
    const prefix = `FF-${invoiceYear}-`
    const maxForYear = supplierInvoices.reduce((currentMax, facture) => {
      if (!facture.numero.startsWith(prefix)) return currentMax
      const suffix = Number.parseInt(facture.numero.slice(prefix.length), 10)
      return Number.isFinite(suffix) ? Math.max(currentMax, suffix) : currentMax
    }, 0)
    return `${prefix}${String(maxForYear + 1).padStart(4, '0')}`
  }

  async function openFacturePdf(facture: Pick<Facture, 'numero' | 'pdf_storage_bucket' | 'pdf_storage_path'>) {
    if (!facture.pdf_storage_bucket || !facture.pdf_storage_path) return
    const { data, error } = await supabase.storage.from(facture.pdf_storage_bucket).createSignedUrl(facture.pdf_storage_path, 60)
    if (error) {
      setActionError(`Impossible d'ouvrir le PDF : ${error.message}`)
      return
    }
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const activeClientInvoiceIds = useMemo(
    () => new Set(list.filter(f => f.statut !== 'annulee').map(f => f.id)),
    [list],
  )

  const clientOts = form.client_id
    ? ots.filter(o => o.client_id === form.client_id && (!o.facturation_id || !activeClientInvoiceIds.has(o.facturation_id)))
    : []

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    if (form.date_echeance && form.date_echeance < form.date_emission) {
      setFormError('La date d\'échéance ne peut pas être antérieure à la date d\'émission.')
      return
    }
    for (const otId of selectedOtIds) {
      const contract = getAffretementContractByOtId(otId)
      if (contract) {
        const readiness = evaluateAffretementCompletionReadiness(contract)
        if (!readiness.readyForCompletion) {
          setFormError('Facturation bloquée : les statuts de course affrétée sont incomplets.')
          return
        }
      }
    }
    setSaving(true)
    let insertPayload: typeof form & { numero?: string } = { ...form }
    let { data: insertedFacture, error } = await supabase.from('factures').insert(insertPayload).select('id, numero').single()
    if (error?.message.includes('factures_numero_key')) {
      insertPayload = { ...form, numero: buildFallbackInvoiceNumber(form.date_emission) }
      const retryResult = await supabase.from('factures').insert(insertPayload).select('id, numero').single()
      insertedFacture = retryResult.data
      error = retryResult.error
    }
    if (!error && insertedFacture && selectedOtIds.length > 0) {
      const numeroFacturation = insertedFacture.numero
      const { error: otUpdateError } = await supabase
        .from('ordres_transport')
        .update({ facturation_id: insertedFacture.id, numero_facturation: numeroFacturation })
        .in('id', selectedOtIds)
      if (otUpdateError) {
        setSaving(false)
        setFormError(`Facture créée, mais liaison OT impossible : ${otUpdateError.message}`)
        return
      }
    }
    if (!error && insertedFacture) {
      try {
        const linkedOtRefs = ots.filter(ot => selectedOtIds.includes(ot.id)).map(ot => ot.reference)
        const amountTva = form.montant_ht * (form.taux_tva / 100)
        const amountTtc = form.montant_ht + amountTva
        const pdf = await buildInvoicePdf({
          invoiceNumber: insertedFacture.numero,
          clientName: clientMap[form.client_id] ?? 'Client',
          issueDate: form.date_emission,
          dueDate: form.date_echeance,
          paymentMode: form.mode_paiement ? (MODE_PAIEMENT_LABELS[form.mode_paiement] ?? form.mode_paiement) : null,
          amountHt: form.montant_ht,
          vatRate: form.taux_tva,
          amountTva,
          amountTtc,
          notes: form.notes,
          otReferences: linkedOtRefs,
        })

        const storageBucket = 'factures-documents'
        const storagePath = `${insertedFacture.numero.slice(3, 7)}/${insertedFacture.numero}.pdf`
        const { error: uploadError } = await supabase.storage.from(storageBucket).upload(storagePath, pdf.blob, {
          contentType: 'application/pdf',
          upsert: true,
        })
        if (uploadError) throw uploadError

        const { error: facturePdfError } = await supabase
          .from('factures')
          .update({
            pdf_storage_bucket: storageBucket,
            pdf_storage_path: storagePath,
            pdf_generated_at: new Date().toISOString(),
            pdf_sha256: pdf.checksum,
          })
          .eq('id', insertedFacture.id)
        if (facturePdfError) throw facturePdfError

        const downloadUrl = URL.createObjectURL(pdf.blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = pdf.fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(downloadUrl)
      } catch (pdfError) {
        setSaving(false)
        setShowForm(false)
        resetInvoiceForm()
        loadAll()
        setActionError(`Facture créée, mais PDF impossible : ${pdfError instanceof Error ? pdfError.message : 'erreur inconnue'}`)
        return
      }
    }
    setSaving(false)
    if (error) {
      setFormError(`Erreur lors de la création : ${error.message}`)
      return
    }
    setShowForm(false)
    resetInvoiceForm()
    loadAll()
  }

  async function generateEcriture(factureId: string) {
    setGeneratingEcriture(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc('compta_generer_ecriture_facture', { p_facture_id: factureId })
    setGeneratingEcriture(false)
    if (error) {
      setActionError(`Impossible de générer l'écriture : ${error.message}`)
      return
    }
    setComptaRefreshKey(k => k + 1)
  }

  async function updateStatut(f: Facture, statut: string) {
    setActionError(null)
    const extra: Record<string, string | null> = {}
    if (statut === 'payee') extra.date_paiement = new Date().toISOString().split('T')[0]
    if (statut !== 'payee') extra.date_paiement = null
    const { error } = await supabase.from('factures').update({ statut, ...extra }).eq('id', f.id)
    if (error) {
      setActionError(`Impossible de mettre à jour le statut : ${error.message}`)
      return
    }
    if (selected?.id === f.id) setSelected({ ...f, statut })
    if (statut === 'envoyee' || statut === 'payee') setComptaRefreshKey(k => k + 1)
    loadAll()
  }

  async function cancelInvoice(facture: Facture) {
    if (!confirm(`Annuler la facture ${facture.numero} ?`)) return
    await updateStatut(facture, 'annulee')
  }

  async function submitSupplierInvoice(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setSupplierError(null)
    if (supplierForm.date_echeance && supplierForm.date_echeance < supplierForm.date_facture) {
      setSupplierError('La date d\'échéance fournisseur ne peut pas être antérieure à la date de facture.')
      return
    }
    setSupplierSaving(true)
    const montant_tva = supplierForm.montant_ht * (supplierForm.taux_tva / 100)
    const numero = buildFallbackSupplierInvoiceNumber(supplierForm.date_facture)
    const { error } = await supabase.from('compta_factures_fournisseurs').insert({
      numero,
      fournisseur_nom: supplierForm.fournisseur_nom,
      date_facture: supplierForm.date_facture,
      date_echeance: supplierForm.date_echeance,
      montant_ht: supplierForm.montant_ht,
      montant_tva,
      statut: supplierForm.statut,
      mode_paiement: supplierForm.mode_paiement,
      notes: supplierForm.notes,
      compte_charge_code: supplierForm.compte_charge_code,
      compte_fournisseur_code: supplierForm.compte_fournisseur_code,
      compte_tva_deductible_code: supplierForm.compte_tva_deductible_code,
    })
    setSupplierSaving(false)
    if (error) {
      setSupplierError(`Impossible de créer la facture fournisseur : ${error.message}`)
      return
    }
    setShowSupplierForm(false)
    setSupplierForm({
      fournisseur_nom: '',
      montant_ht: 0,
      taux_tva: 20,
      date_facture: new Date().toISOString().split('T')[0],
      date_echeance: null,
      statut: 'recu',
      mode_paiement: null,
      notes: null,
      compte_charge_code: '606100',
      compte_fournisseur_code: '401000',
      compte_tva_deductible_code: '445660',
    })
    loadAll()
  }

  async function updateSupplierInvoiceStatut(facture: FactureFournisseur, statut: string) {
    setActionError(null)
    const extra: Record<string, string | null> = {}
    if (statut === 'payee') extra.date_paiement = new Date().toISOString().split('T')[0]
    if (statut === 'annulee') extra.date_paiement = null
    const { error } = await supabase
      .from('compta_factures_fournisseurs')
      .update({ statut, ...extra })
      .eq('id', facture.id)
    if (error) {
      setActionError(`Impossible de mettre à jour la facture fournisseur : ${error.message}`)
      return
    }
    loadAll()
  }

  async function sendRelance() {
    if (!selected || !relanceScenarioId) return
    const scenario = relancesScenarios.find(s => s.id === relanceScenarioId)
    if (!scenario) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { error } = await db.from('relances_historique').insert({
      facture_id: selected.id,
      scenario_id: relanceScenarioId,
      niveau: scenario.niveau,
      mode: scenario.type,
      montant_relance: selected.montant_ttc ?? selected.montant_ht,
      statut: 'envoye',
    })
    if (error) { setActionError(`Erreur relance : ${error.message}`); return }
    setShowRelanceModal(false)
    const { data } = await db.from('relances_historique').select('*').eq('facture_id', selected.id).order('date_envoi', { ascending: false })
    setRelancesHistorique(data ?? [])
  }

  function exportCSV() {
    const headers = ['Numéro', 'Client', 'Émission', 'Échéance', 'Montant HT', 'TVA', 'TTC', 'Statut', 'Mode paiement', 'Notes']
    const rows = filtered.map(f => [
      f.numero,
      clientMap[f.client_id] ?? '',
      new Date(f.date_emission).toLocaleDateString('fr-FR'),
      f.date_echeance ? new Date(f.date_echeance).toLocaleDateString('fr-FR') : '',
      f.montant_ht.toFixed(2),
      (f.montant_tva ?? 0).toFixed(2),
      (f.montant_ttc ?? f.montant_ht).toFixed(2),
      STATUT_LABELS[factureDisplayStateById[f.id]?.statut ?? f.statut] ?? factureDisplayStateById[f.id]?.statut ?? f.statut,
      f.mode_paiement ? (MODE_PAIEMENT_LABELS[f.mode_paiement] ?? f.mode_paiement) : '',
      f.notes ?? '',
    ])
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `factures_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Journal helpers ─────────────────────────────────────────────────────────
  async function addEntry(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const debit = parseFloat(journalForm.debit) || 0
    const credit = parseFloat(journalForm.credit) || 0
    if (!journalForm.libelle || !journalForm.compte || (debit === 0 && credit === 0)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: inserted } = await db.from('compta_journal_manuel').insert({
      date: journalForm.date,
      libelle: journalForm.libelle,
      compte: journalForm.compte,
      debit,
      credit,
    }).select().maybeSingle()
    if (inserted) setEntries(prev => [inserted, ...prev])
    setJournalForm(f => ({ ...f, libelle: '', compte: '', debit: '', credit: '' }))
  }

  async function deleteJournalEntry(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('compta_journal_manuel').delete().eq('id', id)
    setEntries(prev => prev.filter(x => x.id !== id))
  }

  async function clearAllJournalEntries() {
    if (!confirm('Effacer toutes les écritures manuelles ?')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('compta_journal_manuel').delete().not('id', 'is', null)
    setEntries([])
  }

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0)
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0)

  // ── TVA calculator ──────────────────────────────────────────────────────────
  const calcHT = parseFloat(tvaCalcHT) || 0
  const calcTVA = calcHT * (tvaCalcTaux / 100)
  const calcTTC = calcHT + calcTVA

  // ── Prévisionnel ────────────────────────────────────────────────────────────
  const totalBudget = budgets.reduce((s, v) => s + v, 0)
  const totalReel = monthlyCA.reduce((s, v) => s + v, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Comptabilité</h2>
          <p className="text-discreet text-sm">{list.length} facture{list.length !== 1 ? 's' : ''} · CA {fmtEur(totalCA)}</p>
        </div>
        {(tab === 'factures' || tab === 'fournisseurs') && (
          <div className="flex gap-2">
            {tab === 'factures' && <button onClick={exportCSV} className="border border-line-strong text-secondary px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-soft transition-colors">
              ↓ CSV
            </button>}
            <button
              onClick={() => {
                if (tab === 'factures') {
                  resetInvoiceForm()
                  setShowForm(true)
                } else {
                  setSupplierError(null)
                  setShowSupplierForm(true)
                }
              }}
              className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              {tab === 'factures' ? '+ Nouvelle facture' : '+ Facture fournisseur'}
            </button>
          </div>
        )}
      </div>

      <TabBar active={tab} onChange={t => { setTab(t); setSelected(null); setActionError(null) }} />

      {actionError && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-4 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ══ TAB: FACTURES ══════════════════════════════════════════════════════ */}
      {tab === 'factures' && (
        <div className="flex gap-6 flex-1 min-h-0">
          <div className={`flex-1 min-w-0 ${selected ? 'hidden lg:block lg:max-w-[55%]' : ''}`}>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <MiniStat label="En attente" value={fmtEur(totalEnAttente)} color="blue" />
              <MiniStat label="En retard" value={fmtEur(totalEnRetard)} color="red" />
              <MiniStat label="Encaissé ce mois" value={fmtEur(totalPayeeMois)} color="green" />
            </div>
            <div className="flex gap-3 mb-4 flex-wrap">
              <input
                type="text"
                placeholder="N° facture ou client..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="px-3 py-2 border border-line rounded-lg text-sm w-52 outline-none focus:ring-2 focus:ring-slate-300"
              />
              <div className="flex gap-1 flex-wrap">
                {['tous', ...Object.keys(STATUT_LABELS)].map(s => (
                  <button key={s} onClick={() => setFilterStatut(s)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterStatut === s ? 'bg-slate-800 text-white' : 'border border-line text-secondary hover:bg-surface-soft'}`}>
                    {s === 'tous' ? 'Toutes' : STATUT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-muted text-sm">Chargement...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted text-sm">
                  {search || filterStatut !== 'tous' ? 'Aucun résultat' : 'Aucune facture enregistrée'}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-surface-soft border-b border-line">
                    <tr>
                      {['Numéro', 'Client', 'Émission', 'Échéance', 'Montant HT', 'TTC', 'Statut', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-discreet uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f, i) => {
                      const displayState = factureDisplayStateById[f.id] ?? getFactureDisplayState(f)
                      return (
                        <tr key={f.id} onClick={() => setSelected(f)}
                          className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50 transition-colors ${selected?.id === f.id ? 'bg-blue-50' : i % 2 !== 0 ? 'bg-surface-soft' : ''}`}>
                          <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{f.numero}</td>
                          <td className="px-4 py-3 text-foreground">{clientMap[f.client_id] ?? '—'}</td>
                          <td className="px-4 py-3 text-secondary">{new Date(f.date_emission).toLocaleDateString('fr-FR')}</td>
                          <td className={`px-4 py-3 ${displayState.isLate ? 'text-red-600 font-semibold' : 'text-secondary'}`}>
                            <div className="flex flex-col">
                              <span>{f.date_echeance ? new Date(f.date_echeance).toLocaleDateString('fr-FR') : '—'}</span>
                              {displayState.retardJours > 0 && <span className="text-[11px] font-medium text-red-600">{displayState.retardJours} j de retard</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-foreground">{fmtEur(f.montant_ht)}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{f.montant_ttc != null ? fmtEur(f.montant_ttc) : '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUT_COLORS[displayState.statut] ?? 'bg-surface-2 text-secondary'}`}>
                              {STATUT_LABELS[displayState.statut] ?? displayState.statut}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <select
                                value={f.statut}
                                onClick={ev => ev.stopPropagation()}
                                onChange={ev => { ev.stopPropagation(); void updateStatut(f, ev.target.value) }}
                                className="rounded-md border border-line px-2 py-1 text-xs text-secondary"
                              >
                                {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                              {f.statut !== 'annulee' && (
                                <button onClick={ev => { ev.stopPropagation(); void cancelInvoice(f) }} className="text-xs text-muted hover:text-red-500 transition-colors">Annuler</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {selected && (
            <div className="w-full lg:w-[42%] shrink-0">
              <div className="bg-surface rounded-xl border border-line shadow-sm">
                <div className="flex items-start justify-between p-5 border-b">
                  <div>
                    <p className="text-xs font-mono text-muted mb-0.5">{selected.numero}</p>
                    <h3 className="text-lg font-bold text-foreground">{clientMap[selected.client_id] ?? '—'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_COLORS[selectedDisplayState?.statut ?? selected.statut] ?? 'bg-surface-2 text-secondary'}`}>
                        {STATUT_LABELS[selectedDisplayState?.statut ?? selected.statut] ?? selectedDisplayState?.statut ?? selected.statut}
                      </span>
                      {selectedDisplayState && selectedDisplayState.retardJours > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-600">
                          {selectedDisplayState.retardJours} j de retard
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-muted hover:text-secondary text-lg leading-none">✕</button>
                </div>
                <div className="px-5 py-3 border-b bg-surface-soft">
                  <p className="text-xs font-medium text-discreet mb-2">Changer le statut</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(STATUT_LABELS).map(([k, v]) => (
                      <button key={k} onClick={() => updateStatut(selected, k)} disabled={selected.statut === k}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${selected.statut === k ? 'bg-slate-200 text-discreet cursor-default' : 'border border-line text-secondary hover:bg-surface hover:shadow-sm'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4 text-sm">
                  <Info label="OT lié" value={factureOtMap[selected.id]?.join(', ') ?? (selected.ot_id ? otMap[selected.ot_id] : null)} />
                  <Info label="Date d'émission" value={new Date(selected.date_emission).toLocaleDateString('fr-FR')} />
                  <Info label="Date d'échéance" value={selected.date_echeance ? new Date(selected.date_echeance).toLocaleDateString('fr-FR') : null} />
                  <Info label="Date de paiement" value={selected.date_paiement ? new Date(selected.date_paiement).toLocaleDateString('fr-FR') : null} />
                  <Info label="Mode de paiement" value={selected.mode_paiement ? MODE_PAIEMENT_LABELS[selected.mode_paiement] ?? selected.mode_paiement : null} />
                  <div className="col-span-2 border-t pt-4 mt-1">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-discreet">Montant HT</span><span className="font-medium text-foreground">{fmtEur(selected.montant_ht)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-discreet">TVA ({selected.taux_tva}%)</span><span className="text-secondary">{fmtEur(selected.montant_tva ?? 0)}</span></div>
                      <div className="flex justify-between text-sm border-t pt-2 mt-1"><span className="font-semibold text-foreground">Total TTC</span><span className="font-bold text-heading text-base">{fmtEur(selected.montant_ttc ?? selected.montant_ht)}</span></div>
                    </div>
                  </div>
                  {selected.notes && <div className="col-span-2"><span className="text-xs font-medium text-discreet">Notes</span><p className="text-secondary mt-0.5">{selected.notes}</p></div>}
                  {(selected.statut === 'envoyee' || selected.statut === 'payee') && (
                    <div className="col-span-2 border-t pt-4 mt-1">
                      {selected.pdf_storage_bucket && selected.pdf_storage_path && (
                        <div className="mb-3 flex items-center justify-between rounded-lg border border-line bg-surface-soft px-3 py-2">
                          <div>
                            <p className="text-xs font-medium text-secondary">PDF facture archivé</p>
                            <p className="text-xs text-muted">Document numéroté généré pour le suivi</p>
                          </div>
                          <button onClick={() => void openFacturePdf(selected)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors">Ouvrir le PDF</button>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-discreet">Écriture comptable</p>
                        <button
                          onClick={() => setComptaRefreshKey(k => k + 1)}
                          className="text-xs text-muted hover:text-secondary transition-colors"
                          title="Actualiser"
                        >↻</button>
                      </div>
                      {comptaLoading ? (
                        <p className="text-xs text-muted">Vérification...</p>
                      ) : comptaInfo ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ Générée</span>
                          <span className="text-xs text-discreet">Mouvement VT-{comptaInfo.numero_mouvement} · {new Date(comptaInfo.date_ecriture).toLocaleDateString('fr-FR')}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${comptaInfo.statut === 'validee' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                            {comptaInfo.statut === 'validee' ? 'Validée' : 'Brouillon'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-start flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">⏳ Aucune écriture</span>
                            <span className="text-xs text-muted">Le trigger DB devrait l'avoir créée automatiquement</span>
                          </div>
                          <button
                            onClick={() => void generateEcriture(selected.id)}
                            disabled={generatingEcriture}
                            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {generatingEcriture ? 'Génération...' : "Générer l'écriture manuellement"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {/* ── Relances ── */}
                  {(selected.statut === 'en_retard' || selected.statut === 'envoyee') && (
                    <div className="col-span-2 border-t pt-4 mt-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-discreet">Relances</p>
                        <button
                          onClick={() => setShowRelanceModal(true)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                        >+ Envoyer une relance</button>
                      </div>
                      {loadingRelances ? (
                        <p className="text-xs text-muted">Chargement...</p>
                      ) : relancesHistorique.length === 0 ? (
                        <p className="text-xs text-muted italic">Aucune relance envoyée</p>
                      ) : (
                        <div className="space-y-1.5">
                          {relancesHistorique.map(r => (
                            <div key={r.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">N{r.niveau}</span>
                                <span className="text-secondary">{new Date(r.date_envoi).toLocaleDateString('fr-FR')}</span>
                                <span className="text-muted capitalize">{r.mode}</span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded font-medium ${
                                r.statut === 'envoye' ? 'bg-green-100 text-green-700'
                                : r.statut === 'echec' ? 'bg-red-100 text-red-600'
                                : 'bg-surface-2 text-discreet'
                              }`}>
                                {r.statut === 'envoye' ? 'Enregistrée' : r.statut === 'echec' ? 'Échec' : 'Annulée'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: TVA & TAXES ════════════════════════════════════════════════════ */}
      {tab === 'tva' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="CA HT total" value={fmtEur(totalCA)} color="slate" />
            <MiniStat label="TVA collectée" value={fmtEur(totalTVACollectee)} color="blue" />
            <MiniStat label="Résultat brut estimé" value={fmtEur(resultatBrut)} color="green" sub="Marge 30% estimée" />
            <MiniStat label="IS estimé" value={fmtEur(isEstimate)} color="amber" sub="15% / 25% selon seuil" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calculateur TVA */}
            <div className="bg-surface rounded-xl border border-line p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Calculateur TVA</h3>
              <div className="space-y-3">
                <Field label="Montant HT (€)">
                  <input className={inp} type="number" step="0.01" value={tvaCalcHT} onChange={e => setTvaCalcHT(e.target.value)} placeholder="0.00" />
                </Field>
                <Field label="Taux TVA">
                  <select className={inp} value={tvaCalcTaux} onChange={e => setTvaCalcTaux(parseFloat(e.target.value))}>
                    {TAUX_TVA_OPTIONS.map(t => <option key={t} value={t}>{t} %</option>)}
                  </select>
                </Field>
              </div>
              {calcHT > 0 && (
                <div className="mt-4 bg-surface-soft rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-secondary"><span>Montant HT</span><span className="font-medium">{fmtEur(calcHT)}</span></div>
                  <div className="flex justify-between text-secondary"><span>TVA {tvaCalcTaux} %</span><span>{fmtEur(calcTVA)}</span></div>
                  <div className="flex justify-between font-bold text-foreground border-t pt-2"><span>Total TTC</span><span className="text-lg">{fmtEur(calcTTC)}</span></div>
                </div>
              )}
              {/* TVA par taux */}
              {tvaByRate.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-discreet uppercase tracking-wide mb-2">Répartition par taux</p>
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-muted border-b border-slate-100">
                      <th className="text-left py-1.5">Taux</th>
                      <th className="text-right py-1.5">Base HT</th>
                      <th className="text-right py-1.5">TVA</th>
                    </tr></thead>
                    <tbody>
                      {tvaByRate.map(r => (
                        <tr key={r.taux} className="border-b border-slate-50">
                          <td className="py-1.5 text-foreground">{r.taux} %</td>
                          <td className="py-1.5 text-right text-secondary">{fmtEur(r.ht)}</td>
                          <td className="py-1.5 text-right font-medium text-foreground">{fmtEur(r.tva)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Déclarations TVA */}
            <div className="bg-surface rounded-xl border border-line p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Déclarations TVA — {thisYear}</h3>
                <div className="flex gap-1">
                  {(['mensuel', 'trimestriel', 'annuel'] as const).map(p => (
                    <button key={p} onClick={() => setTvaPeriod(p)}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${tvaPeriod === p ? 'bg-slate-800 text-white' : 'border border-line text-secondary hover:bg-surface-soft'}`}>
                      {p === 'mensuel' ? 'Mensuel' : p === 'trimestriel' ? 'Trim.' : 'Annuel'}
                    </button>
                  ))}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted border-b border-slate-100">
                  <th className="text-left py-1.5">Période</th>
                  <th className="text-right py-1.5">CA HT</th>
                  <th className="text-right py-1.5">TVA collectée</th>
                  <th className="text-right py-1.5">Statut</th>
                </tr></thead>
                <tbody>
                  {tvaDeclarations.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-surface-soft">
                      <td className="py-2 font-medium text-foreground">{row.label}</td>
                      <td className="py-2 text-right text-secondary">{fmtEur(row.ht)}</td>
                      <td className="py-2 text-right font-medium text-foreground">{fmtEur(row.tva)}</td>
                      <td className="py-2 text-right">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${row.tva > 0 ? 'bg-amber-50 text-amber-700' : 'bg-surface-2 text-muted'}`}>
                          {row.tva > 0 ? 'À déclarer' : 'Néant'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* IS summary */}
              <div className="mt-5 pt-4 border-t space-y-2">
                <p className="text-xs font-semibold text-discreet uppercase tracking-wide">Simulation IS {thisYear}</p>
                <div className="flex justify-between text-sm text-secondary"><span>CA total HT</span><span>{fmtEur(totalCA)}</span></div>
                <div className="flex justify-between text-sm text-secondary"><span>Résultat estimé (30%)</span><span>{fmtEur(resultatBrut)}</span></div>
                <div className="flex justify-between text-sm text-secondary"><span>Tranche 15% (≤ 42 500 €)</span><span>{fmtEur(Math.min(resultatBrut, 42500) * 0.15)}</span></div>
                {resultatBrut > 42500 && <div className="flex justify-between text-sm text-secondary"><span>Tranche 25% (au-delà)</span><span>{fmtEur((resultatBrut - 42500) * 0.25)}</span></div>}
                <div className="flex justify-between text-sm font-bold text-foreground border-t pt-2"><span>IS estimé</span><span>{fmtEur(isEstimate)}</span></div>
                <p className="text-[11px] text-amber-600 italic mt-2">⚠ Simulation indicative uniquement — marge nette hypothétique 30%, sans charges réelles. Consultez votre expert-comptable.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: TRÉSORERIE ═════════════════════════════════════════════════════ */}
      {tab === 'tresorerie' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Encaissé total" value={fmtEur(totalEncaisse)} color="green" />
            <MiniStat label="En attente" value={fmtEur(totalEnAttente)} color="blue" />
            <MiniStat label="En retard" value={fmtEur(totalEnRetard)} color="red" />
            <MiniStat label="Taux recouvrement" value={fmtPct(tauxRecouvrement)} color={tauxRecouvrement >= 80 ? 'green' : tauxRecouvrement >= 50 ? 'amber' : 'red'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Flux mensuel encaissé */}
            <div className="bg-surface rounded-xl border border-line p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Flux encaissé mensuel — {thisYear}</h3>
              <BarChart
                data={MOIS_FR.map((label, i) => ({ label, value: monthlyEncaisse[i] }))}
                height={140}
                color="#10b981"
              />
              <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                <span className="text-discreet">Total encaissé {thisYear}</span>
                <span className="font-semibold text-foreground">{fmtEur(monthlyEncaisse.reduce((s, v) => s + v, 0))}</span>
              </div>
            </div>

            {/* Taux de recouvrement visuel */}
            <div className="bg-surface rounded-xl border border-line p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Recouvrement & balance</h3>
              <div className="space-y-4">
                {[
                  { label: 'Encaissé', value: totalEncaisse, color: 'bg-emerald-500' },
                  { label: 'En attente', value: totalEnAttente, color: 'bg-blue-400' },
                  { label: 'En retard', value: totalEnRetard, color: 'bg-red-400' },
                ].map(row => {
                  const total = totalEncaisse + totalEnAttente + totalEnRetard
                  const pct = total > 0 ? (row.value / total) * 100 : 0
                  return (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-secondary">{row.label}</span>
                        <span className="font-medium text-foreground">{fmtEur(row.value)} <span className="text-muted font-normal">({pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${row.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Upcoming */}
              {upcoming.length > 0 && (
                <div className="mt-5 pt-4 border-t">
                  <p className="text-xs font-semibold text-discreet uppercase tracking-wide mb-2">Échéances dans 30 jours ({upcoming.length})</p>
                  <div className="space-y-1.5">
                    {upcoming.slice(0, 5).map(f => (
                      <div key={f.id} className="flex justify-between items-center text-sm">
                        <div>
                          <span className="font-mono text-xs text-discreet">{f.numero}</span>
                          <span className="ml-2 text-foreground">{clientMap[f.client_id] ?? '—'}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-foreground">{fmtEur(f.montant_ttc ?? f.montant_ht)}</span>
                          <span className="ml-2 text-xs text-amber-600">{new Date(f.date_echeance!).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tableau CA vs encaissé */}
          <div className="bg-surface rounded-xl border border-line p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">CA facturé vs encaissé par mois — {thisYear}</h3>
            <div className="flex gap-4 mb-3">
              <div className="flex items-center gap-2 text-xs text-discreet"><div className="w-3 h-3 rounded bg-slate-700" />CA facturé</div>
              <div className="flex items-center gap-2 text-xs text-discreet"><div className="w-3 h-3 rounded bg-emerald-400" />Encaissé</div>
            </div>
            <DualBarChart
              data={MOIS_FR.map((label, i) => ({ label, a: monthlyCA[i], b: monthlyEncaisse[i] }))}
              height={140}
            />
          </div>
        </div>
      )}

      {/* ══ TAB: PRÉVISIONNEL ═══════════════════════════════════════════════════ */}
      {tab === 'previsionnel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Budget annuel" value={fmtEur(totalBudget)} color="slate" />
            <MiniStat label="CA réel" value={fmtEur(totalReel)} color="green" />
            <MiniStat label="Écart" value={fmtEur(totalReel - totalBudget)} color={totalReel >= totalBudget ? 'green' : 'red'} />
            <MiniStat label="Avancement" value={totalBudget > 0 ? fmtPct((totalReel / totalBudget) * 100) : '—'} color="blue" />
          </div>

          {/* Visual comparison */}
          <div className="bg-surface rounded-xl border border-line p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">Budget vs Réel — {thisYear}</h3>
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2 text-xs text-discreet"><div className="w-3 h-3 rounded bg-slate-700" />Budget</div>
              <div className="flex items-center gap-2 text-xs text-discreet"><div className="w-3 h-3 rounded bg-emerald-400" />Réel</div>
            </div>
            <DualBarChart
              data={MOIS_FR.map((label, i) => ({ label, a: budgets[i], b: monthlyCA[i] }))}
              height={160}
            />
          </div>

          {/* Table budget */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="p-4 border-b bg-surface-soft flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Tableau budgétaire mensuel</p>
              <p className="text-xs text-muted">Cliquez sur un budget pour le modifier</p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted border-b border-slate-100 bg-surface-soft">
                <th className="text-left px-4 py-2.5">Mois</th>
                <th className="text-right px-4 py-2.5">Budget</th>
                <th className="text-right px-4 py-2.5">CA réel</th>
                <th className="text-right px-4 py-2.5">Écart</th>
                <th className="text-right px-4 py-2.5">%</th>
              </tr></thead>
              <tbody>
                {MOIS_FR.map((mois, i) => {
                  const ecart = monthlyCA[i] - budgets[i]
                  const pct = budgets[i] > 0 ? (monthlyCA[i] / budgets[i]) * 100 : null
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-surface-soft">
                      <td className="px-4 py-2.5 font-medium text-foreground">{mois} {thisYear}</td>
                      <td className="px-4 py-2.5 text-right text-secondary">
                        {editBudget === i ? (
                          <form onSubmit={e => { e.preventDefault(); const v = parseFloat(budgetInput) || 0; setBudgets(b => b.map((x, j) => j === i ? v : x)); setEditBudget(null) }} className="inline">
                            <input autoFocus type="number" step="100" value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                              onBlur={() => { const v = parseFloat(budgetInput) || 0; setBudgets(b => b.map((x, j) => j === i ? v : x)); setEditBudget(null) }}
                              className="w-28 px-2 py-0.5 border border-blue-300 rounded text-right text-sm outline-none" />
                          </form>
                        ) : (
                          <button onClick={() => { setEditBudget(i); setBudgetInput(String(budgets[i])) }}
                            className="hover:bg-surface-2 px-2 py-0.5 rounded transition-colors">
                            {fmtEur(budgets[i])}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">{fmtEur(monthlyCA[i])}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${ecart > 0 ? 'text-emerald-600' : ecart < 0 ? 'text-red-500' : 'text-muted'}`}>
                        {ecart > 0 ? '+' : ''}{fmtEur(ecart)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {pct !== null ? (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${pct >= 100 ? 'bg-green-100 text-green-700' : pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                            {pct.toFixed(0)} %
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t-2 border-line bg-surface-soft">
                <tr>
                  <td className="px-4 py-3 font-bold text-foreground">TOTAL</td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">{fmtEur(totalBudget)}</td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">{fmtEur(totalReel)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${totalReel >= totalBudget ? 'text-emerald-600' : 'text-red-500'}`}>
                    {totalReel - totalBudget > 0 ? '+' : ''}{fmtEur(totalReel - totalBudget)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">
                    {totalBudget > 0 ? fmtPct((totalReel / totalBudget) * 100) : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Projection annuelle */}
          <div className="bg-surface rounded-xl border border-line p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Projection annuelle</h3>
            {(() => {
              const moisCoules = new Date().getMonth() + 1
              const moyenneMensuelle = moisCoules > 0 ? totalReel / moisCoules : 0
              const projection = moyenneMensuelle * 12
              const resteAFaire = projection - totalReel
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="bg-surface-soft rounded-lg p-3"><p className="text-xs text-discreet">Mois écoulés</p><p className="font-bold text-foreground text-lg">{moisCoules}</p></div>
                  <div className="bg-surface-soft rounded-lg p-3"><p className="text-xs text-discreet">Moyenne / mois</p><p className="font-bold text-foreground text-lg">{fmtEur(moyenneMensuelle)}</p></div>
                  <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs text-blue-600">CA projeté {thisYear}</p><p className="font-bold text-blue-800 text-lg">{fmtEur(projection)}</p></div>
                  <div className="bg-emerald-50 rounded-lg p-3"><p className="text-xs text-emerald-600">Reste à facturer</p><p className="font-bold text-emerald-800 text-lg">{fmtEur(Math.max(0, resteAFaire))}</p></div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ══ TAB: RAPPORTS ═══════════════════════════════════════════════════════ */}
      {tab === 'rapports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Factures émises" value={String(list.filter(f => f.statut !== 'annulee').length)} color="slate" />
            <MiniStat label="CA moyen / facture" value={list.filter(f => f.statut !== 'annulee').length > 0 ? fmtEur(totalCA / list.filter(f => f.statut !== 'annulee').length) : '—'} color="blue" />
            <MiniStat label="Délai moyen paiement" value="—" color="slate" sub="Données insuffisantes" />
            <MiniStat label="Taux impayés" value={fmtPct(totalEnRetard > 0 ? (totalEnRetard / (totalEncaisse + totalEnAttente + totalEnRetard)) * 100 : 0)} color={totalEnRetard > 0 ? 'red' : 'green'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CA mensuel */}
            <div className="bg-surface rounded-xl border border-line p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">CA HT mensuel — {thisYear}</h3>
              <BarChart
                data={MOIS_FR.map((label, i) => ({ label, value: monthlyCA[i] }))}
                height={140}
                color="#334155"
              />
              <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-xs text-discreet">
                <div><span className="block font-semibold text-foreground">{fmtEur(Math.max(...monthlyCA))}</span>Meilleur mois</div>
                <div><span className="block font-semibold text-foreground">{fmtEur(monthlyCA.filter(v => v > 0).reduce((s, v, _, a) => s + v / a.length, 0))}</span>Moyenne</div>
                <div><span className="block font-semibold text-foreground">{fmtEur(totalCA)}</span>Total {thisYear}</div>
              </div>
            </div>

            {/* TVA trimestrielle */}
            <div className="bg-surface rounded-xl border border-line p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">TVA collectée par trimestre — {thisYear}</h3>
              <BarChart
                data={['T1', 'T2', 'T3', 'T4'].map((label, i) => ({ label, value: quarterlyTVA[i] }))}
                height={140}
                color="#3b82f6"
              />
              <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                <span className="text-discreet">TVA totale {thisYear}</span>
                <span className="font-semibold text-foreground">{fmtEur(totalTVACollectee)}</span>
              </div>
            </div>
          </div>

          {/* Top clients */}
          <div className="bg-surface rounded-xl border border-line p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Top clients par CA encaissé</h3>
            {topClients.length === 0 ? (
              <p className="text-sm text-muted">Aucune donnée disponible</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((c, i) => {
                  const pct = topClients[0].ca > 0 ? (c.ca / topClients[0].ca) * 100 : 0
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted w-4">#{i + 1}</span>
                      <span className="text-sm text-foreground w-40 truncate">{c.nom}</span>
                      <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-700 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-foreground text-right w-28">{fmtEur(c.ca)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Répartition statuts */}
          <div className="bg-surface rounded-xl border border-line p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Répartition des factures par statut</h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {Object.entries(STATUT_LABELS).map(([k, v]) => {
                const count = list.filter(f => f.statut === k).length
                const pct = list.length > 0 ? (count / list.length) * 100 : 0
                return (
                  <div key={k} className={`rounded-lg border p-3 ${STATUT_COLORS[k] ?? 'bg-surface-2 text-secondary'}`}>
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-xs mt-0.5 opacity-80">{v}</p>
                    <p className="text-xs mt-1 opacity-60">{pct.toFixed(0)} %</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: JOURNAL ════════════════════════════════════════════════════════ */}
      {tab === 'journal' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Total débit" value={fmtEur(totalDebit)} color="slate" />
            <MiniStat label="Total crédit" value={fmtEur(totalCredit)} color="slate" />
            <MiniStat label="Balance" value={fmtEur(totalDebit - totalCredit)} color={Math.abs(totalDebit - totalCredit) < 0.01 ? 'green' : 'amber'} sub={Math.abs(totalDebit - totalCredit) < 0.01 ? 'Équilibrée' : 'À équilibrer'} />
          </div>

          {/* Saisie */}
          <div className="bg-surface rounded-xl border border-line p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Saisie d'écriture</h3>
            <form onSubmit={addEntry} className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <Field label="Date">
                <input className={inp} type="date" value={journalForm.date} onChange={e => setJournalForm(f => ({ ...f, date: e.target.value }))} required />
              </Field>
              <div className="lg:col-span-2">
                <Field label="Libellé">
                  <input className={inp} value={journalForm.libelle} onChange={e => setJournalForm(f => ({ ...f, libelle: e.target.value }))} placeholder="Description de l'opération" required />
                </Field>
              </div>
              <Field label="Compte">
                <select className={inp} value={journalForm.compte} onChange={e => setJournalForm(f => ({ ...f, compte: e.target.value }))} required>
                  <option value="">Sélectionner...</option>
                  {COMPTES_COMPTABLES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Débit (€)">
                  <input className={inp} type="number" step="0.01" value={journalForm.debit} onChange={e => setJournalForm(f => ({ ...f, debit: e.target.value, credit: '' }))} placeholder="0.00" />
                </Field>
                <Field label="Crédit (€)">
                  <input className={inp} type="number" step="0.01" value={journalForm.credit} onChange={e => setJournalForm(f => ({ ...f, credit: e.target.value, debit: '' }))} placeholder="0.00" />
                </Field>
              </div>
              <button type="submit" className="lg:col-span-5 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                Ajouter l'écriture
              </button>
            </form>
          </div>

          {/* Journal entries table */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="p-4 border-b bg-surface-soft flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Journal comptable ({entries.length} écriture{entries.length !== 1 ? 's' : ''})</p>
              {entries.length > 0 && (
                <button onClick={() => void clearAllJournalEntries()} className="text-xs text-muted hover:text-red-500 transition-colors">Effacer tout</button>
              )}
            </div>
            {loadingJournal ? (
              <div className="p-8 text-center text-muted text-sm">Chargement...</div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">Aucune écriture saisie. Utilisez le formulaire ci-dessus pour commencer.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-soft border-b border-line">
                  <tr>
                    {['Date', 'Libellé', 'Compte', 'Débit', 'Crédit', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-discreet uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.id} className={`border-t border-slate-100 ${i % 2 !== 0 ? 'bg-surface-soft' : ''}`}>
                      <td className="px-4 py-2.5 text-secondary">{new Date(e.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2.5 text-foreground">{e.libelle}</td>
                      <td className="px-4 py-2.5 text-discreet text-xs font-mono">{e.compte}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">{e.debit > 0 ? fmtEur(e.debit) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">{e.credit > 0 ? fmtEur(e.credit) : '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => void deleteJournalEntry(e.id)} className="text-xs text-muted hover:text-red-500 transition-colors">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-line bg-surface-soft">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-xs font-bold text-secondary uppercase">Totaux</td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">{fmtEur(totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">{fmtEur(totalCredit)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'fournisseurs' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Le rapprochement bancaire automatique client et fournisseur sera consolidé ici avec la trésorerie. La base existe déjà côté rapprochements bancaires et statuts de paiement.
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Factures fournisseur" value={String(supplierInvoices.length)} color="slate" />
            <MiniStat label="Achats HT" value={fmtEur(totalAchatsHt)} color="amber" />
            <MiniStat label="Achats TTC" value={fmtEur(totalAchatsTtc)} color="red" />
            <MiniStat label="A payer" value={fmtEur(supplierInvoices.filter(f => ['recu', 'validee'].includes(f.statut)).reduce((sum, f) => sum + (f.montant_ttc ?? f.montant_ht), 0))} color="blue" />
          </div>
          <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted text-sm">Chargement...</div>
            ) : supplierInvoices.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">Aucune facture fournisseur enregistrée.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-soft border-b border-line">
                  <tr>
                    {['Numéro', 'Fournisseur', 'Date', 'Échéance', 'HT', 'TTC', 'Statut', 'Mode paiement'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-discreet uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {supplierInvoices.map((f, index) => (
                    <tr key={f.id} className={`border-t border-slate-100 ${index % 2 !== 0 ? 'bg-surface-soft' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{f.numero}</td>
                      <td className="px-4 py-3 text-foreground">{f.fournisseur_nom}</td>
                      <td className="px-4 py-3 text-secondary">{new Date(f.date_facture).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3 text-secondary">{f.date_echeance ? new Date(f.date_echeance).toLocaleDateString('fr-FR') : '—'}</td>
                      <td className="px-4 py-3 text-foreground">{fmtEur(f.montant_ht)}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{fmtEur(f.montant_ttc ?? f.montant_ht)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={f.statut}
                          onChange={ev => void updateSupplierInvoiceStatut(f, ev.target.value)}
                          className={`rounded-md border px-2 py-1 text-xs font-medium ${FOURN_STATUT_COLORS[f.statut] ?? 'bg-surface-2 text-secondary'}`}
                        >
                          {Object.entries(FOURN_STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-secondary">{f.mode_paiement ? (MODE_PAIEMENT_LABELS[f.mode_paiement] ?? f.mode_paiement) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: TARIFS TRANSPORT ══════════════════════════════════════════════ */}
      {tab === 'tarifs' && <TarifsTransportTab clients={clients} />}

      {/* ══ MODAL: Relance ══════════════════════════════════════════════════════ */}
      {showRelanceModal && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-base font-semibold">Envoyer une relance</h3>
              <button onClick={() => setShowRelanceModal(false)} className="text-muted hover:text-secondary">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-secondary">Facture <span className="font-mono font-medium">{selected.numero}</span> — {clientMap[selected.client_id] ?? '—'}</p>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Scénario de relance</label>
                <select value={relanceScenarioId} onChange={e => setRelanceScenarioId(e.target.value)} className={inp}>
                  {relancesScenarios.map(s => (
                    <option key={s.id} value={s.id}>Niveau {s.niveau} — {s.nom} (+{s.delai_apres_echeance}j)</option>
                  ))}
                </select>
              </div>
              {relancesScenarios.find(s => s.id === relanceScenarioId)?.corps_template && (
                <div className="bg-surface-soft rounded-lg p-3 text-xs text-secondary whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {(relancesScenarios.find(s => s.id === relanceScenarioId)?.corps_template ?? '')
                    .replace('{{numero}}', selected.numero)
                    .replace('{{montant}}', fmtEur(selected.montant_ttc ?? selected.montant_ht))
                    .replace('{{echeance}}', selected.date_echeance ? new Date(selected.date_echeance).toLocaleDateString('fr-FR') : '—')
                  }
                </div>
              )}
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button onClick={() => setShowRelanceModal(false)} className="px-3 py-1.5 border rounded-lg text-sm text-secondary hover:bg-surface-soft">Annuler</button>
              <button
                onClick={() => void sendRelance()}
                disabled={!relanceScenarioId}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >Enregistrer la relance</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Nouvelle facture ═════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-base font-semibold">Nouvelle facture</h3>
              <button onClick={() => { setShowForm(false); resetInvoiceForm() }} className="text-muted hover:text-secondary">✕</button>
            </div>
            <form onSubmit={submit} className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Client *">
                    <select className={inp} value={form.client_id} onChange={e => {
                      const clientId = e.target.value
                      setF('client_id', clientId)
                      syncOtSelectionToForm([])
                      applyClientPaymentDefaults(clientId, form.date_emission)
                      setFormError(null)
                    }} required>
                      <option value="">Sélectionner un client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </Field>
                </div>
                {selectedClient && (
                  <div className="col-span-2 rounded-xl border border-line bg-surface-soft px-3 py-2 text-xs text-secondary">
                    Paiement client par défaut : {selectedClient.mode_paiement_defaut ? (MODE_PAIEMENT_LABELS[selectedClient.mode_paiement_defaut] ?? selectedClient.mode_paiement_defaut) : 'Non renseigné'} · TVA {selectedClient.taux_tva_defaut ?? form.taux_tva}% · {selectedClient.conditions_paiement ?? 0} j · {selectedClient.type_echeance ? (TYPE_ECHEANCE_LABELS[selectedClient.type_echeance] ?? selectedClient.type_echeance) : 'Standard'}{selectedClient.type_echeance === 'jour_fixe' && selectedClient.jour_echeance ? ` (${selectedClient.jour_echeance})` : ''}
                    <span className="ml-2 text-muted">{paymentDefaultsLocked && dueDateDefaultsLocked && vatDefaultsLocked ? 'Auto-appliqué' : 'Modifié sur cette facture'}</span>
                  </div>
                )}
                <div className="col-span-2">
                  <Field label="OT liés (optionnel)">
                    <div className={`rounded-lg border ${!form.client_id ? 'bg-surface-soft border-line' : 'border-line'} px-3 py-2`}>
                      {!form.client_id ? (
                        <p className="text-sm text-muted">Sélectionner d'abord un client</p>
                      ) : clientOts.length === 0 ? (
                        <p className="text-sm text-muted">Aucun OT disponible pour ce client</p>
                      ) : (
                        <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                          {clientOts.map(o => {
                            const contract = getAffretementContractByOtId(o.id)
                            const readiness = contract ? evaluateAffretementCompletionReadiness(contract) : null
                            const blocked = Boolean(contract && !readiness?.readyForCompletion)
                            return (
                              <label key={o.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${blocked ? 'border-slate-100 bg-surface-soft text-muted' : 'border-line hover:bg-surface-soft text-foreground'}`}>
                                <input
                                  type="checkbox"
                                  className="mt-0.5"
                                  checked={selectedOtIds.includes(o.id)}
                                  disabled={blocked}
                                  onChange={e => {
                                    const nextOtIds = e.target.checked
                                      ? [...selectedOtIds, o.id]
                                      : selectedOtIds.filter(id => id !== o.id)
                                    syncOtSelectionToForm(nextOtIds)
                                    setFormError(null)
                                  }}
                                />
                                <span className="flex-1">
                                  <span className="block font-medium">{contract ? '[AFF] ' : ''}{o.reference}</span>
                                  <span className="block text-xs text-discreet">
                                    {o.prix_ht != null ? `${fmtEur(o.prix_ht)} HT` : 'Prix HT non renseigné'}{blocked ? ' · statuts incomplets' : ''}
                                  </span>
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </Field>
                </div>
                {formError && <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">{formError}</div>}
                <Field label="Montant HT (€) *">
                  <input className={inp} type="number" step="0.01" value={form.montant_ht || ''} onChange={e => { setF('montant_ht', parseFloat(e.target.value) || 0); setLastAutoMontantHt(null) }} required />
                </Field>
                <Field label="TVA (%)">
                  <select className={inp} value={form.taux_tva} onChange={e => { setVatDefaultsLocked(false); setF('taux_tva', parseFloat(e.target.value)) }}>
                    {TAUX_TVA_OPTIONS.map(t => <option key={t} value={t}>{t} %</option>)}
                  </select>
                </Field>
                <Field label="Date d'émission">
                  <input className={inp} type="date" value={form.date_emission} onChange={e => {
                    const nextDate = e.target.value
                    setF('date_emission', nextDate)
                    if (dueDateDefaultsLocked) {
                      setF('date_echeance', computeDateEcheance(selectedClient, nextDate))
                    }
                  }} />
                </Field>
                <Field label="Date d'échéance">
                  <input className={inp} type="date" value={form.date_echeance ?? ''} onChange={e => { setDueDateDefaultsLocked(false); setF('date_echeance', e.target.value || null) }} />
                </Field>
                <Field label="Statut">
                  <select className={inp} value={form.statut} onChange={e => setF('statut', e.target.value)}>
                    {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Mode de paiement">
                  <select className={inp} value={form.mode_paiement ?? ''} onChange={e => { setPaymentDefaultsLocked(false); setF('mode_paiement', e.target.value || null) }}>
                    <option value="">—</option>
                    {Object.entries(MODE_PAIEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="Notes"><textarea className={`${inp} resize-none h-16`} value={form.notes ?? ''} onChange={e => setF('notes', e.target.value || null)} /></Field>
                </div>
                {form.montant_ht > 0 && (
                  <div className="col-span-2 bg-surface-soft rounded-lg p-3 text-sm">
                    <div className="flex justify-between text-secondary"><span>HT</span><span>{fmtEur(form.montant_ht)}</span></div>
                    <div className="flex justify-between text-secondary"><span>TVA {form.taux_tva}%</span><span>{fmtEur(form.montant_ht * form.taux_tva / 100)}</span></div>
                    <div className="flex justify-between font-bold text-foreground border-t pt-1.5 mt-1.5"><span>TTC</span><span>{fmtEur(form.montant_ht * (1 + form.taux_tva / 100))}</span></div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
                <button type="button" onClick={() => { setShowForm(false); resetInvoiceForm() }} className="px-4 py-2 text-sm border border-line rounded-lg hover:bg-surface-soft">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Créer la facture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSupplierForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-base font-semibold">Nouvelle facture fournisseur</h3>
              <button onClick={() => { setShowSupplierForm(false); setSupplierError(null) }} className="text-muted hover:text-secondary">✕</button>
            </div>
            <form onSubmit={submitSupplierInvoice} className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Fournisseur *">
                    <input className={inp} value={supplierForm.fournisseur_nom} onChange={e => setSupplierForm(current => ({ ...current, fournisseur_nom: e.target.value }))} required />
                  </Field>
                </div>
                {supplierError && <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">{supplierError}</div>}
                <Field label="Montant HT (€) *">
                  <input className={inp} type="number" step="0.01" value={supplierForm.montant_ht || ''} onChange={e => setSupplierForm(current => ({ ...current, montant_ht: parseFloat(e.target.value) || 0 }))} required />
                </Field>
                <Field label="TVA (%)">
                  <select className={inp} value={supplierForm.taux_tva} onChange={e => setSupplierForm(current => ({ ...current, taux_tva: parseFloat(e.target.value) }))}>
                    {TAUX_TVA_OPTIONS.map(t => <option key={t} value={t}>{t} %</option>)}
                  </select>
                </Field>
                <Field label="Date de facture">
                  <input className={inp} type="date" value={supplierForm.date_facture} onChange={e => setSupplierForm(current => ({ ...current, date_facture: e.target.value }))} />
                </Field>
                <Field label="Date d'échéance">
                  <input className={inp} type="date" value={supplierForm.date_echeance ?? ''} onChange={e => setSupplierForm(current => ({ ...current, date_echeance: e.target.value || null }))} />
                </Field>
                <Field label="Statut">
                  <select className={inp} value={supplierForm.statut} onChange={e => setSupplierForm(current => ({ ...current, statut: e.target.value }))}>
                    {Object.entries(FOURN_STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Mode de paiement">
                  <select className={inp} value={supplierForm.mode_paiement ?? ''} onChange={e => setSupplierForm(current => ({ ...current, mode_paiement: e.target.value || null }))}>
                    <option value="">—</option>
                    {Object.entries(MODE_PAIEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="Notes">
                    <textarea className={`${inp} resize-none h-16`} value={supplierForm.notes ?? ''} onChange={e => setSupplierForm(current => ({ ...current, notes: e.target.value || null }))} />
                  </Field>
                </div>
                {supplierForm.montant_ht > 0 && (
                  <div className="col-span-2 bg-surface-soft rounded-lg p-3 text-sm">
                    <div className="flex justify-between text-secondary"><span>HT</span><span>{fmtEur(supplierForm.montant_ht)}</span></div>
                    <div className="flex justify-between text-secondary"><span>TVA {supplierForm.taux_tva}%</span><span>{fmtEur(supplierForm.montant_ht * supplierForm.taux_tva / 100)}</span></div>
                    <div className="flex justify-between font-bold text-foreground border-t pt-1.5 mt-1.5"><span>TTC</span><span>{fmtEur(supplierForm.montant_ht * (1 + supplierForm.taux_tva / 100))}</span></div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
                <button type="button" onClick={() => { setShowSupplierForm(false); setSupplierError(null) }} className="px-4 py-2 text-sm border border-line rounded-lg hover:bg-surface-soft">Annuler</button>
                <button type="submit" disabled={supplierSaving} className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {supplierSaving ? 'Enregistrement...' : 'Créer la facture fournisseur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
