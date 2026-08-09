'use client'
import { scaleBand, scaleLinear, scalePoint } from 'd3-scale'
import { line, area, curveMonotoneX } from 'd3-shape'
import { MODELS, ECS_VALUES, DR_VALUES, YEARS, type SccRow, type DamageRow, type RegionalRow, type Model } from '@/lib/types'
import { summarizeByYear } from '@/lib/stats'
import { quantileThresholds, binIndex } from '@/lib/stats'
import { fmtCompact, fmtFull } from '@/lib/format'

export const MODEL_COLOR: Record<Model, string> = {
  FUND: 'var(--model-fund)',
  PAGE: 'var(--model-page)',
  RICE: 'var(--model-rice)',
  WITCH: 'var(--model-witch)',
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  const n = s.length
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2
}

const comboLabel = (r: { model: Model; ecs: number; dr: number }) => `${r.model} ${r.ecs}℃ ${r.dr}%`

const modelOrder = (r: { model: Model; ecs: number; dr: number }, s: { model: Model; ecs: number; dr: number }) =>
  MODELS.indexOf(r.model) - MODELS.indexOf(s.model) || r.ecs - s.ecs || r.dr - s.dr

const W = 920

/* ── 1. 덤벨 차트: p05~p95 구간 + 평균점, 값 정렬 ─────────────────── */
export function DumbbellChart({ rows }: { rows: SccRow[] }) {
  const sorted = [...rows].sort((a, b) => b.mean - a.mean)
  const RH = 15, ML = 150, MR = 24, MT = 6, MB = 30
  const H = MT + MB + sorted.length * RH
  const x = scaleLinear()
    .domain([Math.min(...rows.map((r) => r.p05)), Math.max(...rows.map((r) => r.p95))])
    .nice()
    .range([ML, W - MR])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {x.ticks(6).map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={MT} y2={H - MB} stroke="var(--chart-grid)" />
          <text x={x(t)} y={H - MB + 16} textAnchor="middle" fontSize={10} fill="var(--ink-muted)">{fmtCompact(t)}</text>
        </g>
      ))}
      {sorted.map((r, i) => {
        const cy = MT + i * RH + RH / 2
        const c = MODEL_COLOR[r.model]
        return (
          <g key={comboLabel(r)}>
            <text x={ML - 8} y={cy} dy="0.32em" textAnchor="end" fontSize={9.5} fill="var(--ink-secondary)">{comboLabel(r)}</text>
            <line x1={x(r.p05)} x2={x(r.p95)} y1={cy} y2={cy} stroke={c} strokeWidth={1.8} opacity={0.5} />
            <circle cx={x(r.mean)} cy={cy} r={3.2} fill={c} />
          </g>
        )
      })}
    </svg>
  )
}

/* ── 2. 오차 막대 막대그래프: 평균 막대 + p05~p95 수염 ─────────────── */
export function ErrorBarChart({ rows }: { rows: SccRow[] }) {
  const sorted = [...rows].sort(modelOrder)
  const H = 340, ML = 56, MR = 12, MT = 10, MB = 40
  const keys = sorted.map(comboLabel)
  const x = scaleBand<string>().domain(keys).range([ML, W - MR]).paddingInner(0.35)
  const lo = Math.min(0, ...sorted.map((r) => r.p05))
  const hi = Math.max(...sorted.map((r) => r.p95))
  const y = scaleLinear().domain([lo, hi]).nice().range([H - MB, MT])
  const bw = x.bandwidth()
  const groups = MODELS.filter((m) => sorted.some((r) => r.model === m)).map((m) => {
    const xs = sorted.filter((r) => r.model === m).map((r) => x(comboLabel(r))! + bw / 2)
    return { m, cx: (Math.min(...xs) + Math.max(...xs)) / 2 }
  })
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {y.ticks(5).map((t) => (
        <g key={t}>
          <line x1={ML} x2={W - MR} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
          <text x={ML - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--ink-muted)">{fmtCompact(t)}</text>
        </g>
      ))}
      {sorted.map((r) => {
        const c = MODEL_COLOR[r.model]
        const bx = x(comboLabel(r))!
        const cx = bx + bw / 2
        return (
          <g key={comboLabel(r)}>
            <rect x={bx} y={Math.min(y(0), y(r.mean))} width={bw} height={Math.abs(y(r.mean) - y(0))} fill={c} fillOpacity={0.55} rx={2} />
            <line x1={cx} x2={cx} y1={y(r.p05)} y2={y(r.p95)} stroke={c} strokeWidth={1.4} />
            <line x1={cx - bw / 4} x2={cx + bw / 4} y1={y(r.p05)} y2={y(r.p05)} stroke={c} strokeWidth={1.4} />
            <line x1={cx - bw / 4} x2={cx + bw / 4} y1={y(r.p95)} y2={y(r.p95)} stroke={c} strokeWidth={1.4} />
          </g>
        )
      })}
      {groups.map((g) => (
        <text key={g.m} x={g.cx} y={H - 14} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink-secondary)">{g.m}</text>
      ))}
    </svg>
  )
}

/* ── 3. 히트맵: 모형별 기후민감도×할인율 격자, 색 = 중앙값 ─────────── */
export function SccHeatmap({ rows }: { rows: SccRow[] }) {
  const thresholds = quantileThresholds(rows.map((r) => r.p50), 7)
  const CW = 62, CH = 40, GAP = 26, ML = 44, MT = 34
  const gridW = CW * DR_VALUES.length
  const totalW = ML + MODELS.length * (gridW + GAP)
  const H = MT + CH * ECS_VALUES.length + 26
  const ecsDesc = [...ECS_VALUES].sort((a, b) => b - a)
  return (
    <svg viewBox={`0 0 ${totalW} ${H}`} style={{ width: '100%', maxWidth: totalW, height: 'auto' }}>
      {ecsDesc.map((e, ri) => (
        <text key={e} x={ML - 6} y={MT + ri * CH + CH / 2} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--ink-secondary)">{e}℃</text>
      ))}
      {MODELS.map((m, mi) => {
        const gx = ML + mi * (gridW + GAP)
        return (
          <g key={m}>
            <text x={gx + gridW / 2} y={16} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)">{m}</text>
            {ecsDesc.map((e, ri) =>
              DR_VALUES.map((d, ci) => {
                const row = rows.find((r) => r.model === m && r.ecs === e && r.dr === d)
                if (!row) return null
                const bin = binIndex(row.p50, thresholds)
                return (
                  <g key={`${e}-${d}`}>
                    <rect x={gx + ci * CW} y={MT + ri * CH} width={CW - 2} height={CH - 2} rx={3} fill={`var(--map-${bin + 1})`} />
                    <text
                      x={gx + ci * CW + (CW - 2) / 2} y={MT + ri * CH + (CH - 2) / 2} dy="0.32em"
                      textAnchor="middle" fontSize={10.5} fontWeight={600}
                      fill={bin >= 4 ? '#fff' : 'var(--ink)'}
                    >
                      {fmtFull(row.p50)}
                    </text>
                  </g>
                )
              }),
            )}
            {DR_VALUES.map((d, ci) => (
              <text key={d} x={gx + ci * CW + (CW - 2) / 2} y={MT + ECS_VALUES.length * CH + 14} textAnchor="middle" fontSize={10} fill="var(--ink-secondary)">{d}%</text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

/* ── 4. 민감도 기울기 차트: 기후민감도에 따른 평균 변화, 할인율별 패널 ─ */
export function SlopeSensitivity({ rows }: { rows: SccRow[] }) {
  const FW = 280, H = 260, ML = 48, MT = 30, MB = 34
  const y = scaleLinear().domain([0, Math.max(...rows.map((r) => r.mean))]).nice().range([H - MB, MT])
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {DR_VALUES.map((d) => {
        const x = scalePoint<number>().domain([...ECS_VALUES]).range([ML, FW - 20])
        return (
          <svg key={d} viewBox={`0 0 ${FW} ${H}`} style={{ width: '100%', maxWidth: FW, height: 'auto' }}>
            <text x={FW / 2} y={16} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)">할인율 {d}%</text>
            {y.ticks(4).map((t) => (
              <g key={t}>
                <line x1={ML} x2={FW - 20} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
                <text x={ML - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={9.5} fill="var(--ink-muted)">{fmtCompact(t)}</text>
              </g>
            ))}
            {ECS_VALUES.map((e) => (
              <text key={e} x={x(e)} y={H - 14} textAnchor="middle" fontSize={10} fill="var(--ink-secondary)">{e}℃</text>
            ))}
            {MODELS.map((m) => {
              const pts = [...ECS_VALUES]
                .map((e) => rows.find((r) => r.model === m && r.ecs === e && r.dr === d))
                .filter(Boolean) as SccRow[]
              if (pts.length === 0) return null
              return (
                <g key={m}>
                  <path
                    d={line<SccRow>().x((r) => x(r.ecs)!).y((r) => y(r.mean))(pts) ?? undefined}
                    fill="none" stroke={MODEL_COLOR[m]} strokeWidth={2}
                  />
                  {pts.map((r) => <circle key={r.ecs} cx={x(r.ecs)} cy={y(r.mean)} r={3} fill={MODEL_COLOR[m]} />)}
                </g>
              )
            })}
          </svg>
        )
      })}
    </div>
  )
}

/* ── 5. 정렬 점 차트: 중앙값 1개만, 값 정렬 ───────────────────────── */
export function DotPlot({ rows }: { rows: SccRow[] }) {
  const sorted = [...rows].sort((a, b) => b.p50 - a.p50)
  const RH = 15, ML = 150, MR = 24, MT = 6, MB = 30
  const H = MT + MB + sorted.length * RH
  const vals = rows.map((r) => r.p50)
  const x = scaleLinear().domain([Math.min(...vals), Math.max(...vals)]).nice().range([ML, W - MR])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {x.ticks(6).map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={MT} y2={H - MB} stroke="var(--chart-grid)" />
          <text x={x(t)} y={H - MB + 16} textAnchor="middle" fontSize={10} fill="var(--ink-muted)">{fmtCompact(t)}</text>
        </g>
      ))}
      {sorted.map((r, i) => {
        const cy = MT + i * RH + RH / 2
        return (
          <g key={comboLabel(r)}>
            <text x={ML - 8} y={cy} dy="0.32em" textAnchor="end" fontSize={9.5} fill="var(--ink-secondary)">{comboLabel(r)}</text>
            <line x1={ML} x2={W - MR} y1={cy} y2={cy} stroke="var(--chart-grid)" strokeDasharray="1 3" />
            <circle cx={x(r.p50)} cy={cy} r={3.5} fill={MODEL_COLOR[r.model]} />
          </g>
        )
      })}
    </svg>
  )
}

/* ── 6. 단순 막대: 중앙값 1개만, 가로 막대 정렬 ────────────────────── */
export function MedianBars({ rows }: { rows: SccRow[] }) {
  const sorted = [...rows].sort((a, b) => b.p50 - a.p50)
  const RH = 15, ML = 150, MR = 60, MT = 6, MB = 30
  const H = MT + MB + sorted.length * RH
  const vals = rows.map((r) => r.p50)
  const x = scaleLinear().domain([Math.min(0, ...vals), Math.max(...vals)]).nice().range([ML, W - MR])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {sorted.map((r, i) => {
        const by = MT + i * RH + 2
        const x0 = x(Math.min(0, r.p50))
        const x1 = x(Math.max(0, r.p50))
        return (
          <g key={comboLabel(r)}>
            <text x={ML - 8} y={by + (RH - 4) / 2} dy="0.32em" textAnchor="end" fontSize={9.5} fill="var(--ink-secondary)">{comboLabel(r)}</text>
            <rect x={x0} y={by} width={Math.max(1, x1 - x0)} height={RH - 4} rx={2} fill={MODEL_COLOR[r.model]} fillOpacity={0.75} />
            <text x={x1 + 5} y={by + (RH - 4) / 2} dy="0.32em" fontSize={9.5} fill="var(--ink-secondary)">{fmtFull(r.p50)}</text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── 7. 모형별 미니 카드: 모형당 중앙값 1개 ────────────────────────── */
export function ModelCards({ rows, unitLabel }: { rows: SccRow[]; unitLabel: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {MODELS.map((m) => {
        const vals = rows.filter((r) => r.model === m).map((r) => r.p50)
        if (vals.length === 0) return null
        return (
          <div key={m} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', minWidth: 150, flex: '1 1 150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-secondary)' }}>
              <span className="swatch" style={{ background: MODEL_COLOR[m] }} />{m}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 0' }}>{fmtFull(median(vals))}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{unitLabel} · 조건 중앙값들의 중앙값</div>
          </div>
        )
      })}
    </div>
  )
}

/* ── 8. 모형별 대표값 선 차트: 연도별 중앙값만 ─────────────────────── */
export function ModelMedianLines({ rows }: { rows: DamageRow[] }) {
  const H = 320, ML = 76, MR = 16, MT = 12, MB = 32
  const series = MODELS.map((m) => ({
    m,
    pts: YEARS.map((yr) => ({ yr, v: median(rows.filter((r) => r.model === m && r.year === yr).map((r) => r.mean)) })),
  })).filter((s) => s.pts.every((p) => Number.isFinite(p.v)))
  const x = scaleLinear().domain([2025, 2100]).range([ML, W - MR])
  const allV = series.flatMap((s) => s.pts.map((p) => p.v))
  const y = scaleLinear().domain([Math.min(0, ...allV), Math.max(...allV)]).nice().range([H - MB, MT])
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {y.ticks(5).map((t) => (
          <g key={t}>
            <line x1={ML} x2={W - MR} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
            <text x={ML - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--ink-muted)">{fmtCompact(t)}</text>
          </g>
        ))}
        {[2025, 2050, 2075, 2100].map((t) => (
          <text key={t} x={x(t)} y={H - 12} textAnchor="middle" fontSize={10.5} fill="var(--ink-muted)">{t}</text>
        ))}
        {series.map((s) => (
          <path
            key={s.m}
            d={line<{ yr: number; v: number }>().x((p) => x(p.yr)).y((p) => y(p.v)).curve(curveMonotoneX)(s.pts) ?? undefined}
            fill="none" stroke={MODEL_COLOR[s.m]} strokeWidth={2.2}
          />
        ))}
      </svg>
      <div className="legend" style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
        {series.map((s) => (
          <div className="legend-row" key={s.m}><span className="swatch" style={{ background: MODEL_COLOR[s.m] }} /><span>{s.m}</span></div>
        ))}
      </div>
    </div>
  )
}

/* ── 9. 모형별 스몰 멀티플즈: 모형당 외피 + 대표선 (세로축 범위 모형별 상이) ─ */
export function ModelSmallMultiples({ rows }: { rows: DamageRow[] }) {
  const FW = 450, FH = 230, ML = 72, MR = 10, MT = 26, MB = 26
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
      {MODELS.map((m) => {
        const mine = rows.filter((r) => r.model === m)
        if (mine.length === 0) return null
        const s = summarizeByYear(mine)
        const x = scaleLinear().domain([2025, 2100]).range([ML, FW - MR])
        const y = scaleLinear()
          .domain([Math.min(...s.map((d) => d.envLo)), Math.max(...s.map((d) => d.envHi))])
          .nice()
          .range([FH - MB, MT])
        const env = area<(typeof s)[number]>().x((d) => x(d.year)).y0((d) => y(d.envLo)).y1((d) => y(d.envHi)).curve(curveMonotoneX)
        const mid = line<(typeof s)[number]>().x((d) => x(d.year)).y((d) => y(d.medianMean)).curve(curveMonotoneX)
        return (
          <svg key={m} viewBox={`0 0 ${FW} ${FH}`} style={{ width: '100%', height: 'auto' }}>
            <text x={ML} y={14} fontSize={12} fontWeight={600} fill="var(--ink)">{m}</text>
            {y.ticks(4).map((t) => (
              <g key={t}>
                <line x1={ML} x2={FW - MR} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
                <text x={ML - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={9} fill="var(--ink-muted)">{fmtCompact(t)}</text>
              </g>
            ))}
            {[2025, 2100].map((t) => (
              <text key={t} x={x(t)} y={FH - 8} textAnchor="middle" fontSize={9.5} fill="var(--ink-muted)">{t}</text>
            ))}
            <path d={env(s) ?? undefined} fill={MODEL_COLOR[m]} fillOpacity={0.13} />
            <path d={mid(s) ?? undefined} fill="none" stroke={MODEL_COLOR[m]} strokeWidth={2} />
          </svg>
        )
      })}
    </div>
  )
}

/* ── 10. 연도×조건 히트맵: 색 = 평균 ──────────────────────────────── */
export function YearConditionHeatmap({ rows }: { rows: DamageRow[] }) {
  const combos = [...new Map(rows.map((r) => [comboLabel(r), r])).values()].sort(modelOrder)
  const thresholds = quantileThresholds(rows.map((r) => r.mean), 7)
  const RH = 14, ML = 150, MT = 22, MR = 8
  const CW = (W - ML - MR) / YEARS.length
  const H = MT + combos.length * RH + 6
  const cell = new Map(rows.map((r) => [`${comboLabel(r)}|${r.year}`, r.mean]))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {YEARS.map((yr, i) =>
        i % 2 === 0 ? (
          <text key={yr} x={ML + i * CW + CW / 2} y={14} textAnchor="middle" fontSize={9.5} fill="var(--ink-secondary)">{yr}</text>
        ) : null,
      )}
      {combos.map((r, ri) => (
        <g key={comboLabel(r)}>
          <text x={ML - 6} y={MT + ri * RH + RH / 2} dy="0.32em" textAnchor="end" fontSize={9} fill="var(--ink-secondary)">{comboLabel(r)}</text>
          {YEARS.map((yr, ci) => {
            const v = cell.get(`${comboLabel(r)}|${yr}`)
            if (v === undefined) return null
            return (
              <rect key={yr} x={ML + ci * CW} y={MT + ri * RH} width={CW - 1} height={RH - 1} fill={`var(--map-${binIndex(v, thresholds) + 1})`}>
                <title>{`${comboLabel(r)} · ${yr}년 · ${fmtFull(v)}`}</title>
              </rect>
            )
          })}
        </g>
      ))}
    </svg>
  )
}

/* ── 11. 2025→2100 기울기 차트: 조건당 시작·끝 두 값만 ─────────────── */
export function EndpointSlope({ rows }: { rows: DamageRow[] }) {
  const H = 480, X0 = 300, X1 = 640, MT = 30, MB = 20
  const byCombo = new Map<string, { a?: number; b?: number; model: Model }>()
  rows.forEach((r) => {
    const k = comboLabel(r)
    const e = byCombo.get(k) ?? { model: r.model }
    if (r.year === 2025) e.a = r.mean
    if (r.year === 2100) e.b = r.mean
    byCombo.set(k, e)
  })
  const pairs = [...byCombo.entries()].filter(([, e]) => e.a !== undefined && e.b !== undefined) as [string, { a: number; b: number; model: Model }][]
  const all = pairs.flatMap(([, e]) => [e.a, e.b])
  const y = scaleLinear().domain([Math.min(0, ...all), Math.max(...all)]).nice().range([H - MB, MT])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <text x={X0} y={16} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)">2025년</text>
      <text x={X1} y={16} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)">2100년</text>
      <line x1={X0} x2={X0} y1={MT} y2={H - MB} stroke="var(--border)" />
      <line x1={X1} x2={X1} y1={MT} y2={H - MB} stroke="var(--border)" />
      {y.ticks(6).map((t) => (
        <text key={t} x={X0 - 12} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="var(--ink-muted)">{fmtCompact(t)}</text>
      ))}
      {pairs.map(([k, e]) => (
        <g key={k}>
          <line x1={X0} x2={X1} y1={y(e.a)} y2={y(e.b)} stroke={MODEL_COLOR[e.model]} strokeWidth={1.5} opacity={0.55} />
          <circle cx={X0} cy={y(e.a)} r={2.2} fill={MODEL_COLOR[e.model]} />
          <circle cx={X1} cy={y(e.b)} r={2.2} fill={MODEL_COLOR[e.model]} />
        </g>
      ))}
    </svg>
  )
}

/* ── 12. 표 + 스파크라인: 조건별 평균 추세 미니 그래프 ─────────────── */
export function SparklineTable({ rows, unitLabel }: { rows: DamageRow[]; unitLabel: string }) {
  const combos = [...new Map(rows.map((r) => [comboLabel(r), r])).values()].sort(modelOrder)
  const byCombo = new Map<string, DamageRow[]>()
  rows.forEach((r) => {
    const k = comboLabel(r)
    byCombo.set(k, [...(byCombo.get(k) ?? []), r])
  })
  return (
    <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ position: 'sticky', top: 0, background: 'var(--surface)' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--ink-secondary)' }}>조건</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--ink-secondary)' }}>2025 ({unitLabel})</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--ink-secondary)' }}>2100 ({unitLabel})</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--ink-secondary)' }}>추세 (평균)</th>
          </tr>
        </thead>
        <tbody>
          {combos.map((c) => {
            const pts = (byCombo.get(comboLabel(c)) ?? []).sort((a, b) => a.year - b.year)
            const vals = pts.map((p) => p.mean)
            const lo = Math.min(...vals), hi = Math.max(...vals)
            const sx = scaleLinear().domain([2025, 2100]).range([2, 88])
            const sy = scaleLinear().domain([lo, hi === lo ? lo + 1 : hi]).range([18, 3])
            const v2025 = pts.find((p) => p.year === 2025)?.mean
            const v2100 = pts.find((p) => p.year === 2100)?.mean
            return (
              <tr key={comboLabel(c)} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '4px 8px' }}>{comboLabel(c)}</td>
                <td style={{ textAlign: 'right', padding: '4px 8px', fontVariantNumeric: 'tabular-nums' }}>{v2025 !== undefined ? fmtFull(v2025) : '—'}</td>
                <td style={{ textAlign: 'right', padding: '4px 8px', fontVariantNumeric: 'tabular-nums' }}>{v2100 !== undefined ? fmtFull(v2100) : '—'}</td>
                <td style={{ padding: '4px 8px' }}>
                  <svg width={90} height={21}>
                    <polyline
                      points={pts.map((p) => `${sx(p.year)},${sy(p.mean)}`).join(' ')}
                      fill="none" stroke={MODEL_COLOR[c.model]} strokeWidth={1.6}
                    />
                  </svg>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── 13. 지역 상위 20 막대 차트 ───────────────────────────────────── */
export function TopRegionsBar({ regional, unitLabel }: { regional: RegionalRow[]; unitLabel: string }) {
  const top = regional
    .filter((r): r is RegionalRow & { value: number } => r.value !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)
  const RH = 21, ML = 150, MR = 70, MT = 4
  const H = MT + top.length * RH + 8
  const x = scaleLinear().domain([0, Math.max(...top.map((r) => r.value))]).nice().range([ML, W - MR])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {top.map((r, i) => {
        const by = MT + i * RH + 3
        return (
          <g key={r.sigCd}>
            <text x={ML - 8} y={by + (RH - 6) / 2} dy="0.32em" textAnchor="end" fontSize={10.5} fill="var(--ink-secondary)">{r.sidoNm} {r.sigunguNm}</text>
            <rect x={ML} y={by} width={Math.max(1, x(r.value) - ML)} height={RH - 6} rx={2} fill="var(--map-6)" />
            <text x={x(r.value) + 5} y={by + (RH - 6) / 2} dy="0.32em" fontSize={10} fill="var(--ink-secondary)">{fmtCompact(r.value)}</text>
          </g>
        )
      })}
      <text x={ML} y={H - 2} fontSize={9.5} fill="var(--ink-muted)">단위: {unitLabel}</text>
    </svg>
  )
}

/* ── 14. 시도 타일맵: 지리 위치를 격자로 근사, 시군구 = 작은 타일 ──── */
const SIDO_POS: Record<string, [number, number]> = {
  '32': [3, 0],                                     // 강원
  '23': [0, 1], '11': [1, 1], '31': [2, 1],         // 인천 서울 경기
  '34': [0, 2], '29': [1, 2], '33': [2, 2], '37': [3, 2], // 충남 세종 충북 경북
  '35': [0, 3], '25': [1, 3], '22': [2, 3], '26': [3, 3], // 전북 대전 대구 울산
  '36': [0, 4], '24': [1, 4], '38': [2, 4], '21': [3, 4], // 전남 광주 경남 부산
  '39': [0, 5],                                     // 제주
}

export function SidoTileMap({ regional }: { regional: RegionalRow[] }) {
  const valued = regional.filter((r): r is RegionalRow & { value: number } => r.value !== null)
  const thresholds = quantileThresholds(valued.map((r) => r.value), 7)
  const bySido = new Map<string, RegionalRow[]>()
  regional.forEach((r) => {
    const p = r.sigCd.slice(0, 2)
    bySido.set(p, [...(bySido.get(p) ?? []), r])
  })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, maxWidth: 680 }}>
      {[...bySido.entries()]
        .filter(([p]) => SIDO_POS[p])
        .map(([p, rs]) => {
          const [col, row] = SIDO_POS[p]
          return (
            <div key={p} style={{ gridColumn: col + 1, gridRow: row + 1, border: '1px solid var(--border)', borderRadius: 8, padding: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 4 }}>{rs[0].sidoNm}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {rs.map((r) => (
                  <span
                    key={r.sigCd}
                    title={`${r.sidoNm} ${r.sigunguNm}${r.value !== null ? ` · ${fmtFull(r.value)}` : ' · 데이터 없음'}`}
                    style={{
                      width: 13, height: 13, borderRadius: 2,
                      background: r.value === null
                        ? 'repeating-linear-gradient(45deg, var(--surface) 0 3px, var(--border) 3px 4px)'
                        : `var(--map-${binIndex(r.value, thresholds) + 1})`,
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
    </div>
  )
}
