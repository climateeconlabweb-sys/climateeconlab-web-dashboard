'use client'
import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3-scale'
import { area, line, curveMonotoneX } from 'd3-shape'
import { MODELS, YEARS, type DamageRow, type Model } from '@/lib/types'
import { summarizeByYear, type YearSummary } from '@/lib/stats'
import { fmtCompact, fmtFull } from '@/lib/format'
import ChartTooltip, { type TooltipState } from './ChartTooltip'
import YearSlider from './YearSlider'

const MODEL_COLOR: Record<Model, string> = {
  FUND: 'var(--model-fund)',
  PAGE: 'var(--model-page)',
  RICE: 'var(--model-rice)',
  WITCH: 'var(--model-witch)',
}
const DASHES = ['', '6 3', '2 3', '6 3 2 3']

const W = 920
const H = 440
const MARGIN = { top: 34, right: 16, bottom: 36, left: 72 }

const comboKey = (r: DamageRow) => `${r.model}|${r.ecs}|${r.dr}`

interface Combo {
  key: string
  model: Model
  ecs: number
  dr: number
  color: string
  dash: string
  points: DamageRow[]
}

interface Props {
  rows: DamageRow[]
  comboCount: number
  startYear: number
  onStartYearChange: (y: number) => void
  unitLabel: string
  svgId?: string
}

/** 피해비용 팬차트 (D-1~D-6) — 조합 4개 이하 개별 모드, 5개 이상 요약 모드 */
export default function FanChart({ rows, comboCount, startYear, onStartYearChange, unitLabel, svgId = 'damage-chart' }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [hoverYear, setHoverYear] = useState<number | null>(null)

  const visible = useMemo(() => rows.filter((r) => r.year >= startYear), [rows, startYear])
  const individual = comboCount <= 4

  const combos: Combo[] = useMemo(() => {
    if (!individual) return []
    const byKey = new Map<string, DamageRow[]>()
    visible.forEach((r) => byKey.set(comboKey(r), [...(byKey.get(comboKey(r)) ?? []), r]))
    const perModelIdx: Partial<Record<Model, number>> = {}
    return [...byKey.entries()]
      .map(([key, pts]) => {
        const { model, ecs, dr } = pts[0]
        return { key, model, ecs, dr, points: pts.sort((a, b) => a.year - b.year) }
      })
      .sort((a, b) => MODELS.indexOf(a.model) - MODELS.indexOf(b.model) || a.ecs - b.ecs || a.dr - b.dr)
      .map((c) => {
        const idx = perModelIdx[c.model] ?? 0
        perModelIdx[c.model] = idx + 1
        return { ...c, color: MODEL_COLOR[c.model], dash: DASHES[idx % DASHES.length] }
      })
  }, [visible, individual])

  const summary: YearSummary[] = useMemo(
    () => (individual ? [] : summarizeByYear(visible)),
    [visible, individual],
  )

  if (visible.length === 0) {
    return <div className="empty-state">해당 조건의 데이터가 없습니다</div>
  }

  const innerW = W - MARGIN.left - MARGIN.right
  const innerH = H - MARGIN.top - MARGIN.bottom

  // X축은 선택한 시작 연도~2100 (D-3 변경: 시작 연도 슬라이더)
  const x = scaleLinear().domain([startYear, 2100]).range([0, innerW])
  const yLo = individual ? Math.min(...visible.map((r) => r.p05)) : Math.min(...summary.map((s) => s.envLo))
  const yHi = individual ? Math.max(...visible.map((r) => r.p95)) : Math.max(...summary.map((s) => s.envHi))
  const y = scaleLinear().domain([yLo, yHi]).nice().range([innerH, 0])
  const yTicks = y.ticks(6)
  const xTicks = [...new Set([startYear, ...[2050, 2075, 2100].filter((t) => t > startYear)])]

  const envArea = area<YearSummary>().x((d) => x(d.year)).y0((d) => y(d.envLo)).y1((d) => y(d.envHi)).curve(curveMonotoneX)
  const bandArea = area<YearSummary>().x((d) => x(d.year)).y0((d) => y(d.meanMin)).y1((d) => y(d.meanMax)).curve(curveMonotoneX)
  const medianLine = line<YearSummary>().x((d) => x(d.year)).y((d) => y(d.medianMean)).curve(curveMonotoneX)
  const comboArea = area<DamageRow>().x((d) => x(d.year)).y0((d) => y(d.p05)).y1((d) => y(d.p95)).curve(curveMonotoneX)
  const comboLine = line<DamageRow>().x((d) => x(d.year)).y((d) => y(d.mean)).curve(curveMonotoneX)

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * innerW
    const rawYear = x.invert(px)
    const year = Math.min(2100, Math.max(startYear, Math.round(rawYear / 5) * 5))
    if (!YEARS.includes(year)) return
    setHoverYear(year)
    const lines: string[] = [`${year}년`]
    if (individual) {
      combos.forEach((c) => {
        const p = c.points.find((d) => d.year === year)
        if (p) lines.push(`${c.model} ${c.ecs}℃ ${c.dr}%: 평균 ${fmtFull(p.mean)} (p05 ${fmtFull(p.p05)} ~ p95 ${fmtFull(p.p95)})`)
      })
    } else {
      const s = summary.find((d) => d.year === year)
      if (s) {
        lines.push(`평균값들의 중앙값 ${fmtFull(s.medianMean)}`)
        lines.push(`조건 간 평균 범위 ${fmtFull(s.meanMin)} ~ ${fmtFull(s.meanMax)}`)
        lines.push(`전체 p05~p95 ${fmtFull(s.envLo)} ~ ${fmtFull(s.envHi)}`)
      }
    }
    setTooltip({ x: e.clientX, y: e.clientY, lines })
  }

  return (
    <div className="section-body">
      <div>
        <svg id={svgId} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="기후변화 피해비용 팬차트">
          <rect width={W} height={H} fill="var(--bg)" />
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {yTicks.map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x1={0} x2={innerW} stroke="var(--chart-grid)" />
                <text x={-10} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--ink-muted)">
                  {fmtCompact(t)}
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <text key={t} x={x(t)} y={innerH + 24} textAnchor="middle" fontSize={11.5} fill="var(--ink-muted)">
                {t}
              </text>
            ))}
            {yLo < 0 && <line x1={0} x2={innerW} y1={y(0)} y2={y(0)} stroke="var(--ink-muted)" strokeWidth={1} />}
            {/* Y축 단위 — 눈금 숫자와 겹치지 않도록 여백 위에 배치 */}
            <text x={-MARGIN.left + 6} y={-14} fontSize={11} fill="var(--ink-secondary)">{unitLabel}</text>

            {individual ? (
              combos.map((c) => (
                <g key={c.key}>
                  <path d={comboArea(c.points) ?? undefined} fill={c.color} fillOpacity={0.14} />
                  <path d={comboLine(c.points) ?? undefined} fill="none" stroke={c.color} strokeWidth={2} strokeDasharray={c.dash || undefined} />
                </g>
              ))
            ) : (
              <g>
                {/* 옅은 배경 = 전체 p05~p95 외피 (D-2) */}
                <path d={envArea(summary) ?? undefined} fill="var(--accent)" fillOpacity={0.09} />
                {/* 짙은 밴드 = 조건 간 평균값 범위 */}
                <path d={bandArea(summary) ?? undefined} fill="var(--accent)" fillOpacity={0.22} />
                {/* 실선 = 조건별 평균값들의 중앙값 */}
                <path d={medianLine(summary) ?? undefined} fill="none" stroke="var(--accent)" strokeWidth={2.2} />
              </g>
            )}

            {/* 크로스헤어 (D-6) */}
            {hoverYear !== null && (
              <line x1={x(hoverYear)} x2={x(hoverYear)} y1={0} y2={innerH} stroke="var(--ink-muted)" strokeDasharray="3 3" />
            )}
            <rect
              x={0} y={0} width={innerW} height={innerH} fill="transparent"
              onMouseMove={onMove}
              onMouseLeave={() => { setHoverYear(null); setTooltip(null) }}
            />
            <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--border)" />
          </g>
        </svg>
        {/* 슬라이더는 차트와 같은 폭 (차트 컬럼 내부) */}
        <YearSlider value={startYear} onChange={onStartYearChange} />
      </div>

      {/* 오른쪽 범례 (D-5) */}
      <div className="side-panel">
        <div className="legend">
          {individual ? (
            <>
              {combos.map((c) => (
                <div className="legend-row" key={c.key}>
                  <svg width={22} height={10}><line x1={0} x2={22} y1={5} y2={5} stroke={c.color} strokeWidth={2.5} strokeDasharray={c.dash || undefined} /></svg>
                  <span>{c.model} · {c.ecs}℃ · {c.dr}%</span>
                </div>
              ))}
              <div style={{ height: 6 }} />
              <div className="legend-row"><span>실선 = 평균(mean)</span></div>
              <div className="legend-row"><span>음영 = 5~95 백분위수</span></div>
            </>
          ) : (
            <>
              <div className="legend-row">
                <svg width={22} height={10}><line x1={0} x2={22} y1={5} y2={5} stroke="var(--accent)" strokeWidth={2.5} /></svg>
                <span>실선 = 조건별 평균값들의 중앙값</span>
              </div>
              <div className="legend-row">
                <span className="swatch" style={{ background: 'var(--accent)', opacity: 0.35 }} />
                <span>짙은 밴드 = 조건 간 평균값 범위</span>
              </div>
              <div className="legend-row">
                <span className="swatch" style={{ background: 'var(--accent)', opacity: 0.15 }} />
                <span>옅은 배경 = 전체 5~95 백분위수</span>
              </div>
            </>
          )}
        </div>
      </div>

      <ChartTooltip tooltip={tooltip} />
    </div>
  )
}
