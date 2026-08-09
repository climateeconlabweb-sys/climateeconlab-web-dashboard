'use client'

export interface TooltipState {
  x: number
  y: number
  lines: string[]
}

/** 공통 툴팁 (§5.3) — 값과 그 값의 조건을 항상 함께 표시 */
export default function ChartTooltip({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null
  const flipX = typeof window !== 'undefined' && tooltip.x > window.innerWidth - 300
  return (
    <div
      className="chart-tooltip"
      style={{ left: flipX ? tooltip.x - 292 : tooltip.x + 12, top: tooltip.y + 12 }}
    >
      {tooltip.lines.map((line, i) => (
        <div key={i} style={i === 0 ? { fontWeight: 600, marginBottom: 2 } : undefined}>{line}</div>
      ))}
    </div>
  )
}
