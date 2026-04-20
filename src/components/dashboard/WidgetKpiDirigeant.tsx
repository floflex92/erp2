import { supabase } from '@/lib/supabase'
import { ST_EN_COURS, ST_TERMINE } from '@/lib/transportCourses'
import { useAsyncData } from '@/hooks/useAsyncData'
import { SkeletonKpi } from '@/components/ui/SkeletonKpi'
import { DataState } from '@/components/ui/DataState'

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone: 'blue' | 'green' | 'amber' | 'red' | 'violet'
}) {
  const accent = {
    blue: '#2563EB',
    green: '#16A34A',
    amber: '#D97706',
    red: '#DC2626',
    violet: '#2563EB',
  }[tone]

  return (
    <div className="nx-kpi-card px-4 py-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <p className="nx-kpi-label">{label}</p>
      </div>
      <p className="mt-2 nx-kpi-value">{value}</p>
      <p className="mt-1 nx-kpi-meta">{sub}</p>
    </div>
  )
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M EUR`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k EUR`
  return `${n} EUR`
}

export function WidgetKpiDirigeant() {
  const { data, loading, error, refresh } = useAsyncData(
    ['kpi-dirigeant'],
    async () => {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [margeRes, otRes, enCoursRes] = await Promise.all([
        supabase
          .from('vue_marge_ot')
          .select('chiffre_affaires, marge_brute, statut, date_livraison_prevue')
          .gte('created_at', startOfMonth),
        supabase
          .from('ordres_transport')
          .select('statut_transport, date_livraison_prevue')
          .gte('created_at', startOfMonth),
        supabase
          .from('ordres_transport')
          .select('id')
          .in('statut_transport', ST_EN_COURS),
      ])

      const margeRows = margeRes.data ?? []
      const otRows = otRes.data ?? []
      const nowStr = new Date().toISOString()

      const ca = margeRows.reduce((s, r) => s + (r.chiffre_affaires ?? 0), 0)
      const marge = margeRows.reduce((s, r) => s + (r.marge_brute ?? 0), 0)
      const nbOt = otRows.length
      const nbRetard = otRows.filter(r => ST_EN_COURS.includes(r.statut_transport as never) && r.date_livraison_prevue && r.date_livraison_prevue < nowStr).length
      const nbLivres = otRows.filter(r => ST_TERMINE.includes(r.statut_transport as never)).length

      return {
        ca_mois: ca,
        marge_mois: marge,
        nb_ot_mois: nbOt,
        nb_ot_retard: nbRetard,
        nb_ot_en_cours: enCoursRes.data?.length ?? 0,
        nb_livres: nbLivres,
      }
    },
    { ttl: 60_000 },
  )

  if (loading) {
    return (
      <DataState.Loading>
        <SkeletonKpi count={6} cols={3} />
      </DataState.Loading>
    )
  }

  if (error) {
    return <DataState.Error message={error} onRetry={refresh} />
  }

  const d = data ?? { ca_mois: 0, marge_mois: 0, nb_ot_mois: 0, nb_ot_retard: 0, nb_ot_en_cours: 0, nb_livres: 0 }
  const tauxMarge = d.ca_mois > 0 ? ((d.marge_mois / d.ca_mois) * 100).toFixed(1) : '-'

  return (
    <div className="nx-fadein grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
      <KpiCard label="CA CE MOIS" value={fmt(d.ca_mois)} sub="Chiffre d'affaires HT" tone="blue" />
      <KpiCard label="MARGE BRUTE" value={`${tauxMarge}%`} sub={`${fmt(d.marge_mois)} net`} tone="green" />
      <KpiCard label="OT CE MOIS" value={String(d.nb_ot_mois)} sub={`${d.nb_livres} livres`} tone="violet" />
      <KpiCard label="EN COURS" value={String(d.nb_ot_en_cours)} sub="Missions actives" tone="blue" />
      <KpiCard label="EN RETARD" value={String(d.nb_ot_retard)} sub="Livraison depassee" tone={d.nb_ot_retard > 0 ? 'red' : 'green'} />
      <KpiCard label="LIVRES CE MOIS" value={String(d.nb_livres)} sub="Missions terminees" tone="green" />
    </div>
  )
}
