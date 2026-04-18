import {
  V21BarChart,
  V21DonutChart,
  V21FunnelChart,
  V21Gauge,
  V21LineChart,
} from './RoleChartsLazy'

type PointDatum = { label: string; value: number }
type StackedDatum = { label: string; a: number; b: number }
type DonutDatum = { label: string; value: number }

type ChartKind = 'line' | 'bar' | 'donut' | 'gauge' | 'funnel'

interface ChartsHostProps {
  kind: ChartKind
  lineData?: PointDatum[]
  barData?: StackedDatum[]
  donutData?: DonutDatum[]
  funnelData?: PointDatum[]
  gaugeValue?: number
  gaugeTarget?: number
  colors?: string[]
}

export default function ChartsHost({
  kind,
  lineData = [],
  barData = [],
  donutData = [],
  funnelData = [],
  gaugeValue = 0,
  gaugeTarget = 0,
  colors,
}: ChartsHostProps) {
  if (kind === 'line') return <V21LineChart data={lineData} color={colors?.[0]} />
  if (kind === 'bar') return <V21BarChart data={barData} colors={colors} />
  if (kind === 'donut') return <V21DonutChart data={donutData} colors={colors} />
  if (kind === 'funnel') return <V21FunnelChart data={funnelData} />
  return <V21Gauge value={gaugeValue} target={gaugeTarget} color={colors?.[0]} />
}
