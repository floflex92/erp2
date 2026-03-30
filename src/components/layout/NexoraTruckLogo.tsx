import { useId } from 'react'

type NexoraTruckLogoProps = {
  dark?: boolean
  subtitle?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_MAP = {
  sm: {
    icon: 'h-10 w-10',
    title: 'text-lg',
    subtitle: 'text-[10px]',
    gap: 'gap-3',
  },
  md: {
    icon: 'h-12 w-12',
    title: 'text-[1.75rem]',
    subtitle: 'text-[11px]',
    gap: 'gap-3.5',
  },
  lg: {
    icon: 'h-14 w-14',
    title: 'text-[2rem]',
    subtitle: 'text-xs',
    gap: 'gap-4',
  },
} as const

export default function NexoraTruckLogo({
  dark = false,
  subtitle = 'NEXORA truck ERP',
  size = 'md',
  className = '',
}: NexoraTruckLogoProps) {
  const gradientId = useId()
  const palette = dark
    ? {
        title: '#F8FAFC',
        subtitle: 'rgba(191, 219, 254, 0.76)',
        truck: '#7DD3FC',
      }
    : {
        title: '#0F172A',
        subtitle: '#475569',
        truck: '#1D4ED8',
      }

  const scale = SIZE_MAP[size]

  return (
    <div className={`flex items-center ${scale.gap} ${className}`.trim()}>
      <svg className={scale.icon} viewBox="0 0 88 88" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="14" y1="12" x2="72" y2="74" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <path d="M27 21 39 31" stroke={`url(#${gradientId})`} strokeWidth="5.2" strokeLinecap="round" />
        <path d="M20 44 40 36" stroke={`url(#${gradientId})`} strokeWidth="5.2" strokeLinecap="round" />
        <path d="M38 35 54 20" stroke={`url(#${gradientId})`} strokeWidth="5.2" strokeLinecap="round" />
        <path d="M38 36 57 52" stroke={`url(#${gradientId})`} strokeWidth="5.2" strokeLinecap="round" />
        <path d="M25 61 40 37" stroke={`url(#${gradientId})`} strokeWidth="5.2" strokeLinecap="round" />
        <path d="M30 67 56 55" stroke={`url(#${gradientId})`} strokeWidth="5.2" strokeLinecap="round" />
        <path d="M57 52 67 31" stroke={`url(#${gradientId})`} strokeWidth="5.2" strokeLinecap="round" />
        <circle cx="21" cy="19" r="9" fill={`url(#${gradientId})`} />
        <circle cx="16" cy="47" r="12" fill={`url(#${gradientId})`} />
        <circle cx="41" cy="37" r="10" fill={`url(#${gradientId})`} />
        <circle cx="57" cy="18" r="10" fill={`url(#${gradientId})`} />
        <circle cx="61" cy="55" r="12" fill={`url(#${gradientId})`} />
        <circle cx="27" cy="69" r="9" fill={`url(#${gradientId})`} />
      </svg>

      <div className="min-w-0">
        <p
          className={`${scale.title} font-semibold uppercase tracking-[0.14em] leading-none`.trim()}
          style={{ color: palette.title }}
        >
          NEXORA
        </p>
        <p
          className={`${scale.subtitle} mt-1 font-semibold tracking-[0.32em] leading-none`.trim()}
          style={{ color: palette.truck }}
        >
          truck
        </p>
        {subtitle ? (
          <p
            className={`${scale.subtitle} mt-1 whitespace-nowrap uppercase tracking-[0.22em]`.trim()}
            style={{ color: palette.subtitle }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  )
}
