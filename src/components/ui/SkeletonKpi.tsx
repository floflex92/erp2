/**
 * SkeletonKpi — skeleton pour les widgets KPI du dashboard.
 *
 * Usage :
 *   <SkeletonKpi count={6} />           // grille de 6 cartes KPI
 *   <SkeletonKpiList count={5} />        // liste verticale d'items
 */
import { Sk } from './Skeleton'

interface KpiProps {
  count?: number
  cols?: 2 | 3 | 4
}

export function SkeletonKpi({ count = 6, cols = 3 }: KpiProps) {
  const gridClass = cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'

  return (
    <Sk.Region>
      <div className={`grid ${gridClass} gap-4 p-5`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="nx-kpi-card px-4 py-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Sk.Circle size={8} />
              <Sk.Block h={10} w="70%" />
            </div>
            <Sk.Block h={26} w="55%" />
            <Sk.Block h={10} w="80%" />
          </div>
        ))}
      </div>
    </Sk.Region>
  )
}

/**
 * Skeleton pour une liste d'alertes ou d'items avec icône + texte.
 */
export function SkeletonList({ count = 5, className = '' }: { count?: number; className?: string }) {
  return (
    <Sk.Region>
      <div className={`flex flex-col divide-y divide-[color:var(--border)] ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Sk.Circle size={32} />
            <div className="flex flex-1 flex-col gap-1.5">
              <Sk.Block h={13} w={`${60 + (i % 3) * 10}%`} />
              <Sk.Block h={10} w={`${40 + (i % 4) * 8}%`} />
            </div>
            <Sk.Badge w={56} />
          </div>
        ))}
      </div>
    </Sk.Region>
  )
}

/**
 * Skeleton pour une section avec titre + liste d'items.
 */
export function SkeletonCardBody({ lines = 4, className = '' }: { lines?: number; className?: string }) {
  return (
    <Sk.Region>
      <div className={`p-5 flex flex-col gap-3 ${className}`}>
        <Sk.Block h={18} w="45%" />
        <Sk.Text lines={lines} />
      </div>
    </Sk.Region>
  )
}
