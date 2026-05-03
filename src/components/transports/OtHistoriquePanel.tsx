/**
 * OtHistoriquePanel.tsx
 * Panneau d'historique pour un OT — affiché en onglet ou en section dans la fiche.
 * Léger : charge les données uniquement quand visible (prop `visible`).
 */
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface HistoriqueRow {
  id: string
  action: string
  ancien_statut: string | null
  nouveau_statut: string | null
  auteur_nom: string | null
  details: Record<string, unknown>
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  creation: 'Création',
  statut_change: 'Changement de statut',
  affectation: 'Affectation',
  desaffectation: 'Désaffectation',
  deplacement: 'Déplacement sur planning',
  livraison: 'Livraison confirmée',
  retard_valide: 'Retard validé',
  modification: 'Modification',
  note: 'Note',
}

const ACTION_COLORS: Record<string, string> = {
  creation: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  statut_change: 'bg-slate-600/30 text-slate-300 border-slate-500/30',
  affectation: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  desaffectation: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  deplacement: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  livraison: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  retard_valide: 'bg-red-500/20 text-red-300 border-red-500/30',
  modification: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  note: 'bg-slate-700/30 text-muted border-slate-600/30',
}

interface Props {
  otId: string
  visible?: boolean
}

function fmtDatetime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export function OtHistoriquePanel({ otId, visible = true }: Props) {
  const [rows, setRows] = useState<HistoriqueRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible || !otId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from('ot_historique')
      .select('id, action, ancien_statut, nouveau_statut, auteur_nom, details, created_at')
      .eq('ot_id', otId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setLoading(false); return }
        setRows((data ?? []) as HistoriqueRow[])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [otId, visible])

  if (!visible) return null

  if (loading) return (
    <div className="flex items-center justify-center py-10 text-discreet text-sm gap-2">
      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
      Chargement de l'historique…
    </div>
  )

  if (error) return (
    <div className="rounded-xl border border-red-800/40 bg-red-950/20 px-4 py-3 text-sm text-red-300 m-4">
      Impossible de charger l'historique : {error}
    </div>
  )

  if (rows.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-secondary text-sm gap-2">
      <svg className="w-8 h-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/></svg>
      Aucun événement enregistré pour cet OT.
    </div>
  )

  return (
    <div className="relative pl-6 space-y-0 py-2">
      {/* Ligne verticale */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-slate-700/50" />

      {rows.map((row, i) => {
        const colorCls = ACTION_COLORS[row.action] ?? ACTION_COLORS.note
        const label = ACTION_LABELS[row.action] ?? row.action

        // Détails lisibles
        const detailParts: string[] = []
        if (row.ancien_statut && row.nouveau_statut && row.ancien_statut !== row.nouveau_statut) {
          detailParts.push(`${row.ancien_statut} → ${row.nouveau_statut}`)
        }
        if (row.details?.resource_id) {
          detailParts.push(`Ressource: ${String(row.details.resource_id).slice(0, 8)}…`)
        }
        if (row.details?.commentaire) {
          detailParts.push(String(row.details.commentaire))
        }
        if (row.details?.nouvelle_date_livraison) {
          detailParts.push(`Nouvelle livraison: ${String(row.details.nouvelle_date_livraison).slice(0,16).replace('T', ' ')}`)
        }

        return (
          <div key={row.id} className={`relative flex gap-3 pb-4 ${i === rows.length - 1 ? '' : ''}`}>
            {/* Dot */}
            <div className={`absolute -left-[13px] top-1.5 w-3 h-3 rounded-full border flex-shrink-0 ${colorCls}`} />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorCls}`}>
                  {label}
                </span>
                {row.auteur_nom && (
                  <span className="text-[10px] text-discreet">{row.auteur_nom}</span>
                )}
                <span className="text-[10px] text-secondary ml-auto">{fmtDatetime(row.created_at)}</span>
              </div>
              {detailParts.length > 0 && (
                <p className="text-xs text-muted mt-0.5 leading-relaxed">{detailParts.join(' · ')}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default OtHistoriquePanel
