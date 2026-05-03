type NexoraTruckLogoProps = {
  dark?: boolean
  subtitle?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_MAP = {
  sm: {
    logo: 'h-9',
    title: 'text-lg',
    subtitle: 'text-[10px]',
    gap: 'gap-3',
  },
  md: {
    logo: 'h-10',
    title: 'text-[1.75rem]',
    subtitle: 'text-[11px]',
    gap: 'gap-3.5',
  },
  lg: {
    logo: 'h-12',
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
  const palette = dark
    ? {
        subtitle: 'rgba(226, 232, 240, 0.78)',
        truck: '#0EA5E9',
        logo: '/site/logo/brand/nexora-logo-light.webp',
      }
    : {
        subtitle: '#475569',
        truck: '#1F4E8C',
        logo: '/site/logo/brand/nexora-logo-dark.webp',
      }

  const scale = SIZE_MAP[size]

  return (
    <div className={`flex items-center ${scale.gap} ${className}`.trim()}>
      <img
        src={palette.logo}
        alt="NEXORA"
        className={`${scale.logo} w-auto object-contain`.trim()}
        loading="eager"
        decoding="async"
      />

      <div className="min-w-0">
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
