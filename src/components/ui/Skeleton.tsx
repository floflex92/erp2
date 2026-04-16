/**
 * Skeleton — composants de base réutilisables pour les états de chargement.
 *
 * Usage :
 *   <Sk.Block h={20} w="60%" />
 *   <Sk.Text lines={3} />
 *   <Sk.Circle size={40} />
 *   <Sk.Badge />
 */

interface BlockProps {
  h?: number | string
  w?: number | string
  className?: string
  rounded?: string
}

function Block({ h = 16, w = '100%', className = '', rounded = '0.4rem' }: BlockProps) {
  return (
    <div
      className={`nx-skeleton ${className}`}
      style={{
        height: typeof h === 'number' ? `${h}px` : h,
        width: typeof w === 'number' ? `${w}px` : w,
        borderRadius: rounded,
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  )
}

interface TextProps {
  lines?: number
  lastLineWidth?: string
  className?: string
}

function Text({ lines = 3, lastLineWidth = '60%', className = '' }: TextProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Block
          key={i}
          h={13}
          w={i === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  )
}

interface CircleProps {
  size?: number
  className?: string
}

function Circle({ size = 40, className = '' }: CircleProps) {
  return (
    <div
      className={`nx-skeleton ${className}`}
      style={{ height: size, width: size, borderRadius: '50%', flexShrink: 0 }}
      aria-hidden="true"
    />
  )
}

function Badge({ w = 72, className = '' }: { w?: number; className?: string }) {
  return <Block h={22} w={w} rounded="999px" className={className} />
}

/** Wrapper qui donne l'accessibilité correcte à une zone skeleton */
function Region({
  children,
  label = 'Chargement en cours',
}: {
  children: React.ReactNode
  label?: string
}) {
  return (
    <div role="status" aria-label={label} aria-busy="true">
      {children}
      <span className="sr-only">{label}…</span>
    </div>
  )
}

export const Sk = { Block, Text, Circle, Badge, Region }
