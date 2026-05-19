import { Link } from 'react-router-dom'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import {
  developedCatalogFeatures,
  inProgressCatalogFeatures,
  upcomingCatalogFeatures,
  type CatalogFeature,
} from '@/lib/featuresCatalog'

const sectionPx: React.CSSProperties = { paddingInline: 'clamp(24px, 8vw, 160px)' }
const sectionPy: React.CSSProperties = { paddingBlock: 'clamp(80px, 12vw, 160px)' }

const developedFeatures = developedCatalogFeatures
const inProgressFeatures = inProgressCatalogFeatures
const upcomingFeatures = upcomingCatalogFeatures

function FeatureList({ items }: { items: readonly CatalogFeature[] }) {
  const byCategory = items.reduce<Map<string, CatalogFeature[]>>((acc, item) => {
    const key = item.categorie || 'Autres'
    const list = acc.get(key) ?? []
    list.push(item)
    acc.set(key, list)
    return acc
  }, new Map())

  const categories = Array.from(byCategory.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'fr'))

  if (!categories.length) {
    return <p className="mt-8" style={{ color: '#6E6E73' }}>Aucune fonctionnalité publiée pour cette section.</p>
  }

  return (
    <div className="mt-8 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
      {categories.map(([category, features]) => (
        <div key={category} className="rounded-2xl border p-4 sm:p-5 transition-shadow duration-150 hover:shadow-sm" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#2563EB' }}>
            {category} <span style={{ color: '#6E6E73' }}>• {features.length}</span>
          </p>
          <ul className="mt-3 space-y-3">
            {features.map(item => (
              <li
                key={`${item.categorie}-${item.fonctionnalite}`}
                className="text-sm leading-5"
                style={{ color: '#1D1D1F' }}
              >
                <span style={{ color: '#6E6E73' }}>— </span>{item.fonctionnalite}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function StatusSection({
  eyebrow,
  count,
  background,
  items,
}: {
  eyebrow: string
  count: number
  background: string
  items: readonly CatalogFeature[]
}) {
  return (
    <section className="w-full" style={{ background, ...sectionPx, ...sectionPy }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#606065' }}>{eyebrow}</p>
        <div className="rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: '#BFDBFE', color: '#1D4ED8', background: '#EFF6FF' }}>
          {count} fonctionnalités
        </div>
      </div>
      <FeatureList items={items} />
    </section>
  )
}

export default function AllFeaturesPage() {
  useSiteMeta({
    title: 'Fonctionnalités ERP transport NEXORA',
    description: 'Vue complète des fonctionnalités NEXORA Truck: disponibles, en cours de développement et prochaines features.',
    canonicalPath: '/toutes-les-fonctionnalites',
    keywords: 'toutes les fonctionnalités transport, roadmap ERP transport, fonctionnalités en cours de développement',
  })

  return (
    <>
      {/* ── HERO ── */}
      <section
        className="relative w-full overflow-hidden"
        style={{
          ...sectionPx,
          paddingTop: 'clamp(120px, 13vw, 170px)',
          paddingBottom: 'clamp(80px, 10vw, 140px)',
          background:
            'radial-gradient(1200px 600px at 85% -10%, rgba(14,165,233,0.14), transparent 60%), radial-gradient(900px 500px at -10% 20%, rgba(34,197,94,0.08), transparent 60%), linear-gradient(180deg, #FFFFFF 0%, #F4F9FE 55%, #EAF2FB 100%)',
        }}
        aria-labelledby="all-features-hero-heading"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse at 50% 40%, #000 35%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 40%, #000 35%, transparent 75%)',
          }}
        />
        <svg aria-hidden="true" viewBox="0 0 1440 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full">
          <path d="M0 40 C 240 80, 480 0, 720 30 S 1200 70, 1440 30 L1440 80 L0 80 Z" fill="#FFFFFF" opacity="0.9" />
        </svg>

        <div className="relative grid items-center gap-14 lg:grid-cols-[0.95fr_1.1fr]">
          {/* Left — title & CTA */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: '#0369A1' }}>
              Roadmap produit
            </p>
            <h1
              id="all-features-hero-heading"
              className="mt-5 font-extrabold leading-[0.98] tracking-tight"
              style={{ fontSize: 'clamp(2.4rem, 5.8vw, 4.4rem)', color: '#0B1B3B', letterSpacing: '-0.02em' }}
            >
              Plus de 80 <span className="site-hero-gradient-text">fonctionnalités</span> pour piloter votre exploitation transport.
            </h1>
            <p className="mt-6 max-w-xl" style={{ color: '#334155', fontSize: 'clamp(1rem, 1.15vw, 1.1rem)', lineHeight: 1.7 }}>
              NEXORA réunit tous les outils dont vous avez besoin dans une seule plateforme, simple et puissante.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/fonctionnalites" className="site-hero-cta">
                Explorer toutes les fonctionnalités&nbsp;→
              </Link>
              <Link
                to="/connexion-erp"
                className="inline-flex min-h-[48px] items-center rounded-xl border px-5 py-3 text-sm font-semibold transition-colors"
                style={{ borderColor: '#0ea5e9', color: '#0ea5e9', background: '#FFFFFF' }}
              >
                Essai gratuit — 14 jours
              </Link>
            </div>

            {/* Mini stats */}
            <div className="mt-10 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { icon: (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h7l-1 8 10-12h-7z" /></svg>
                ), v: '80+', l: 'fonctionnalités' },
                { icon: (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
                ), v: '100%', l: 'intégré' },
                { icon: (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#0369A1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>
                ), v: '1 seul outil', l: 'zéro perte d’information' },
              ].map(s => (
                <div key={s.l} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(14,165,233,0.10)' }}>
                    {s.icon}
                  </span>
                  <div>
                    <p className="text-base font-extrabold leading-none" style={{ color: '#0B1B3B' }}>{s.v}</p>
                    <p className="mt-1 text-xs font-medium" style={{ color: '#64748B' }}>{s.l}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — dashboard mock with orbiting modules (virtuous circle) */}
          <div
            className="relative mx-auto w-full"
            style={{ maxWidth: 780, aspectRatio: '1 / 1' }}
            aria-hidden="true"
          >
            {/* Orbit ellipse */}
            <svg viewBox="0 0 600 600" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="orbit-grad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.55" />
                </linearGradient>
              </defs>
              <ellipse
                cx="300"
                cy="300"
                rx="262"
                ry="242"
                fill="none"
                stroke="url(#orbit-grad)"
                strokeWidth="1.5"
                strokeDasharray="3 6"
              />
              {/* Connection dots on orbit */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
                const cx = 300 + Math.cos(angle) * 262
                const cy = 300 + Math.sin(angle) * 242
                return <circle key={i} cx={cx} cy={cy} r="3.5" fill="#0ea5e9" opacity="0.7" />
              })}
            </svg>

            {/* Orbit pills positioned on the ellipse */}
            {([
              { title: 'Planning', sub: 'Optimisez vos ressources', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2.5" /><path d="M8 2v4M16 2v4M3 9h18" /></svg>
              ) },
              { title: 'Exploitation', sub: 'Opérations temps réel', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 20V10M18 20V6M12 20V14" /><circle cx="6" cy="7" r="2" /><circle cx="12" cy="11" r="2" /><circle cx="18" cy="3" r="2" /></svg>
              ) },
              { title: 'Flotte', sub: 'Parc véhicules', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>
              ) },
              { title: 'Facturation', sub: 'Automatique', color: '#22c55e', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
              ) },
              { title: 'Statistiques', sub: 'KPI temps réel', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>
              ) },
              { title: 'API & Intégr.', sub: 'Outils & partenaires', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4" /></svg>
              ) },
              { title: 'IA & Auto.', sub: 'Gain de temps', color: '#8B5CF6', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></svg>
              ) },
              { title: 'Portail client', sub: 'Temps réel', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>
              ) },
              { title: 'RH', sub: 'Absences & entretiens', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5M14 20c0-2.5 2-4 4-4s4 1.5 4 4" /></svg>
              ) },
              { title: 'Documents', sub: 'Coffre-fort', color: '#F59E0B', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
              ) },
              { title: 'Conformité', sub: 'Réglementation', color: '#22c55e', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
              ) },
              { title: 'Conducteurs', sub: 'Équipes & plannings', color: '#0ea5e9', icon: (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" /></svg>
              ) },
            ] as const).map((pill, i, arr) => {
              // Distribute on ellipse, starting from top and going clockwise
              const angle = (i / arr.length) * Math.PI * 2 - Math.PI / 2
              // Ellipse radii in percentage (rx=262/600≈43.7%, ry=242/600≈40.3%)
              const rx = 43.7
              const ry = 40.3
              const cx = 50 + Math.cos(angle) * rx
              const cy = 50 + Math.sin(angle) * ry
              return (
                <div
                  key={pill.title}
                  className="absolute flex w-[160px] items-start gap-2 rounded-2xl border bg-white px-2.5 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                  style={{
                    left: `${cx}%`,
                    top: `${cy}%`,
                    transform: 'translate(-50%, -50%)',
                    borderColor: '#E2E8F0',
                  }}
                >
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${pill.color}1A`, color: pill.color }}
                  >
                    {pill.icon}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-[10.5px] font-extrabold uppercase tracking-[0.06em]" style={{ color: '#0B1B3B' }}>{pill.title}</p>
                    <p className="mt-0.5 truncate text-[9.5px]" style={{ color: '#64748B' }}>{pill.sub}</p>
                  </div>
                </div>
              )
            })}

            {/* Central dashboard card */}
            <div
              className="absolute left-1/2 top-1/2 w-[58%] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white shadow-[0_30px_70px_rgba(15,23,42,0.22)]"
              style={{ borderColor: '#E2E8F0' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b px-2.5 py-1.5" style={{ borderColor: '#E2E8F0' }}>
                <img src="/site/logo/brand/nexora-logo-dark.webp" alt="" className="h-3.5 w-auto object-contain" />
                <div className="flex items-center gap-1">
                  <span className="relative inline-block h-3 w-3 rounded-full" style={{ background: '#F1F5F9' }}>
                    <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full" style={{ background: '#EF4444' }} />
                  </span>
                  <span className="h-4 w-4 rounded-full" style={{ background: 'linear-gradient(135deg,#0ea5e9,#22c55e)' }} />
                  <p className="text-[7px] font-semibold" style={{ color: '#0B1B3B' }}>Alex M.</p>
                </div>
              </div>

              <div className="grid grid-cols-[34%_66%]">
                {/* Sidebar */}
                <ul className="space-y-0.5 border-r py-1.5 pl-1.5 pr-1" style={{ borderColor: '#E2E8F0' }}>
                  {[
                    ['Tableau de bord', true],
                    ['Exploitation', false],
                    ['Planning', false],
                    ['Flotte', false],
                    ['Conducteurs', false],
                    ['Facturation', false],
                    ['Conformité', false],
                    ['Documents', false],
                  ].map(([label, active]) => (
                    <li
                      key={label as string}
                      className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[7.5px] font-medium"
                      style={{
                        background: active ? 'rgba(14,165,233,0.10)' : 'transparent',
                        color: active ? '#0ea5e9' : '#475569',
                      }}
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: active ? '#0ea5e9' : '#CBD5E1' }} />
                      <span className="truncate">{label as string}</span>
                    </li>
                  ))}
                </ul>

                {/* Content */}
                <div className="p-2">
                  <p className="text-[8.5px] font-bold" style={{ color: '#0B1B3B' }}>Tableau de bord</p>

                  {/* KPI row */}
                  <div className="mt-1.5 grid grid-cols-2 gap-1">
                    {[
                      { label: 'Courses', value: '28', delta: '+12%' },
                      { label: 'Livraisons', value: '156', delta: '+8%' },
                      { label: 'Taux serv.', value: '98,6%', delta: '+2,1%' },
                      { label: 'CA', value: '32,4k€', delta: '+15%' },
                    ].map(k => (
                      <div key={k.label} className="rounded-md border p-1" style={{ borderColor: '#E2E8F0' }}>
                        <p className="truncate text-[6px] font-medium" style={{ color: '#64748B' }}>{k.label}</p>
                        <p className="mt-0.5 text-[9px] font-extrabold leading-tight" style={{ color: '#0B1B3B' }}>{k.value}</p>
                        <p className="flex items-center gap-0.5 text-[5.5px] font-semibold" style={{ color: '#16A34A' }}>
                          <svg viewBox="0 0 24 24" className="h-1.5 w-1.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H9M17 7v8" /></svg>
                          {k.delta}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Map */}
                  <div className="mt-1.5">
                    <p className="text-[6.5px] font-bold" style={{ color: '#0B1B3B' }}>Suivi temps réel</p>
                    <div className="mt-0.5 h-10 overflow-hidden rounded-md border" style={{ borderColor: '#E2E8F0', background: 'linear-gradient(135deg,#E0F2FE,#DCFCE7)' }}>
                      <svg viewBox="0 0 200 80" className="h-full w-full" preserveAspectRatio="none">
                        <path d="M10 60 Q 60 20, 110 55 T 190 30" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="2 2" />
                        <circle cx="40" cy="48" r="2.5" fill="#0ea5e9" />
                        <circle cx="110" cy="55" r="2.5" fill="#22c55e" />
                        <circle cx="175" cy="32" r="2.5" fill="#22c55e" />
                      </svg>
                    </div>
                  </div>

                  {/* Planning bars */}
                  <div className="mt-1.5">
                    <p className="text-[6.5px] font-bold" style={{ color: '#0B1B3B' }}>Planning du jour</p>
                    <div className="mt-0.5 space-y-0.5">
                      {[
                        { name: 'C12', segs: [{ l: 5, w: 25, c: '#22c55e' }, { l: 35, w: 30, c: '#0ea5e9' }] },
                        { name: 'C24', segs: [{ l: 15, w: 40, c: '#0ea5e9' }, { l: 60, w: 28, c: '#22c55e' }] },
                        { name: 'C31', segs: [{ l: 8, w: 30, c: '#F59E0B' }, { l: 45, w: 35, c: '#F59E0B' }] },
                      ].map(r => (
                        <div key={r.name} className="grid grid-cols-[18%_82%] items-center gap-1">
                          <span className="truncate text-[6px]" style={{ color: '#64748B' }}>{r.name}</span>
                          <div className="relative h-1.5 rounded-sm" style={{ background: '#F1F5F9' }}>
                            {r.segs.map((s, i) => (
                              <span
                                key={i}
                                className="absolute top-0 h-full rounded-sm"
                                style={{ left: `${s.l}%`, width: `${s.w}%`, background: s.c, opacity: 0.9 }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <StatusSection
        eyebrow="Disponibles"
        count={developedFeatures.length}
        background="#F5F5F7"
        items={developedFeatures}
      />

      <StatusSection
        eyebrow="En cours"
        count={inProgressFeatures.length}
        background="#FFFFFF"
        items={inProgressFeatures}
      />

      <StatusSection
        eyebrow="Prochaines"
        count={upcomingFeatures.length}
        background="#F5F5F7"
        items={upcomingFeatures}
      />

      <section className="w-full" style={{ background: '#EFF6FF', ...sectionPx, paddingBlock: 'clamp(80px, 10vw, 128px)' }}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#1D4ED8' }}>Vision produit</p>
            <h2 className="mt-2 text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.015em' }}>Évolution de la plateforme</h2>
          </div>
        </div>
        <p className="mt-4 text-sm" style={{ color: '#606065' }}>Une base solide conçue pour évoluer vers une plateforme complète du transport.</p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            'ERP opérationnel complet',
            'Automatisation des flux',
            'Intégration API',
            'Intelligence et optimisation',
          ].map(item => (
            <div key={item} className="rounded-2xl border px-5 py-4 transition-shadow duration-150 hover:shadow-sm" style={{ borderColor: '#BFDBFE', background: '#FFFFFF' }}>
              <p className="text-sm font-medium leading-5" style={{ color: '#0F172A' }}>{item}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
