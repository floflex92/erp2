import { useId, useRef } from 'react'

export type SegmentedTabOption<T extends string> = {
  key: T
  label: string
}

type SegmentedTabBarProps<T extends string> = {
  active: T
  onChange: (tab: T) => void
  tabs: SegmentedTabOption<T>[]
  ariaLabel: string
  className?: string
}

export function SegmentedTabBar<T extends string>({
  active,
  onChange,
  tabs,
  ariaLabel,
  className = 'flex gap-1 mb-6 border-b border-line',
}: SegmentedTabBarProps<T>) {
  const uid = useId()
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  function focusAndSelect(index: number) {
    const bounded = (index + tabs.length) % tabs.length
    const next = tabs[bounded]
    if (!next) return
    onChange(next.key)
    buttonRefs.current[bounded]?.focus()
  }

  return (
    <div role="tablist" aria-label={ariaLabel} className={className}>
      {tabs.map((tab, index) => {
        const tabId = `${uid}-tab-${String(tab.key)}`
        const panelId = `${uid}-panel-${String(tab.key)}`
        const selected = active === tab.key

        return (
          <button
            key={tab.key}
            ref={el => { buttonRefs.current[index] = el }}
            type="button"
            role="tab"
            id={tabId}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={event => {
              if (event.key === 'ArrowRight') {
                event.preventDefault()
                focusAndSelect(index + 1)
              }
              if (event.key === 'ArrowLeft') {
                event.preventDefault()
                focusAndSelect(index - 1)
              }
              if (event.key === 'Home') {
                event.preventDefault()
                focusAndSelect(0)
              }
              if (event.key === 'End') {
                event.preventDefault()
                focusAndSelect(tabs.length - 1)
              }
            }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary-soft)] ${
              selected
                ? 'border-slate-800 text-foreground'
                : 'border-transparent text-discreet hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
