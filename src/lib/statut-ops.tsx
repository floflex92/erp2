export const STATUT_OPS = {
  en_attente:      { label: 'En attente',      dot: 'bg-violet-500'  },
  prise_en_charge: { label: 'Prise en charge', dot: 'bg-green-300'   },
  a_l_heure:       { label: 'À l\'heure',      dot: 'bg-green-600'   },
  retard_mineur:   { label: 'Retard < 2h',     dot: 'bg-yellow-400'  },
  retard_majeur:   { label: 'Retard > 2h',     dot: 'bg-red-500'     },
  termine:         { label: 'Terminé',         dot: 'bg-slate-400'   },
} as const

export type StatutOps = keyof typeof STATUT_OPS

export function StatutOpsDot({ statut, size = 'sm' }: { statut: string | null | undefined; size?: 'xs' | 'sm' | 'md' }) {
  if (!statut || !(statut in STATUT_OPS)) return null
  const cfg = STATUT_OPS[statut as StatutOps]
  const sz = size === 'xs' ? 'w-2 h-2' : size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'
  return (
    <span
      title={cfg.label}
      className={`inline-block rounded-full flex-shrink-0 ${sz} ${cfg.dot}`}
    />
  )
}
