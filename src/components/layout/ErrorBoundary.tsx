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

const DYNAMIC_IMPORT_RELOAD_FLAG = 'nexora_dynamic_import_reload_once'

function isDynamicImportFailure(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('failed to fetch dynamically imported module')
    || normalized.includes('importing a module script failed')
    || normalized.includes('chunkloaderror')
  )
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' }

  private handleRetry = () => {
    if (isDynamicImportFailure(this.state.errorMessage)) {
      sessionStorage.removeItem(DYNAMIC_IMPORT_RELOAD_FLAG)
      window.location.reload()
      return
    }
    this.setState({ hasError: false, errorMessage: '' })
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'Erreur de rendu inattendue'
    return { hasError: true, errorMessage: message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const dynamicImportError = isDynamicImportFailure(error.message)
    if (dynamicImportError && !sessionStorage.getItem(DYNAMIC_IMPORT_RELOAD_FLAG)) {
      sessionStorage.setItem(DYNAMIC_IMPORT_RELOAD_FLAG, '1')
      window.location.reload()
      return
    }

    if (!dynamicImportError) {
      sessionStorage.removeItem(DYNAMIC_IMPORT_RELOAD_FLAG)
    }

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
      const dynamicImportError = isDynamicImportFailure(this.state.errorMessage)
      const runningOnLocalDevHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
      const helperText = dynamicImportError && runningOnLocalDevHost
        ? 'Le module de page n a pas pu etre charge. Verifiez que le serveur Vite tourne (npm run dev), puis reessayez.'
        : this.state.errorMessage

      return this.props.fallback ?? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-4xl opacity-30">⚠</div>
          <div>
            <p className="text-base font-semibold text-slate-700">Une erreur inattendue s'est produite</p>
            <p className="mt-1 text-sm text-slate-500">{helperText}</p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
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
