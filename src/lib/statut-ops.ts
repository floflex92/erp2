export const STATUT_OPS = {
  en_attente:     { label: 'En attente',         dot: 'bg-violet-500',       ring: 'ring-violet-400' },
  prise_en_charge:{ label: 'Prise en charge',    dot: 'bg-green-300',        ring: 'ring-green-300'  },
  a_l_heure:      { label: 'À l\'heure',         dot: 'bg-green-600',        ring: 'ring-green-500'  },
  retard_mineur:  { label: 'Retard < 2h',        dot: 'bg-yellow-400',       ring: 'ring-yellow-400' },
  retard_majeur:  { label: 'Retard > 2h',        dot: 'bg-red-500',          ring: 'ring-red-400'    },
  termine:        { label: 'Terminé',            dot: 'bg-slate-400',        ring: 'ring-slate-400'  },
} as const

export type StatutOps = keyof typeof STATUT_OPS

export function StatutOpsDot({ statut, size = 'sm' }: { statut: string | null; size?: 'xs' | 'sm' | 'md' }) {
  if (!statut || !(statut in STATUT_OPS)) return null
  const cfg = STATUT_OPS[statut as StatutOps]
  const sz = size === 'xs' ? 'w-1.5 h-1.5' : size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
  return (
    <span
      title={cfg.label}
      className={`inline-block rounded-full flex-shrink-0 ${sz} ${cfg.dot} ring-1 ${cfg.ring} ring-offset-1 ring-offset-current`}
    />
  )
}
