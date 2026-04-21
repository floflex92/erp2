/**
 * Charts du Cockpit Dirigeant — chargement paresseux.
 *
 * Isole l'import de recharts du bundle initial du widget.
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface OpsPoint {
  label: string
  ca: number
  ot: number
}

interface DonutDatum {
  label: string
  value: number
}

interface Props {
  kind: 'ops' | 'fleet' | 'finance'
  serie?: OpsPoint[]
  donut?: DonutDatum[]
}

const FLEET_COLORS = ['#0ea5e9', '#94a3b8']
const FINANCE_COLORS = ['#f59e0b', '#0ea5e9', '#22c55e', '#a855f7', '#ef4444']

function tooltipStyle() {
  return {
    background: 'var(--surface)',
    border: '1px solid var(--border-strong)',
    borderRadius: 10,
    color: 'var(--text-heading)',
    fontSize: 12,
    boxShadow: '0 8px 24px -10px rgba(15,23,42,0.30)',
  }
}

export default function CockpitDirigeantCharts({ kind, serie = [], donut = [] }: Props) {
  if (kind === 'ops') {
    return (
      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serie} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cdcaCa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.20)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-secondary)', fontSize: 10.5 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: 'var(--text-secondary)', fontSize: 10.5 }}
              tickLine={false}
              axisLine={false}
              width={42}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
            />
            <Tooltip
              contentStyle={tooltipStyle()}
              formatter={(value, name) => {
                const v = Number(value)
                return name === 'CA'
                  ? ([`${v.toLocaleString('fr-FR')} EUR`, 'CA'] as [string, string])
                  : ([`${v} OT`, 'Volume'] as [string, string])
              }}
              labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="ca"
              name="CA"
              stroke="#0ea5e9"
              strokeWidth={2.5}
              fill="url(#cdcaCa)"
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (kind === 'fleet') {
    const total = donut.reduce((s, x) => s + x.value, 0)
    if (total === 0) {
      return (
        <div
          className="flex h-40 items-center justify-center rounded-xl text-xs"
          style={{ background: 'var(--surface-soft)', color: 'var(--text-secondary)' }}
        >
          Aucun vehicule actif
        </div>
      )
    }
    return (
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donut}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={3}
              stroke="none"
            >
              {donut.map((_, i) => (
                <Cell key={i} fill={FLEET_COLORS[i % FLEET_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle()}
              formatter={(value, name) => [`${value}`, String(name)] as [string, string]}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // finance — bar charges
  if (!donut.length) {
    return (
      <div
        className="flex h-40 items-center justify-center rounded-xl text-xs"
        style={{ background: 'var(--surface-soft)', color: 'var(--text-secondary)' }}
      >
        Pas de charges sur la periode
      </div>
    )
  }
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={donut} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.20)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: 'var(--text-secondary)', fontSize: 10.5 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={88}
          />
          <Tooltip
            contentStyle={tooltipStyle()}
            formatter={(value) => [`${Number(value).toLocaleString('fr-FR')} EUR`, 'Charges'] as [string, string]}
            cursor={{ fill: 'rgba(148,163,184,0.10)' }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {donut.map((_, i) => (
              <Cell key={i} fill={FINANCE_COLORS[i % FINANCE_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
