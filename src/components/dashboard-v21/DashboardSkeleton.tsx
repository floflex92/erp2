export function DashboardSkeleton() {
  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`kpi-skeleton-${index}`}
            className="h-28 animate-pulse rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)]"
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]" />
        <div className="h-72 animate-pulse rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]" />
      </div>

      <div className="h-56 animate-pulse rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]" />
    </section>
  )
}
