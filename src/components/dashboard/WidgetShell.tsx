import { useState, type DragEventHandler } from 'react'
import type { WidgetSize } from '@/lib/dashboardPrefs'

interface Props {
  title: string
  subtitle?: string
  colSpan?: WidgetSize
  children: React.ReactNode
  widgetId?: string
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
  isSelected?: boolean
  onSelect?: () => void
  motionIndex?: number
}

export function WidgetShell({
  title,
  subtitle,
  colSpan = 'half',
  children,
  widgetId,
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
  isSelected = false,
  onSelect,
  motionIndex = 0,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const colClass = colSpan === 'full' ? 'col-span-3' : colSpan === 'half' ? 'col-span-3 lg:col-span-2' : 'col-span-3 lg:col-span-1'
  const dropGlow = dropPosition === 'before'
    ? 'inset 0 3px 0 var(--primary)'
    : dropPosition === 'after'
      ? 'inset 0 -3px 0 var(--primary)'
      : ''
  const sizeLabel = colSpan === 'full' ? 'L' : colSpan === 'half' ? 'M' : 'S'

  return (
    <div
      className={`${colClass} relative nx-card nx-widget-shell flex flex-col overflow-hidden transition-[opacity,transform,box-shadow,border-color] duration-150 ${
        isCustomizing ? 'nx-widget-editing cursor-grab active:cursor-grabbing' : ''
      } ${!isCustomizing ? 'nx-widget-appear' : ''} ${isDragging ? 'opacity-55 scale-[0.99]' : ''} ${isSelected ? 'nx-widget-selected' : ''}`}
      style={{
        borderColor: 'var(--border)',
        background: 'var(--surface)',
        boxShadow: dropGlow ? `${dropGlow}, var(--shadow-card)` : 'var(--shadow-card)',
        animationDelay: !isCustomizing ? `${Math.min(motionIndex * 30, 240)}ms` : undefined,
        viewTransitionName: widgetId ? `widget-${widgetId}` : undefined,
      }}
      data-widget-id={widgetId}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={isCustomizing ? onSelect : undefined}
    >
      {isCustomizing && (
        <div
          className="flex items-center justify-between gap-3 border-b px-4 py-3"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)' }}
        >
          <div className="flex items-center gap-2">
            {onHide && (
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation()
                  onHide()
                }}
                className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border text-foreground transition-colors hover:bg-surface"
                style={{ borderColor: 'var(--border)' }}
                title="Retirer le widget"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14" />
                </svg>
              </button>
            )}
            <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-discreet" style={{ borderColor: 'var(--border)' }}>
              Modifier
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(onShrink || onGrow) && (
              <div className="flex items-center gap-1 rounded-full border bg-surface px-1.5 py-1" style={{ borderColor: 'var(--border)' }}>
                {onShrink && (
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation()
                      onShrink()
                    }}
                    disabled={!canShrink}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-all hover:bg-surface-2 disabled:opacity-35"
                    title="Reduire"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                )}
                <span className="min-w-7 rounded-full bg-surface-2 px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-discreet">{sizeLabel}</span>
                {onGrow && (
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation()
                      onGrow()
                    }}
                    disabled={!canGrow}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-all hover:bg-surface-2 disabled:opacity-35"
                    title="Agrandir"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)' }}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{title}</p>
          {subtitle && <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="nx-btn nx-btn-ghost flex h-7 w-7 items-center justify-center rounded-full bg-surface/80 p-0 shadow-sm"
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
