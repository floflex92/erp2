import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'

type RelatedLink = {
  to: string
  title: string
  description: string
}

type ArticleShellProps = {
  title: string
  description: string
  canonicalPath: string
  keywords: string
  readingTime: string
  intro: ReactNode
  children: ReactNode
  relatedLinks: RelatedLink[]
}

export const inlineLinkClassName = 'font-semibold text-[#2563EB] hover:text-[#1d4ed8] transition-colors'

const px: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }

export default function ArticleShell({
  title,
  description,
  canonicalPath,
  keywords,
  readingTime,
  intro,
  children,
  relatedLinks,
}: ArticleShellProps) {
  useSiteMeta({
    title,
    description,
    canonicalPath,
    keywords,
    ogType: 'article',
    author: 'NEXORA Truck',
  })

  useEffect(() => {
    const articleJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      author: { '@type': 'Organization', name: 'NEXORA Truck' },
      publisher: { '@type': 'Organization', name: 'NEXORA Truck' },
      mainEntityOfPage: `https://nexora-truck.fr${canonicalPath}`,
      inLanguage: 'fr-FR',
    }
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = `article-jsonld-${canonicalPath.replace(/\W+/g, '-')}`
    script.text = JSON.stringify(articleJsonLd)
    document.head.appendChild(script)
    return () => { script.remove() }
  }, [canonicalPath, description, title])

  return (
    <div>
      {/* ── Hero ── */}
      <section
        className="w-full bg-white"
        style={{ ...px, paddingTop: 'clamp(80px, 10vw, 120px)', paddingBottom: 'clamp(48px, 6vw, 80px)' }}
      >
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <Link
              to="/articles"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 transition-colors hover:text-sky-900"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5l-5 5 5 5"/></svg>
              Blog
            </Link>
            <span className="text-xs text-[var(--site-text-discreet)]">/</span>
            <span className="text-xs text-[var(--site-text-discreet)]">Article</span>
          </div>

          <h1 className="mt-6 max-w-3xl text-[clamp(1.8rem,4.5vw,3rem)] font-semibold leading-tight tracking-tight text-[var(--site-text)]">
            {title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Article métier
            </span>
            <span className="text-xs text-[var(--site-text-discreet)]">·</span>
            <span className="text-xs text-[var(--site-text-discreet)]">Lecture {readingTime}</span>
            <span className="text-xs text-[var(--site-text-discreet)]">·</span>
            <span className="text-xs font-medium text-[var(--site-text-discreet)]">NEXORA Truck</span>
          </div>

          <div className="mt-8 max-w-2xl space-y-4 border-l-2 border-sky-200 pl-5 text-base leading-8 text-[var(--site-text-secondary)]">
            {intro}
          </div>
        </div>
      </section>

      {/* ── Separator ── */}
      <div style={{ ...px }}>
        <div className="mx-auto max-w-4xl">
          <hr className="border-[var(--site-border)]" />
        </div>
      </div>

      {/* ── Sections ── */}
      <div style={{ ...px, paddingTop: 'clamp(32px, 4vw, 56px)', paddingBottom: 'clamp(60px, 8vw, 100px)' }}>
        <div className="mx-auto max-w-4xl space-y-6">
          {children}
        </div>
      </div>

      {/* ── Related links ── */}
      <section
        className="w-full"
        style={{ background: 'linear-gradient(145deg,#0f172a,#111827)', ...px, paddingBlock: 'clamp(56px, 8vw, 96px)' }}
      >
        <div className="mx-auto max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-400">Continuer</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Poursuivre la lecture sur le site
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {relatedLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition-all hover:border-white/20 hover:bg-white/10"
              >
                <h3 className="text-base font-semibold text-white group-hover:text-sky-200 transition-colors">{link.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{link.description}</p>
              </Link>
            ))}
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <Link to="/articles" className="text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors">
              ← Tous les articles
            </Link>
            <Link to="/connexion-erp" className="site-btn-primary px-5 py-2.5 text-sm transition-colors">
              Essai gratuit
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
