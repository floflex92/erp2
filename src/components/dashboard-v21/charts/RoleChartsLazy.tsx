import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface PointDatum {
  label: string
  value: number
}

interface StackedDatum {
  label: string
  a: number
  b: number
}

interface DonutDatum {
  label: string
  value: number
}

interface GaugeProps {
  value: number
  target: number
  color?: string
}

export function V21LineChart({ data, color = '#2563eb' }: { data: PointDatum[]; color?: string }) {
  return (
    <div className="h-48 w-full sm:h-56">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #94a3b8' }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function V21BarChart({ data, colors = ['#2563eb', '#f59e0b'] }: { data: StackedDatum[]; colors?: [string, string] | string[] }) {
  return (
    <div className="h-48 w-full sm:h-56">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #94a3b8' }} />
          <Bar dataKey="a" fill={colors[0] ?? '#2563eb'} radius={[6, 6, 0, 0]} />
          <Bar dataKey="b" fill={colors[1] ?? '#f59e0b'} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function V21DonutChart({ data, colors = ['#2563eb', '#f59e0b', '#10b981'] }: { data: DonutDatum[]; colors?: string[] }) {
  return (
    <div className="h-48 w-full sm:h-56">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={`cell-${entry.label}-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #94a3b8' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function V21Gauge({ value, target, color = '#2563eb' }: GaugeProps) {
  const safeValue = Math.max(0, Math.min(100, value))
  const safeTarget = Math.max(0, Math.min(100, target))

  return (
    <div className="grid gap-4 md:grid-cols-[120px_1fr] md:items-center">
      <div
        className="mx-auto flex h-24 w-24 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${color} 0deg ${safeValue * 3.6}deg, rgba(148,163,184,0.25) ${safeValue * 3.6}deg 360deg)`,
        }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-sm font-semibold text-heading">
          {safeValue.toFixed(1)}%
        </div>
      </div>
      <div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-slate-900" style={{ width: `${safeTarget}%` }} />
        </div>
        <p className="mt-2 text-xs text-[color:var(--text-secondary)]">Cible: {safeTarget.toFixed(1)}%</p>
      </div>
    </div>
  )
}

export function V21FunnelChart({ data }: { data: PointDatum[] }) {
  const chartData = data.map(item => ({ name: item.label, value: item.value, fill: '#2563eb' }))

  return (
    <div className="h-48 w-full sm:h-56">
      <ResponsiveContainer>
        <FunnelChart>
          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #94a3b8' }} />
          <Funnel dataKey="value" data={chartData} isAnimationActive={false} />
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  )
}
