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
const MARGIN = { top: 34, right: 16, bottom: 48, left: 64 }

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
  // 축은 분포(p05~p95)만 따른다 — 평균은 마커로 그리지 않고 툴팁에서 확인한다
  const y = scaleLinear()
    .domain([Math.min(...sorted.map((r) => r.p05)), Math.max(...sorted.map((r) => r.p95))])
    .nice().range([innerH, 0])
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
            {y.domain()[0] < 0 && <line x1={0} x2={innerW} y1={y(0)} y2={y(0)} stroke="var(--ink-muted)" strokeWidth={1} />}
            {/* Y축 단위 — 눈금 숫자와 겹치지 않도록 여백 위에 배치 */}
            <text x={-MARGIN.left + 6} y={-14} fontSize={11} fill="var(--ink-secondary)">{unitLabel}</text>

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
                      title: `${r.model} · 기후민감도 ${r.ecs}℃ · 할인율 ${r.dr}%`,
                      rows: [
                        ['평균', fmtFull(r.mean)],
                        ['p95', fmtFull(r.p95)],
                        ['p75', fmtFull(r.p75)],
                        ['중앙값(p50)', fmtFull(r.p50)],
                        ['p25', fmtFull(r.p25)],
                        ['p05', fmtFull(r.p05)],
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
          {/* 인코딩 범례 — 글자 대신 실제 모양(글리프)으로 표시 */}
          <div className="legend-row">
            <svg width={22} height={16}>
              <rect x={4} y={3} width={14} height={10} rx={2} fill="var(--accent)" fillOpacity={0.28} stroke="var(--accent)" strokeWidth={1.4} />
            </svg>
            <span>상자 = 25~75 백분위수</span>
          </div>
          <div className="legend-row">
            <svg width={22} height={16}>
              <rect x={4} y={3} width={14} height={10} rx={2} fill="none" stroke="var(--border)" strokeWidth={1.2} />
              <line x1={4} x2={18} y1={8} y2={8} stroke="var(--accent)" strokeWidth={2} />
            </svg>
            <span>가운데선 = 중앙값(p50)</span>
          </div>
          <div className="legend-row">
            <svg width={22} height={16}>
              <line x1={11} x2={11} y1={2} y2={14} stroke="var(--accent)" strokeWidth={1.4} />
              <line x1={7} x2={15} y1={2} y2={2} stroke="var(--accent)" strokeWidth={1.4} />
              <line x1={7} x2={15} y1={14} y2={14} stroke="var(--accent)" strokeWidth={1.4} />
            </svg>
            <span>수염 = 5~95 백분위수</span>
          </div>
        </div>
      </div>

      <ChartTooltip tooltip={tooltip} />
    </div>
  )
}
