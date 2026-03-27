import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

type VueMarge = Tables<'vue_marge_ot'>

interface KPIs {
  conducteursActifs: number
  vehiculesEnService: number
  otsEnCours: number
  otLivresThisMonth: number
  caThisMonth: number
  margeBruteThisMonth: number
  facturesEnAttente: number
  montantFacturesEnAttente: number
}

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

export default function Dashboard() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [recentOTs, setRecentOTs] = useState<VueMarge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [conds, vehs, otsEnCours, marges, factures] = await Promise.all([
      supabase.from('conducteurs').select('id', { count: 'exact', head: true }).eq('statut', 'actif'),
      supabase.from('vehicules').select('id', { count: 'exact', head: true }).eq('statut', 'disponible'),
      supabase.from('ordres_transport').select('id', { count: 'exact', head: true }).eq('statut', 'en_cours'),
      supabase.from('vue_marge_ot').select('*').gte('created_at', startOfMonth).order('created_at', { ascending: false }),
      supabase.from('factures').select('id, montant_ht').eq('statut', 'envoyee'),
    ])

    const margesData = marges.data ?? []
    const facturesData = factures.data ?? []

    const livresMonth = margesData.filter(m => m.statut === 'livre' || m.statut === 'facture')
    const caMonth = livresMonth.reduce((s, m) => s + (m.chiffre_affaires ?? 0), 0)
    const margeMonth = livresMonth.reduce((s, m) => s + (m.marge_brute ?? 0), 0)
    const montantEnAttente = facturesData.reduce((s, f) => s + (f.montant_ht ?? 0), 0)

    setKpis({
      conducteursActifs: conds.count ?? 0,
      vehiculesEnService: vehs.count ?? 0,
      otsEnCours: otsEnCours.count ?? 0,
      otLivresThisMonth: livresMonth.length,
      caThisMonth: caMonth,
      margeBruteThisMonth: margeMonth,
      facturesEnAttente: facturesData.length,
      montantFacturesEnAttente: montantEnAttente,
    })
    setRecentOTs(margesData.slice(0, 10))
    setLoading(false)
  }

  const fmtEur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const monthName = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tableau de bord</h2>
          <p className="text-slate-500 text-sm capitalize">{monthName}</p>
        </div>
        <button onClick={loadDashboard} className="text-sm text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
          Actualiser
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 text-sm py-12">Chargement...</div>
      ) : (
        <>
          {/* KPI Cards — row 1: operations */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <KpiCard
              label="Conducteurs actifs"
              value={kpis?.conducteursActifs ?? 0}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              }
              color="blue"
            />
            <KpiCard
              label="Véhicules disponibles"
              value={kpis?.vehiculesEnService ?? 0}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              }
              color="slate"
            />
            <KpiCard
              label="OT en cours"
              value={kpis?.otsEnCours ?? 0}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              }
              color="yellow"
            />
            <KpiCard
              label="Livrés ce mois"
              value={kpis?.otLivresThisMonth ?? 0}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
              }
              color="green"
            />
          </div>

          {/* KPI Cards — row 2: finance */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <KpiCard
              label="CA ce mois (HT)"
              value={fmtEur(kpis?.caThisMonth ?? 0)}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              }
              color="green"
              large
            />
            <KpiCard
              label="Marge brute ce mois"
              value={fmtEur(kpis?.margeBruteThisMonth ?? 0)}
              subtitle={kpis?.caThisMonth ? `${Math.round((kpis.margeBruteThisMonth / kpis.caThisMonth) * 100)}% de marge` : undefined}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              }
              color="purple"
              large
            />
            <KpiCard
              label="Factures en attente"
              value={kpis?.facturesEnAttente ?? 0}
              subtitle={kpis?.montantFacturesEnAttente ? fmtEur(kpis.montantFacturesEnAttente) : undefined}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
              }
              color="orange"
              large
            />
            <KpiCard
              label="Taux de marge moyen"
              value={kpis?.caThisMonth ? `${Math.round((kpis.margeBruteThisMonth / kpis.caThisMonth) * 100)}%` : '—'}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              }
              color="slate"
              large
            />
          </div>

          {/* Recent OTs table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-sm font-semibold text-slate-700">OT récents — {monthName}</h3>
            </div>
            {recentOTs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Aucun OT ce mois-ci</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Référence', 'Client', 'Statut', 'CA HT', 'Coûts', 'Marge', 'Taux'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOTs.map((ot, i) => {
                    const taux = ot.taux_marge_pct ?? 0
                    const tauxColor = taux < 0 ? 'text-red-600 font-semibold' : taux < 15 ? 'text-orange-500 font-semibold' : 'text-green-600 font-semibold'
                    return (
                      <tr key={ot.id ?? i} className={`border-t border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                        <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{ot.reference ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{ot.client ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_COLORS[ot.statut ?? ''] ?? 'bg-slate-100 text-slate-600'}`}>
                            {STATUT_LABELS[ot.statut ?? ''] ?? ot.statut ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{ot.chiffre_affaires != null ? fmtEur(ot.chiffre_affaires) : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{ot.total_couts != null ? fmtEur(ot.total_couts) : '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{ot.marge_brute != null ? fmtEur(ot.marge_brute) : '—'}</td>
                        <td className={`px-4 py-3 ${tauxColor}`}>{ot.taux_marge_pct != null ? `${Math.round(ot.taux_marge_pct)}%` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   text: 'text-blue-700' },
  slate:  { bg: 'bg-slate-100', icon: 'text-slate-500',  text: 'text-slate-700' },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-500', text: 'text-yellow-700' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-500',  text: 'text-green-700' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-500', text: 'text-purple-700' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-500', text: 'text-orange-700' },
}

function KpiCard({
  label, value, subtitle, icon, color = 'slate', large,
}: {
  label: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color?: keyof typeof COLOR_MAP
  large?: boolean
}) {
  const c = COLOR_MAP[color]
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <span className={c.icon}>{icon}</span>
        </div>
      </div>
      <p className={`${large ? 'text-2xl' : 'text-3xl'} font-bold text-slate-800 mt-3`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      <p className="text-slate-500 text-sm mt-1">{label}</p>
    </div>
  )
}
