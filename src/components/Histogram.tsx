'use client'
import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import { bin, max } from 'd3-array'
import { fmtCompact } from '@/lib/format'

const W = 280
const H = 150
const MARGIN = { top: 8, right: 6, bottom: 22, left: 6 }

/** 지역 값 분포 히스토그램 (M-6) — 지도 색 구간 경계를 점선으로 표시 */
export default function Histogram({ values, thresholds }: { values: number[]; thresholds: number[] }) {
  const { bars, x, yMax } = useMemo(() => {
    const lo = Math.min(...values)
    const hi = Math.max(...values)
    const x = scaleLinear().domain([lo, hi]).range([0, W - MARGIN.left - MARGIN.right])
    const bars = bin().domain([lo, hi]).thresholds(24)(values)
    return { bars, x, yMax: max(bars, (b) => b.length) ?? 1 }
  }, [values])

  const innerH = H - MARGIN.top - MARGIN.bottom
  const y = scaleLinear().domain([0, yMax]).range([innerH, 0])

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>값 분포</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="지역 값 분포 히스토그램">
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {bars.map((b, i) => (
            <rect
              key={i}
              x={x(b.x0!)}
              y={y(b.length)}
              width={Math.max(1, x(b.x1!) - x(b.x0!) - 1)}
              height={innerH - y(b.length)}
              fill="var(--map-5)"
              rx={1}
            />
          ))}
          {thresholds.map((t, i) => (
            <line key={i} x1={x(t)} x2={x(t)} y1={0} y2={innerH} stroke="var(--ink-muted)" strokeDasharray="3 3" strokeWidth={0.8} />
          ))}
          <line x1={0} x2={W - MARGIN.left - MARGIN.right} y1={innerH} y2={innerH} stroke="var(--border)" />
          <text x={0} y={innerH + 14} fontSize={10} fill="var(--ink-muted)">{fmtCompact(x.domain()[0])}</text>
          <text x={W - MARGIN.left - MARGIN.right} y={innerH + 14} fontSize={10} textAnchor="end" fill="var(--ink-muted)">{fmtCompact(x.domain()[1])}</text>
        </g>
      </svg>
      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>점선 = 지도 색 구간 경계</div>
    </div>
  )
}
