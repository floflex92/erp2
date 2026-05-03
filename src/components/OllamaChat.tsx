import { useRef, useState } from 'react'
import { chat, OllamaError } from '@/lib/ollama'

export default function OllamaChat() {
  const [prompt, setPrompt] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setAnswer(null)

    try {
      const res = await chat(trimmed)
      setAnswer(res.message.content)
    } catch (err) {
      if (err instanceof OllamaError) {
        setError(err.message)
      } else {
        setError('Une erreur inattendue est survenue.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">IA locale</p>
      <h3 className="mt-1 text-lg font-semibold text-heading">Chat Ollama</h3>
      <p className="mt-1 text-sm text-discreet">
        Posez une question au modèle local ({import.meta.env.VITE_OLLAMA_MODEL ?? 'mistral'}).
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e as unknown as React.FormEvent)
            }
          }}
          rows={3}
          placeholder="Votre prompt… (Entrée pour envoyer, Maj+Entrée pour sauter une ligne)"
          disabled={loading}
          className="w-full rounded-xl border border-line-strong bg-surface-soft px-3 py-2 text-sm text-foreground placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {loading ? 'Génération…' : 'Envoyer'}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {answer && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-foreground whitespace-pre-wrap">
          {answer}
        </div>
      )}
    </section>
  )
}
