'use client'
import { fmtCompact } from '@/lib/format'

/** 지도 범례 (M-2) — 반올림한 구간 경계, "미만/이상" 표기, 우측 패널 세로 배치 */
export default function MapLegend({ thresholds }: { thresholds: number[] }) {
  if (thresholds.length === 0) return null
  const bins = thresholds.length + 1
  const label = (i: number): string => {
    if (i === 0) return `${fmtCompact(thresholds[0])} 미만`
    if (i === bins - 1) return `${fmtCompact(thresholds[thresholds.length - 1])} 이상`
    return `${fmtCompact(thresholds[i - 1])} ~ ${fmtCompact(thresholds[i])}`
  }
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>범례</div>
      <div className="legend">
        {Array.from({ length: bins }, (_, i) => (
          <div key={i} className="legend-row">
            <span className="swatch" style={{ background: `var(--map-${i + 1})` }} />
            <span>{label(i)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
