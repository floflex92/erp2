import { Link } from 'react-router-dom'
import { APP_VERSION, BUILD_DATE } from '@/lib/appVersion'
import { latestReleaseNote, releaseNotes } from '@/lib/releaseNotes'
import useSiteMeta from '@/site/hooks/useSiteMeta'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(80px, 12vw, 160px)' }

function ReleaseBlock({
  title,
  items,
  accent,
}: {
  title: string
  items: readonly string[]
  accent: string
}) {
  if (!items.length) return null

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm leading-6" style={{ color: '#4b4b51' }}>
        {items.map(item => (
          <li key={item} className="rounded-xl border px-3 py-2.5" style={{ borderColor: '#E5E7EB', background: '#F8FAFC' }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function VersionsPage() {
  useSiteMeta({
    title: 'Historique des versions ERP transport NEXORA',
    description: 'Consultez l historique des versions NEXORA Truck avec les ajouts, modifications et rectifications de chaque release.',
    canonicalPath: '/versions',
    keywords: 'historique versions ERP transport, changelog NEXORA Truck, roadmap releases ERP transport',
  })

  const additionsCount = releaseNotes.reduce((sum, note) => sum + note.additions.length, 0)
  const fixesCount = releaseNotes.reduce((sum, note) => sum + note.fixes.length, 0)

  return (
    <>
      <section className="relative flex min-h-[62vh] w-full flex-col items-center justify-center overflow-hidden text-center" style={{ ...sectionPx, ...sectionPy }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1D4ED8 55%, #38BDF8 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at top, rgba(255,255,255,0.18), transparent 48%)' }} />
        <div className="relative max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.72)' }}>Historique produit</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-balance font-bold leading-[1.05]" style={{ fontSize: 'clamp(2.4rem, 6vw, 4.8rem)', color: '#FFFFFF', letterSpacing: '-0.025em' }}>
            Toutes les versions de NEXORA, avec les ajouts, modifications et rectifications.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8" style={{ color: 'rgba(255,255,255,0.84)' }}>
            Cette page sert de référence publique sur l évolution du produit. Le numéro de version courante est injecté automatiquement au build, ce qui permet de refléter le dernier déploiement Netlify.
          </p>

          <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">
            <div className="rounded-xl border px-4 py-3 text-left" style={{ borderColor: 'rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.92)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#64748B' }}>Version courante</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: '#0F172A' }}>{APP_VERSION}</p>
              <p className="mt-1 text-xs" style={{ color: '#64748B' }}>Build du {BUILD_DATE}</p>
            </div>
            <div className="rounded-xl border px-4 py-3 text-left" style={{ borderColor: 'rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.92)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#64748B' }}>Versions suivies</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: '#0F172A' }}>{releaseNotes.length}</p>
            </div>
            <div className="rounded-xl border px-4 py-3 text-left" style={{ borderColor: 'rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.92)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#64748B' }}>Entrées documentées</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: '#0F172A' }}>{additionsCount + fixesCount}</p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/fonctionnalites" className="site-btn-primary px-6 py-3 text-sm transition-colors">Retour aux fonctionnalités</Link>
            <Link to="/contact" className="text-sm font-semibold" style={{ color: '#BFDBFE' }}>Parler produit</Link>
          </div>
        </div>
      </section>

      <section className="w-full" style={{ background: '#F5F5F7', ...sectionPx, paddingBlock: 'clamp(56px, 8vw, 88px)' }}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <div className="rounded-3xl border p-6" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#2563EB' }}>Dernière release documentée</p>
            <h2 className="mt-3 text-2xl font-semibold" style={{ color: '#0F172A' }}>
              {latestReleaseNote.version} · {latestReleaseNote.title}
            </h2>
            <p className="mt-3 text-sm leading-7" style={{ color: '#4b4b51' }}>{latestReleaseNote.summary}</p>
          </div>

          <div className="rounded-3xl border p-6" style={{ borderColor: '#BFDBFE', background: '#EFF6FF' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#1D4ED8' }}>Mise à jour Netlify</p>
            <p className="mt-3 text-sm leading-7" style={{ color: '#1E3A8A' }}>
              Le numéro affiché ici suit automatiquement la version injectée au build. Pour qu une future release expose aussi son détail métier, il suffit d ajouter son bloc dans le registre des versions avant le push Netlify.
            </p>
          </div>
        </div>
      </section>

      <section className="w-full bg-white" style={{ ...sectionPx, paddingBlock: 'clamp(56px, 8vw, 112px)' }}>
        <div className="space-y-6">
          {releaseNotes.map(note => (
            <article key={note.version} className="rounded-[28px] border p-6 sm:p-7" style={{ borderColor: '#E5E7EB', background: '#FFFFFF', boxShadow: note.version === APP_VERSION ? '0 24px 60px rgba(15,23,42,0.08)' : 'none' }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]" style={{ background: note.version === APP_VERSION ? '#DBEAFE' : '#F1F5F9', color: note.version === APP_VERSION ? '#1D4ED8' : '#475569' }}>
                      {note.version === APP_VERSION ? 'Version en ligne' : 'Release'}
                    </span>
                    <span className="text-sm" style={{ color: '#64748B' }}>{note.date}</span>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold" style={{ color: '#0F172A' }}>{note.version} · {note.title}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7" style={{ color: '#4b4b51' }}>{note.summary}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                <ReleaseBlock title="Ajouts" items={note.additions} accent="#2563EB" />
                <ReleaseBlock title="Modifications" items={note.modifications} accent="#0F766E" />
                <ReleaseBlock title="Rectifications" items={note.fixes} accent="#DC2626" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}