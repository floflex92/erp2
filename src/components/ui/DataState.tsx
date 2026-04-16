/**
 * DataState — composants unifiés pour tous les états de données de l'ERP.
 *
 * Remplace les patterns ad-hoc : spinner perdu, texte "Chargement...", etc.
 *
 * États couverts :
 *   - loading   : skeleton plein écran (passer le skeleton en children)
 *   - refreshing : bandeau discret "Mise à jour..." sans bloquer le contenu
 *   - empty     : illustration + message quand la liste est vide
 *   - error     : alerte rouge avec bouton retry optionnel
 *
 * Usage rapide :
 *   if (loading) return <DataState.Loading><SkeletonTable /></DataState.Loading>
 *   if (error)   return <DataState.Error message={error} onRetry={reload} />
 *   if (!data.length) return <DataState.Empty label="Aucun client enregistré." />
 */

import type { ReactNode } from 'react'

/* ─── Loading (wraps a skeleton) ────────────────────────────────────────── */
function Loading({ children }: { children: ReactNode }) {
  return <div className="nx-fadein">{children}</div>
}

/* ─── Refreshing (bandeau non-bloquant) ─────────────────────────────────── */
function Refreshing({ label = 'Mise à jour…' }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[color:var(--text-secondary)]"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-3 w-3 rounded-full border border-[color:var(--primary)] border-t-transparent animate-spin"
        aria-hidden="true"
      />
      {label}
    </div>
  )
}

/* ─── Empty ─────────────────────────────────────────────────────────────── */
interface EmptyProps {
  label?: string
  sublabel?: string
  icon?: ReactNode
  action?: ReactNode
}

function Empty({
  label = 'Aucune donnée disponible.',
  sublabel,
  icon,
  action,
}: EmptyProps) {
  return (
    <div
      className="nx-fadein flex flex-col items-center justify-center gap-3 p-10 text-center"
      role="status"
    >
      {icon ? (
        <div className="text-[color:var(--text-discreet)]">{icon}</div>
      ) : (
        <EmptyIcon />
      )}
      <p className="text-sm font-medium text-[color:var(--text-secondary)]">{label}</p>
      {sublabel && (
        <p className="text-xs text-[color:var(--text-discreet)]">{sublabel}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

function EmptyIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className="opacity-30"
    >
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" />
      <path
        d="M14 20h12M20 14v12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  )
}

/* ─── Error ─────────────────────────────────────────────────────────────── */
interface ErrorProps {
  message?: string | null
  onRetry?: () => void
  compact?: boolean
}

function Error({ message, onRetry, compact = false }: ErrorProps) {
  const text = message || 'Une erreur est survenue lors du chargement.'

  if (compact) {
    return (
      <div
        className="nx-fadein flex items-center gap-2 px-4 py-2 text-xs text-[color:var(--status-error-text)]"
        role="alert"
      >
        <ErrorIcon size={14} />
        <span>{text}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-2 underline underline-offset-2 hover:no-underline"
            type="button"
          >
            Réessayer
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className="nx-fadein m-4 rounded-xl border border-[color:var(--status-error-text)]/20 bg-[color:var(--status-error-bg)] px-4 py-4"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <ErrorIcon size={18} className="mt-0.5 shrink-0 text-[color:var(--status-error-text)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[color:var(--status-error-text)]">
            Erreur de chargement
          </p>
          <p className="mt-0.5 text-xs text-[color:var(--status-error-text)]/80">{text}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 rounded-lg border border-[color:var(--status-error-text)]/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[color:var(--status-error-text)] transition hover:bg-white/20"
            type="button"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  )
}

function ErrorIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.178 2.625-1.516 2.625H3.72c-1.338 0-2.189-1.458-1.515-2.625L8.485 2.495zm1.515.74L3.72 14.11h12.56L10 3.234zm0 3.516a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6.75zm0 8a.75.75 0 110 1.5.75.75 0 010-1.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/* ─── Export namespace ───────────────────────────────────────────────────── */
export const DataState = { Loading, Refreshing, Empty, Error }
