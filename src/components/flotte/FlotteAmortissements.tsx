import { useState, useMemo } from 'react'
import {
  computeFleetDepreciationSummary,
  computeAssetDepreciation,
  type AssetDepreciationInput,
  type AssetDepreciationResult,
  type MethodeAmortissement,
} from '@/lib/fleetDepreciation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FleetAssetLite {
  id: string
  immatriculation: string
  marque?: string | null
  modele?: string | null
  type: 'vehicule' | 'remorque'
  cout_achat_ht?: number | null
  date_achat?: string | null
  date_mise_en_circulation?: string | null
  km_actuel?: number | null
}

interface FlotteAmortissementsProps {
  vehicules: FleetAssetLite[]
  remorques: FleetAssetLite[]
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const METHODE_LABELS: Record<MethodeAmortissement, string> = {
  lineaire: 'Linéaire',
  degressif: 'Dégressif fiscal',
  unites_production: 'Unités de production (km)',
}

const DUREES_VEHICULE = [
  { label: '3 ans (36 mois)', value: 36 },
  { label: '4 ans (48 mois)', value: 48 },
  { label: '5 ans (60 mois)', value: 60 },
  { label: '6 ans (72 mois)', value: 72 },
  { label: '7 ans (84 mois)', value: 84 },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtEur(v: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

function fmtEurPrecis(v: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v)
}

function fmtPct(v: number): string {
  return `${v.toFixed(1)} %`
}

function statusColor(tauxAmorti: number, moisRestants: number): string {
  if (moisRestants === 0) return 'text-slate-400'
  if (tauxAmorti >= 80) return 'text-orange-600'
  if (tauxAmorti >= 50) return 'text-amber-600'
  return 'text-emerald-700'
}

function vncBgBar(tauxAmorti: number): string {
  if (tauxAmorti >= 80) return 'bg-orange-400'
  if (tauxAmorti >= 50) return 'bg-amber-400'
  return 'bg-sky-500'
}

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

function MetricKpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'amber' | 'red' | 'emerald' | 'default' }) {
  const cls = tone === 'amber' ? 'text-amber-700' : tone === 'red' ? 'text-red-600' : tone === 'emerald' ? 'text-emerald-700' : 'text-slate-800'
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${cls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

interface DetailRowProps {
  asset: AssetDepreciationResult
  methode: MethodeAmortissement
  duree: number
  valRes: string
  kmMensuels: string
  onChangeMethode: (v: MethodeAmortissement) => void
  onChangeDuree: (v: number) => void
  onChangeValRes: (v: string) => void
  onChangeKmMensuels: (v: string) => void
}

function DetailPanel({ asset, methode, duree, valRes, kmMensuels, onChangeMethode, onChangeDuree, onChangeValRes, onChangeKmMensuels }: DetailRowProps) {
  const [tab, setTab] = useState<'resume' | 'plan'>('resume')

  const planVisible = asset.plan.slice(0, 60)

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mt-2 space-y-4">
      {/* Paramètres */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Méthode</label>
          <select
            value={methode}
            onChange={e => onChangeMethode(e.target.value as MethodeAmortissement)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            {(Object.entries(METHODE_LABELS) as Array<[MethodeAmortissement, string]>).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Durée</label>
          <select
            value={duree}
            onChange={e => onChangeDuree(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            {DUREES_VEHICULE.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Valeur résid. (€ HT)</label>
          <input
            type="number"
            min="0"
            value={valRes}
            onChange={e => onChangeValRes(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
        {methode === 'unites_production' && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Km/mois moy.</label>
            <input
              type="number"
              min="0"
              value={kmMensuels}
              onChange={e => onChangeKmMensuels(e.target.value)}
              placeholder="5000"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        )}
      </div>

      {/* Warnings */}
      {asset.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 space-y-0.5">
          {asset.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
        </div>
      )}

      {/* Onglets résumé / plan */}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        {(['resume', 'plan'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${tab === t ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {t === 'resume' ? 'Résumé' : `Plan (${asset.plan.length} mois)`}
          </button>
        ))}
      </div>

      {tab === 'resume' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniKpi label="VNC actuelle" value={fmtEur(asset.vncActuelle)} />
          <MiniKpi label="Dotation/mois" value={fmtEur(asset.dotationMensuelle)} />
          <MiniKpi label="Dotation/an" value={fmtEur(asset.dotationAnnuelle)} />
          <MiniKpi
            label="Coût amorti/km"
            value={asset.coutAmortissementParKm != null ? `${asset.coutAmortissementParKm.toFixed(3)} €/km` : '—'}
          />
          <MiniKpi label="Taux annuel" value={fmtPct(asset.tauxAmortissementAnnuelPct)} />
          <MiniKpi label="% amorti" value={fmtPct(asset.tauxAmortiPct)} />
          <MiniKpi label="Mois restants" value={asset.moisRestants > 0 ? `${asset.moisRestants} mois` : '✓ Soldé'} />
          <MiniKpi label="Fin prévisionnelle" value={asset.dateFinEstimee ? new Date(asset.dateFinEstimee).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '—'} />
        </div>
      )}

      {tab === 'plan' && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-500 uppercase tracking-wide text-[10px]">
              <tr>
                <th className="px-3 py-2 text-left">Période</th>
                <th className="px-3 py-2 text-right">Dotation HT</th>
                <th className="px-3 py-2 text-right">Cumulé</th>
                <th className="px-3 py-2 text-right">VNC</th>
                <th className="px-3 py-2 text-right">% amorti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {planVisible.map(p => {
                const isToday = p.periode === new Date().toISOString().slice(0, 7)
                return (
                  <tr key={p.periode} className={isToday ? 'bg-blue-50 font-semibold' : 'hover:bg-slate-50'}>
                    <td className="px-3 py-1.5 text-slate-700">{p.label}{isToday && <span className="ml-1 text-[9px] text-blue-600 font-bold">◀ Auj.</span>}</td>
                    <td className="px-3 py-1.5 text-right text-slate-600">{fmtEurPrecis(p.dotationHt)}</td>
                    <td className="px-3 py-1.5 text-right text-slate-600">{fmtEur(p.amortissementCumule)}</td>
                    <td className="px-3 py-1.5 text-right font-medium text-slate-800">{fmtEur(p.vncHt)}</td>
                    <td className="px-3 py-1.5 text-right text-slate-500">{fmtPct(p.tauxAmortissementPct)}</td>
                  </tr>
                )
              })}
              {asset.plan.length > 60 && (
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-slate-400 text-center text-[10px]">
                    … {asset.plan.length - 60} mois supplémentaires non affichés
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-800">{value}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function FlotteAmortissements({ vehicules, remorques }: FlotteAmortissementsProps) {
  const allAssets = useMemo<FleetAssetLite[]>(() => [
    ...vehicules.map(v => ({ ...v, type: 'vehicule' as const })),
    ...remorques.map(r => ({ ...r, type: 'remorque' as const })),
  ], [vehicules, remorques])

  // Paramètres par actif (locaux, non persistés)
  const [params, setParams] = useState<Record<string, {
    methode: MethodeAmortissement
    duree: number
    valRes: string
    kmMensuels: string
  }>>({})

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'vehicule' | 'remorque'>('all')
  const [filterSansCoût, setFilterSansCoût] = useState(false)
  const [sortBy, setSortBy] = useState<'label' | 'vnc' | 'taux' | 'dotation'>('label')

  function getParams(id: string, type: 'vehicule' | 'remorque') {
    return params[id] ?? {
      methode: 'lineaire' as MethodeAmortissement,
      duree: type === 'remorque' ? 84 : 60,
      valRes: '0',
      kmMensuels: '5000',
    }
  }

  function setParam<K extends 'methode' | 'duree' | 'valRes' | 'kmMensuels'>(
    id: string,
    type: 'vehicule' | 'remorque',
    key: K,
    value: (typeof params)[string][K],
  ) {
    setParams(prev => ({
      ...prev,
      [id]: { ...getParams(id, type), [key]: value },
    }))
  }

  // Inputs des calculs
  const inputs = useMemo<AssetDepreciationInput[]>(() => {
    return allAssets
      .filter(a => a.cout_achat_ht && a.cout_achat_ht > 0)
      .map(a => {
        const p = getParams(a.id, a.type)
        return {
          id: a.id,
          label: `${a.immatriculation}${a.marque ? ` — ${a.marque}` : ''}${a.modele ? ` ${a.modele}` : ''}`,
          type: a.type,
          coutAchatHt: a.cout_achat_ht!,
          dateAchat: a.date_achat ?? null,
          dateMiseEnCirculation: a.date_mise_en_circulation ?? null,
          valeurResiduelleHt: p.valRes ? Number(p.valRes) : 0,
          dureeMois: p.duree,
          methode: p.methode,
          kmActuel: a.km_actuel,
          kmMensuels: p.kmMensuels ? Number(p.kmMensuels) : 5000,
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAssets, params])

  const summary = useMemo(() => computeFleetDepreciationSummary(inputs), [inputs])

  // Actifs sans coût renseigné
  const assetsWithoutCost = allAssets.filter(a => !a.cout_achat_ht || a.cout_achat_ht <= 0)

  // Filtre + tri
  const filteredResults = useMemo(() => {
    let list = [...summary.assets]
    if (filterType !== 'all') list = list.filter(r => r.type === filterType)
    if (sortBy === 'vnc') list.sort((a, b) => b.vncActuelle - a.vncActuelle)
    else if (sortBy === 'taux') list.sort((a, b) => b.tauxAmortiPct - a.tauxAmortiPct)
    else if (sortBy === 'dotation') list.sort((a, b) => b.dotationMensuelle - a.dotationMensuelle)
    else list.sort((a, b) => a.label.localeCompare(b.label))
    return list
  }, [summary.assets, filterType, sortBy])

  const hasSummary = summary.assets.length > 0

  return (
    <div className="space-y-6">

      {/* ─── KPIs flotte ─── */}
      {hasSummary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricKpi
            label="Valeur brute flotte"
            value={fmtEur(summary.totalCoutAchatHt)}
            sub={`${summary.assets.length} actif${summary.assets.length > 1 ? 's' : ''} évalués`}
          />
          <MetricKpi
            label="VNC actuelle"
            value={fmtEur(summary.totalVncActuelle)}
            sub={`${fmtPct((summary.totalVncActuelle / (summary.totalCoutAchatHt || 1)) * 100)} de la valeur brute`}
            tone={summary.totalVncActuelle / (summary.totalCoutAchatHt || 1) < 0.2 ? 'amber' : 'default'}
          />
          <MetricKpi
            label="Dotation mensuelle"
            value={fmtEur(summary.dotationMensuelleTotale)}
            sub={`${fmtEur(summary.dotationAnnuelleTotale)} / an`}
          />
          <MetricKpi
            label="Taux moyen amorti"
            value={fmtPct(summary.tauxMoyenAmortiPct)}
            sub={`${summary.nbAmortisTotal} soldé${summary.nbAmortisTotal > 1 ? 's' : ''} · ${summary.nbEnCours} en cours`}
            tone={summary.tauxMoyenAmortiPct > 80 ? 'amber' : 'default'}
          />
        </div>
      )}

      {/* ─── Avertissement actifs sans coût ─── */}
      {assetsWithoutCost.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-start gap-2">
          <span className="shrink-0 text-base">⚠</span>
          <div>
            <p className="font-semibold">{assetsWithoutCost.length} actif{assetsWithoutCost.length > 1 ? 's' : ''} sans coût d'achat renseigné</p>
            <p className="mt-0.5 text-xs text-amber-600">
              {assetsWithoutCost.slice(0, 5).map(a => a.immatriculation).join(', ')}
              {assetsWithoutCost.length > 5 && '…'}
              {' '}— renseignez le coût d'achat HT dans la fiche véhicule pour inclure ces actifs.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFilterSansCoût(v => !v)}
            className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${filterSansCoût ? 'bg-amber-700 text-white' : 'border border-amber-400 text-amber-700 hover:bg-amber-100'}`}
          >
            {filterSansCoût ? 'Masquer' : 'Voir liste'}
          </button>
        </div>
      )}

      {filterSansCoût && assetsWithoutCost.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide text-[10px]">
              <tr>
                <th className="px-4 py-2 text-left">Actif</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Date achat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assetsWithoutCost.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-2 font-medium text-slate-800">{a.immatriculation}{a.marque ? ` — ${a.marque}` : ''}</td>
                  <td className="px-4 py-2 text-slate-500">{a.type === 'remorque' ? 'Remorque' : 'Véhicule'}</td>
                  <td className="px-4 py-2 text-slate-400">{a.date_achat ? new Date(a.date_achat).toLocaleDateString('fr-FR') : 'Non renseignée'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Contrôles tableau ─── */}
      {hasSummary && (
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'vehicule', 'remorque'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${filterType === t ? 'bg-slate-800 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-100'}`}
            >
              {t === 'all' ? 'Tous' : t === 'vehicule' ? 'Véhicules' : 'Remorques'}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Trier par</span>
            {(['label', 'vnc', 'taux', 'dotation'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSortBy(s)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${sortBy === s ? 'bg-slate-200 text-slate-800 font-semibold' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {s === 'label' ? 'Nom' : s === 'vnc' ? 'VNC' : s === 'taux' ? '% amorti' : 'Dotation'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Tableau des actifs ─── */}
      {filteredResults.length > 0 ? (
        <div className="space-y-2">
          {filteredResults.map(asset => {
            const assetRaw = allAssets.find(a => a.id === asset.id)
            if (!assetRaw) return null
            const p = getParams(asset.id, asset.type)
            const isExpanded = expandedId === asset.id

            return (
              <div key={asset.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Ligne principale */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : asset.id)}
                  className="w-full text-left px-4 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                >
                  {/* Type badge */}
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${asset.type === 'remorque' ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-700'}`}>
                    {asset.type === 'remorque' ? 'REM' : 'VEH'}
                  </span>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{asset.label}</p>
                    <p className="text-[10px] text-slate-400">
                      {METHODE_LABELS[asset.methode]} · {asset.dureeMois} mois
                      {asset.dateFinEstimee && ` · fin ${new Date(asset.dateFinEstimee).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`}
                    </p>
                  </div>

                  {/* VNC + barre */}
                  <div className="hidden sm:flex flex-col items-end w-36 shrink-0">
                    <span className="text-xs font-bold text-slate-800">{fmtEur(asset.vncActuelle)}</span>
                    <span className="text-[10px] text-slate-400">VNC actuelle</span>
                    <div className="mt-1 w-full h-1.5 rounded-full bg-slate-200">
                      <div
                        className={`h-1.5 rounded-full transition-all ${vncBgBar(asset.tauxAmortiPct)}`}
                        style={{ width: `${Math.max(100 - asset.tauxAmortiPct, 1)}%` }}
                      />
                    </div>
                  </div>

                  {/* Taux amorti */}
                  <div className="hidden md:flex flex-col items-end w-24 shrink-0">
                    <span className={`text-sm font-bold ${statusColor(asset.tauxAmortiPct, asset.moisRestants)}`}>
                      {fmtPct(asset.tauxAmortiPct)}
                    </span>
                    <span className="text-[10px] text-slate-400">% amorti</span>
                  </div>

                  {/* Dotation mensuelle */}
                  <div className="hidden lg:flex flex-col items-end w-28 shrink-0">
                    <span className="text-sm font-semibold text-slate-700">{fmtEur(asset.dotationMensuelle)}</span>
                    <span className="text-[10px] text-slate-400">/ mois</span>
                  </div>

                  {/* Coût/km */}
                  <div className="hidden xl:flex flex-col items-end w-24 shrink-0">
                    <span className="text-sm font-semibold text-slate-600">
                      {asset.coutAmortissementParKm != null ? `${asset.coutAmortissementParKm.toFixed(3)} €` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400">/ km</span>
                  </div>

                  {/* Expand arrow */}
                  <svg
                    className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Panneau détail */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <DetailPanel
                      asset={computeAssetDepreciation({
                        id: assetRaw.id,
                        label: asset.label,
                        type: assetRaw.type,
                        coutAchatHt: assetRaw.cout_achat_ht!,
                        dateAchat: assetRaw.date_achat ?? null,
                        dateMiseEnCirculation: assetRaw.date_mise_en_circulation ?? null,
                        valeurResiduelleHt: p.valRes ? Number(p.valRes) : 0,
                        dureeMois: p.duree,
                        methode: p.methode,
                        kmActuel: assetRaw.km_actuel,
                        kmMensuels: p.kmMensuels ? Number(p.kmMensuels) : 5000,
                      })}
                      methode={p.methode}
                      duree={p.duree}
                      valRes={p.valRes}
                      kmMensuels={p.kmMensuels}
                      onChangeMethode={v => setParam(asset.id, asset.type, 'methode', v)}
                      onChangeDuree={v => setParam(asset.id, asset.type, 'duree', v)}
                      onChangeValRes={v => setParam(asset.id, asset.type, 'valRes', v)}
                      onChangeKmMensuels={v => setParam(asset.id, asset.type, 'kmMensuels', v)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : !hasSummary ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-400 text-sm">
          Aucun véhicule ou remorque avec un coût d'achat renseigné.
          <br />
          <span className="text-xs">Renseignez le champ "Coût d'achat HT" dans chaque fiche véhicule.</span>
        </div>
      ) : (
        <div className="text-center py-4 text-slate-400 text-sm">Aucun résultat pour ce filtre.</div>
      )}

      {/* ─── Note explicative ─── */}
      {hasSummary && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-600">À propos des calculs</p>
          <p>• <strong>Linéaire</strong> : dotation constante = (Prix achat − Valeur résiduelle) ÷ durée.</p>
          <p>• <strong>Dégressif fiscal</strong> : taux linéaire × coefficient légal (1,25 × pour ≤3 ans, 1,75 × pour 4-5 ans, 2,25 × pour ≥6 ans). Bascule en linéaire résiduel quand le linéaire devient supérieur.</p>
          <p>• <strong>Unités de production</strong> : dotation = (Prix amorti ÷ km vie estimée) × km/mois.</p>
          <p>• Le <strong>coût amorti/km</strong> est calculé sur les km réels au compteur depuis la date d'achat.</p>
          <p>• Ces calculs sont indicatifs. Consultez votre expert-comptable pour la comptabilisation officielle (PCG, compte 681).</p>
        </div>
      )}
    </div>
  )
}
