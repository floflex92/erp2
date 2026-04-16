/**
 * SkeletonTable — skeleton d'un tableau de liste ERP.
 *
 * Usage :
 *   <SkeletonTable cols={6} rows={8} />
 *   <SkeletonTable cols={4} rows={5} colWidths={['40%','20%','20%','20%']} />
 */
import { Sk } from './Skeleton'

interface Props {
  rows?: number
  cols?: number
  /** Largeurs relatives des colonnes (en %). Ex: ['40','20','20','20'] */
  colWidths?: string[]
  /** Afficher ou non le header skeleton */
  showHeader?: boolean
}

export function SkeletonTable({ rows = 7, cols = 5, colWidths, showHeader = true }: Props) {
  const widths = colWidths ?? Array.from({ length: cols }).map(() => `${Math.floor(100 / cols)}%`)

  return (
    <Sk.Region>
      <div className="nx-table-shell overflow-hidden">
        {showHeader && (
          <div className="flex items-center gap-3 border-b border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
            {widths.map((w, i) => (
              <Sk.Block key={i} h={11} w={w} />
            ))}
          </div>
        )}
        <div>
          {Array.from({ length: rows }).map((_, row) => (
            <div
              key={row}
              className="flex items-center gap-3 border-b border-[color:var(--border)] px-4 py-3.5 last:border-0"
              style={{
                background:
                  row % 2 !== 0
                    ? 'color-mix(in srgb, var(--surface-soft) 72%, transparent)'
                    : 'var(--surface)',
              }}
            >
              {widths.map((w, col) => {
                // Varier un peu les largeurs pour simuler du contenu réel
                const variance = ((row + col) % 3) * 10
                const finalW = col === 0 ? w : `calc(${w} - ${variance}px)`
                return <Sk.Block key={col} h={13} w={finalW} />
              })}
            </div>
          ))}
        </div>
      </div>
    </Sk.Region>
  )
}
