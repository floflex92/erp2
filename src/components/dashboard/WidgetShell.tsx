import { useState, type DragEventHandler } from 'react'
import type { WidgetSize } from '@/lib/dashboardPrefs'

interface Props {
  title: string
  subtitle?: string
  colSpan?: WidgetSize
  children: React.ReactNode
  onMoveUp?: () => void
  onMoveDown?: () => void
  onHide?: () => void
  onShrink?: () => void
  onGrow?: () => void
  canShrink?: boolean
  canGrow?: boolean
  isCustomizing?: boolean
  draggable?: boolean
  onDragStart?: DragEventHandler<HTMLDivElement>
  onDragOver?: DragEventHandler<HTMLDivElement>
  onDrop?: DragEventHandler<HTMLDivElement>
  onDragEnd?: DragEventHandler<HTMLDivElement>
  isDragging?: boolean
  dropPosition?: 'before' | 'after' | null
}

export function WidgetShell({
  title,
  subtitle,
  colSpan = 'half',
  children,
  onMoveUp,
  onMoveDown,
  onHide,
  onShrink,
  onGrow,
  canShrink = false,
  canGrow = false,
  isCustomizing = false,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  dropPosition = null,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const colClass = colSpan === 'full' ? 'col-span-3' : colSpan === 'half' ? 'col-span-3 lg:col-span-2' : 'col-span-3 lg:col-span-1'
  const dropGlow = dropPosition === 'before'
    ? 'inset 0 3px 0 var(--primary)'
    : dropPosition === 'after'
      ? 'inset 0 -3px 0 var(--primary)'
      : ''

  return (
    <div
      className={`${colClass} nx-card flex flex-col overflow-hidden transition-[opacity,transform] duration-150 ${
        isCustomizing ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isDragging ? 'opacity-55 scale-[0.99]' : ''}`}
      style={{
        borderColor: 'var(--border)',
        background: 'var(--surface)',
        boxShadow: dropGlow ? `${dropGlow}, var(--shadow-card)` : 'var(--shadow-card)',
      }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)' }}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{title}</p>
          {subtitle && <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1">
          {isCustomizing && (
            <>
              {onMoveUp && (
                <button
                  onClick={onMoveUp}
                  className="nx-btn nx-btn-ghost flex h-7 w-7 items-center justify-center rounded-lg p-0"
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
                  className="nx-btn nx-btn-ghost flex h-7 w-7 items-center justify-center rounded-lg p-0"
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
                  className="nx-btn nx-btn-ghost flex h-7 w-7 items-center justify-center rounded-lg p-0"
                  style={{ color: 'var(--danger)' }}
                  title="Masquer"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
              {onShrink && (
                <button
                  onClick={onShrink}
                  className="nx-btn nx-btn-ghost flex h-7 w-7 items-center justify-center rounded-lg p-0 disabled:opacity-45"
                  title="Reduire la taille"
                  disabled={!canShrink}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14" />
                  </svg>
                </button>
              )}
              {onGrow && (
                <button
                  onClick={onGrow}
                  className="nx-btn nx-btn-ghost flex h-7 w-7 items-center justify-center rounded-lg p-0 disabled:opacity-45"
                  title="Agrandir la taille"
                  disabled={!canGrow}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}
            </>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="nx-btn nx-btn-ghost flex h-7 w-7 items-center justify-center rounded-lg p-0"
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
