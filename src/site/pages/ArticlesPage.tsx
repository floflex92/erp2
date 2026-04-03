import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import { articleIndex } from '@/site/content/articleIndex'

const px: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }

export default function ArticlesPage() {
  useSiteMeta({
    title: 'Blog transport  Articles métier NEXORA Truck',
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
        className="w-full bg-white"
        style={{ ...px, paddingTop: 'clamp(80px, 10vw, 120px)', paddingBottom: 'clamp(48px, 6vw, 80px)' }}
      >
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-700">Blog</p>
          <h1 className="mt-4 max-w-4xl text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-tight tracking-tight text-[var(--site-text)]">
            Ressources et articles métier transport
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--site-text-secondary)]">
            Contenus concrets sur le planning transport, la gestion flotte, le logiciel transport et la rentabilité.
            Rédigés pour les exploitants et dirigeants de transport routier.
          </p>
        </div>
      </section>

      {/*  Articles grid  */}
      <section
        className="w-full bg-[#F5F5F7]"
        style={{ ...px, paddingTop: 'clamp(40px, 5vw, 64px)', paddingBottom: 'clamp(80px, 10vw, 120px)' }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articleIndex.map(article => (
              <Link
                key={article.slug}
                to={`/articles/${article.slug}`}
                className="group flex flex-col rounded-[1.8rem] border border-[var(--site-border)] bg-white p-6 shadow-[var(--site-shadow-card)] transition-all hover:shadow-[var(--site-shadow-panel)] hover:-translate-y-0.5"
              >
                <span className="mb-3 inline-block self-start rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-sky-700">
                  Article
                </span>
                <h2 className="flex-1 text-base font-semibold leading-snug tracking-tight text-[var(--site-text)] group-hover:text-[var(--site-primary)] transition-colors">
                  {article.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--site-text-secondary)]">{article.description}</p>
                <span className="mt-5 text-xs font-semibold text-sky-600 group-hover:text-sky-800 transition-colors">
                  Lire l&apos;article 
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}