'use client'
import { useLayoutEffect, useRef, useState } from 'react'

export interface TooltipState {
  x: number
  y: number
  lines: string[]
}

/** 공통 툴팁 (§5.3) — 실측 크기로 위치를 클램프해 화면 밖으로 나가지 않게 한다 */
export default function ChartTooltip({ tooltip }: { tooltip: TooltipState | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!tooltip || !ref.current) {
      setPos(null)
      return
    }
    const { offsetWidth: w, offsetHeight: h } = ref.current
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = tooltip.x + 12
    if (left + w > vw - 8) left = tooltip.x - w - 12 // 오른쪽이 좁으면 왼쪽으로 플립
    left = Math.min(Math.max(8, left), vw - w - 8)   // 어느 쪽이든 화면 안으로 클램프
    let top = tooltip.y + 14
    if (top + h > vh - 8) top = tooltip.y - h - 14
    top = Math.min(Math.max(8, top), vh - h - 8)
    setPos({ left, top })
  }, [tooltip])

  if (!tooltip) return null
  return (
    <div
      ref={ref}
      className="chart-tooltip"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999, visibility: 'hidden' }}
    >
      {tooltip.lines.map((line, i) => (
        <div key={i} style={i === 0 ? { fontWeight: 600, marginBottom: 2 } : undefined}>{line}</div>
      ))}
    </div>
  )
}
