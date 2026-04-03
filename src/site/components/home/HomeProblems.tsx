import { homePainPoints } from '@/site/components/home/homeContent'

export default function HomeProblems() {
  return (
    <section className="site-reveal space-y-6 rounded-[2rem] border border-[var(--site-border)] bg-[var(--site-surface-soft)] p-6 shadow-[var(--site-shadow-card)] sm:p-8">
      <div className="max-w-3xl">
        <p className="site-eyebrow">Douleurs terrain</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--site-text)] sm:text-[2.2rem]">
          <span className="block">Planning chaotique.</span>
          <span className="block">Erreurs coûteuses.</span>
          <span className="block">Marge qui baisse.</span>
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {homePainPoints.map((item, index) => (
          <article
            key={item.title}
            className="site-reveal rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-5"
            style={{ animationDelay: `${80 + index * 60}ms` }}
          >
            <h3 className="text-lg font-semibold text-[var(--site-text)]">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--site-text-secondary)]">{item.description}</p>
          </article>
        ))}
      </div>
      <p className="text-sm font-medium text-[var(--site-text)]">Vous vous reconnaissez ? Reprenez le contrôle.</p>
    </section>
  )
}
