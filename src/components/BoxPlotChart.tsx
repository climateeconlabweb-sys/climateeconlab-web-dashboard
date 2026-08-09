'use client'
import { useMemo, useState } from 'react'
import { scaleBand, scaleLinear } from 'd3-scale'
import { MODELS, type SccRow, type Model } from '@/lib/types'
import { fmtCompact, fmtFull } from '@/lib/format'
import ChartTooltip, { type TooltipState } from './ChartTooltip'

const MODEL_COLOR: Record<Model, string> = {
  FUND: 'var(--model-fund)',
  PAGE: 'var(--model-page)',
  RICE: 'var(--model-rice)',
  WITCH: 'var(--model-witch)',
}

const W = 920
const H = 440
const MARGIN = { top: 16, right: 16, bottom: 48, left: 64 }

const rowKey = (r: SccRow) => `${r.model}|${r.ecs}|${r.dr}`

interface Props {
  rows: SccRow[]
  unitLabel: string
  svgId?: string
}

export default function BoxPlotChart({ rows, unitLabel, svgId = 'scc-chart' }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          MODELS.indexOf(a.model) - MODELS.indexOf(b.model) || a.ecs - b.ecs || a.dr - b.dr,
      ),
    [rows],
  )

  if (sorted.length === 0) {
    return <div className="empty-state">해당 조건의 데이터가 없습니다</div>
  }

  const innerW = W - MARGIN.left - MARGIN.right
  const innerH = H - MARGIN.top - MARGIN.bottom
  const keys = sorted.map(rowKey)

  const x = scaleBand<string>().domain(keys).range([0, innerW]).paddingInner(0.35).paddingOuter(0.2)
  const lo = Math.min(...sorted.map((r) => r.p05))
  const hi = Math.max(...sorted.map((r) => Math.max(r.p95, r.mean)))
  const y = scaleLinear().domain([lo, hi]).nice().range([innerH, 0])
  const ticks = y.ticks(6)

  // 모형 그룹 라벨 위치 (S-2)
  const groupLabels = MODELS.filter((m) => sorted.some((r) => r.model === m)).map((m) => {
    const xs = sorted.filter((r) => r.model === m).map((r) => x(rowKey(r))! + x.bandwidth() / 2)
    return { model: m, cx: (Math.min(...xs) + Math.max(...xs)) / 2 }
  })

  const presentModels = groupLabels.map((g) => g.model)
  const bw = x.bandwidth()

  return (
    <div className="section-body">
      <div>
        <svg id={svgId} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="SCC 박스플롯">
          <rect width={W} height={H} fill="var(--bg)" />
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {/* 그리드 + Y축 */}
            {ticks.map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x1={0} x2={innerW} stroke="var(--chart-grid)" />
                <text x={-10} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--ink-muted)">
                  {fmtCompact(t)}
                </text>
              </g>
            ))}
            {/* 0 기준선 */}
            {lo < 0 && <line x1={0} x2={innerW} y1={y(0)} y2={y(0)} stroke="var(--ink-muted)" strokeWidth={1} />}
            {/* Y축 단위 */}
            <text x={-MARGIN.left + 6} y={-4} fontSize={11} fill="var(--ink-secondary)">{unitLabel}</text>

            {/* 박스 (S-1, S-3) */}
            {sorted.map((r) => {
              const key = rowKey(r)
              const cx = x(key)! + bw / 2
              const color = MODEL_COLOR[r.model]
              const dim = hovered !== null && hovered !== key
              return (
                <g
                  key={key}
                  opacity={dim ? 0.35 : 1}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => { setHovered(null); setTooltip(null) }}
                  onMouseMove={(e) =>
                    setTooltip({
                      x: e.clientX, y: e.clientY,
                      lines: [
                        `${r.model} · 기후민감도 ${r.ecs}℃ · 할인율 ${r.dr}%`,
                        `평균 ${fmtFull(r.mean)}`,
                        `p95 ${fmtFull(r.p95)} · p75 ${fmtFull(r.p75)}`,
                        `중앙값(p50) ${fmtFull(r.p50)}`,
                        `p25 ${fmtFull(r.p25)} · p05 ${fmtFull(r.p05)}`,
                      ],
                    })
                  }
                >
                  {/* 호버 판정 영역 */}
                  <rect x={x(key)! - 2} y={0} width={bw + 4} height={innerH} fill="transparent" />
                  {/* 수염 p05~p95 */}
                  <line x1={cx} x2={cx} y1={y(r.p05)} y2={y(r.p95)} stroke={color} strokeWidth={1.4} />
                  <line x1={cx - bw / 4} x2={cx + bw / 4} y1={y(r.p05)} y2={y(r.p05)} stroke={color} strokeWidth={1.4} />
                  <line x1={cx - bw / 4} x2={cx + bw / 4} y1={y(r.p95)} y2={y(r.p95)} stroke={color} strokeWidth={1.4} />
                  {/* 상자 p25~p75 */}
                  <rect
                    x={x(key)} y={y(r.p75)} width={bw} height={Math.max(1, y(r.p25) - y(r.p75))}
                    fill={color} fillOpacity={0.28} stroke={color} strokeWidth={1.4} rx={2}
                  />
                  {/* 중앙선 p50 */}
                  <line x1={x(key)} x2={x(key)! + bw} y1={y(r.p50)} y2={y(r.p50)} stroke={color} strokeWidth={2} />
                  {/* 평균 ◆ 마커 */}
                  <path
                    d={`M ${cx} ${y(r.mean) - 4} l 4 4 l -4 4 l -4 -4 Z`}
                    fill="var(--ink)" stroke="var(--bg)" strokeWidth={0.8}
                  />
                </g>
              )
            })}

            {/* 모형 그룹 라벨 */}
            {groupLabels.map((g) => (
              <text key={g.model} x={g.cx} y={innerH + 28} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="var(--ink-secondary)">
                {g.model}
              </text>
            ))}
            <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--border)" />
          </g>
        </svg>
      </div>

      {/* 오른쪽 범례 (S-5) — 인코딩 정의 + 모형별 색 */}
      <div className="side-panel">
        <div className="legend">
          {presentModels.map((m) => (
            <div className="legend-row" key={m}>
              <span className="swatch" style={{ background: MODEL_COLOR[m] }} />
              <span>{m}</span>
            </div>
          ))}
          <div style={{ height: 6 }} />
          <div className="legend-row"><span>상자 = 25~75 백분위수</span></div>
          <div className="legend-row"><span>가운데선 = 중앙값(p50)</span></div>
          <div className="legend-row"><span>수염 = 5~95 백분위수</span></div>
          <div className="legend-row"><span>◆ = 평균(mean)</span></div>
        </div>
      </div>

      <ChartTooltip tooltip={tooltip} />
    </div>
  )
}
