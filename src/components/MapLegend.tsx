'use client'
import { fmtCompact } from '@/lib/format'

/** 지도 범례 (M-2) — 분위수 7구간 실제 경계값, 우측 패널에 세로 배치 */
export default function MapLegend({ values, thresholds }: { values: number[]; thresholds: number[] }) {
  if (values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>범례</div>
      <div className="legend">
        {Array.from({ length: 7 }, (_, i) => {
          const lo = i === 0 ? min : thresholds[i - 1]
          const hi = i === 6 ? max : thresholds[i]
          return (
            <div key={i} className="legend-row">
              <span className="swatch" style={{ background: `var(--map-${i + 1})` }} />
              <span>{fmtCompact(lo)} ~ {fmtCompact(hi)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
