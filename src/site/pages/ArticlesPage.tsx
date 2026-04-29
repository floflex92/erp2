import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { articleIndex } from '@/site/content/articleIndex'

const px: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }

export default function ArticlesPage() {
  useSiteMeta({
    title: 'Blog transport : ERP, TMS, gestion flotte et télématique',
    description:
      "Articles métier NEXORA Truck sur le planning transport, l'ERP transport, le TMS transport, la gestion flotte et la rentabilité.",
    canonicalPath: '/articles',
    keywords:
      'articles transport, ERP transport, logiciel transport, TMS transport, gestion flotte, planning transport, rentabilité transport',
    ogType: 'article',
    author: 'NEXORA Truck',
  })

  return (
    <div>
      {/*  Hero  */}
      <section
        className="relative w-full overflow-hidden"
        style={{
          ...px,
          paddingTop: 'clamp(110px, 13vw, 160px)',
          paddingBottom: 'clamp(60px, 8vw, 100px)',
          background:
            'radial-gradient(1100px 520px at 85% -10%, rgba(14,165,233,0.14), transparent 60%), radial-gradient(800px 460px at -5% 10%, rgba(34,197,94,0.08), transparent 60%), linear-gradient(180deg, #FFFFFF 0%, #F4F9FE 55%, #EAF2FB 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse at 50% 40%, #000 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 40%, #000 30%, transparent 75%)',
          }}
        />
        <div className="relative mx-auto max-w-5xl">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ borderColor: 'rgba(14,165,233,0.28)', background: 'rgba(14,165,233,0.08)', color: '#0369A1' }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#0ea5e9' }} />
            Blog
          </span>
          <h1
            className="mt-5 max-w-4xl font-extrabold leading-[1.02] tracking-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', color: '#0B1B3B', letterSpacing: '-0.02em' }}
          >
            Ressources et articles <span className="site-hero-gradient-text">métier transport</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8" style={{ color: '#334155' }}>
            Contenus concrets sur le planning transport, la gestion flotte, le logiciel transport et la rentabilité.
            Rédigés pour les exploitants et dirigeants de transport routier.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {['Planning', 'Flotte', 'Rentabilité', 'TMS & ERP', 'Conformité', 'Facturation'].map(tag => (
              <span
                key={tag}
                className="rounded-full border bg-white px-3 py-1.5 text-[12px] font-semibold"
                style={{ borderColor: '#E2E8F0', color: '#0B1B3B' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/*  Articles grid  */}
      <section
        className="w-full"
        style={{ ...px, paddingTop: 'clamp(40px, 5vw, 64px)', paddingBottom: 'clamp(80px, 10vw, 120px)', background: '#F5F7FA' }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articleIndex.map(article => (
              <Link
                key={article.slug}
                to={`/articles/${article.slug}`}
                className="group flex flex-col rounded-2xl border bg-white p-6 transition-all hover:-translate-y-0.5"
                style={{ borderColor: '#E2E8F0', boxShadow: '0 10px 24px rgba(15,23,42,0.06)' }}
              >
                <span
                  className="mb-3 inline-flex self-start items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ background: 'rgba(14,165,233,0.10)', color: '#0369A1' }}
                >
                  <span className="h-1 w-1 rounded-full" style={{ background: '#0ea5e9' }} />
                  Article
                </span>
                <h2
                  className="text-base font-bold leading-snug tracking-tight transition-colors group-hover:text-sky-700"
                  style={{ color: '#0B1B3B' }}
                >
                  {article.title}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-6" style={{ color: '#475569' }}>
                  {article.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 transition-colors group-hover:text-sky-800">
                  Lire l&apos;article
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}