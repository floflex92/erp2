import { Component, type ReactNode, type ErrorInfo } from 'react'
import { reportError } from '@/lib/observability'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  errorMessage: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'Erreur de rendu inattendue'
    return { hasError: true, errorMessage: message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError({
      error_type: 'react_boundary',
      message: error.message,
      stack_trace: error.stack ?? null,
      context: {
        component_stack: info.componentStack?.slice(0, 800) ?? null,
      },
    })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-4xl opacity-30">⚠</div>
          <div>
            <p className="text-base font-semibold text-slate-700">Une erreur inattendue s'est produite</p>
            <p className="mt-1 text-sm text-slate-500">{this.state.errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
