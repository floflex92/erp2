import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Prospect {
  id: string
  nom_entreprise: string
  statut: string
  montant_mensuel_estime: number | null
  commercial_nom: string | null
  secteur: string | null
  type_transport: string | null
  updated_at: string
}

const STATUT_META: Record<string, { label: string; color: string; order: number }> = {
  lead: { label: 'Lead', color: 'bg-surface-2 text-secondary', order: 0 },
  qualification: { label: 'Qualification', color: 'bg-blue-50 text-blue-700', order: 1 },
  devis_envoye: { label: 'Devis envoye', color: 'nx-status-warning', order: 2 },
  negociation: { label: 'Negociation', color: 'nx-status-warning', order: 3 },
  closing: { label: 'Closing', color: 'nx-status-warning', order: 4 },
  gagne: { label: 'Gagne', color: 'nx-status-success', order: 5 },
  perdu: { label: 'Perdu', color: 'nx-status-error', order: 6 },
}

function fmt(n: number | null) {
  if (!n) return '-'
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k EUR/mois`
  return `${n} EUR/mois`
}

export function WidgetPipelineProspects() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState<string>('actifs')

  useEffect(() => {
    (supabase
      .from('prospects' as any)
      .select('id, nom_entreprise, statut, montant_mensuel_estime, commercial_nom, secteur, type_transport, updated_at')
      .order('updated_at', { ascending: false }) as any)
      .then(({ data }: any) => {
        setProspects((data ?? []) as Prospect[])
        setLoading(false)
      })
  }, [])

  const filtered = prospects.filter(p => {
    if (filterStatut === 'actifs') return !['gagne', 'perdu'].includes(p.statut)
    if (filterStatut === 'gagne') return p.statut === 'gagne'
    if (filterStatut === 'perdu') return p.statut === 'perdu'
    return true
  })

  const totalPotentiel = filtered
    .filter(p => !['gagne', 'perdu'].includes(p.statut))
    .reduce((s, p) => s + (p.montant_mensuel_estime ?? 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 border-b px-4 py-2" style={{ borderColor: 'var(--border)' }}>
        {[
          { id: 'actifs', label: 'Pipeline actif' },
          { id: 'gagne', label: 'Gagnes' },
          { id: 'perdu', label: 'Perdus' },
          { id: 'tous', label: 'Tous' },
        ].map(tab => {
          const active = filterStatut === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setFilterStatut(tab.id)}
              className={`px-2.5 py-1 text-xs font-semibold transition-colors ${active ? 'nx-tab nx-tab-active' : 'nx-tab hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          )
        })}
        {totalPotentiel > 0 && (
          <span className="ml-auto text-xs font-semibold text-foreground">Potentiel : {(totalPotentiel / 1000).toFixed(0)}k EUR/mois</span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10">
          <p className="text-sm text-discreet">Aucun prospect</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filtered.map(p => {
            const meta = STATUT_META[p.statut] ?? { label: p.statut, color: 'bg-surface-2 text-secondary', order: 0 }
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-soft">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-950">{p.nom_entreprise}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>{meta.label}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-discreet">
                    {p.secteur && <span>{p.secteur}</span>}
                    {p.secteur && p.type_transport && <span>•</span>}
                    {p.type_transport && <span>{p.type_transport}</span>}
                    {p.commercial_nom && (
                      <>
                        <span>•</span>
                        <span>{p.commercial_nom}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-950">{fmt(p.montant_mensuel_estime)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
