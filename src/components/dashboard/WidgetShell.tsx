import { useState } from 'react'

interface Props {
  title: string
  subtitle?: string
  colSpan?: 'full' | 'half' | 'third'
  children: React.ReactNode
  onMoveUp?: () => void
  onMoveDown?: () => void
  onHide?: () => void
  isCustomizing?: boolean
}

export function WidgetShell({
  title,
  subtitle,
  colSpan = 'half',
  children,
  onMoveUp,
  onMoveDown,
  onHide,
  isCustomizing = false,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const colClass = colSpan === 'full' ? 'col-span-3' : colSpan === 'half' ? 'col-span-3 lg:col-span-2' : 'col-span-3 lg:col-span-1'

  return (
    <div
      className={`${colClass} flex flex-col overflow-hidden rounded-2xl border`}
      style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)' }}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
          {subtitle && <p className="truncate text-xs text-slate-600">{subtitle}</p>}
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1">
          {isCustomizing && (
            <>
              {onMoveUp && (
                <button
                  onClick={onMoveUp}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
                  title="Monter"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m5 15 7-7 7 7" />
                  </svg>
                </button>
              )}
              {onMoveDown && (
                <button
                  onClick={onMoveDown}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
                  title="Descendre"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m19 9-7 7-7-7" />
                  </svg>
                </button>
              )}
              {onHide && (
                <button
                  onClick={onHide}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 transition-colors hover:bg-rose-50"
                  title="Masquer"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
            title={collapsed ? 'Developper' : 'Reduire'}
          >
            <svg
              className={`h-3.5 w-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m5 15 7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      {!collapsed && <div className="flex-1 overflow-auto">{children}</div>}
    </div>
  )
}
