'use client'
import { useMemo } from 'react'
import type { SccRow } from '@/lib/types'
import type { FilterState } from '@/lib/filter'
import { fmtFull } from '@/lib/format'

export interface FxInfo {
  rate: number
  asOf: string | null
  isFallback: boolean
}

interface Props {
  rows: SccRow[]
  filter: FilterState
  fx: FxInfo
  unitLabel: string
}

/** SCC 대표값 카드 — 단일 조건이면 그 조건의 평균, 복수 조합이면 조건별 평균값들의 중앙값 */
export default function SccStatCard({ rows, filter, fx, unitLabel }: Props) {
  const stat = useMemo(() => {
    if (rows.length === 0) return null
    if (rows.length === 1) {
      const r = rows[0]
      return {
        value: r.mean,
        lo: r.p05,
        hi: r.p95,
        caption: `${r.model} · 기후민감도 ${r.ecs}℃ · 할인율 ${r.dr}% · 평균 기준`,
      }
    }
    const means = [...rows.map((r) => r.mean)].sort((a, b) => a - b)
    const mid = means.length % 2
      ? means[(means.length - 1) / 2]
      : (means[means.length / 2 - 1] + means[means.length / 2]) / 2
    return {
      value: mid,
      lo: Math.min(...rows.map((r) => r.p05)),
      hi: Math.max(...rows.map((r) => r.p95)),
      caption: `선택 조건 ${rows.length}개 조합 · 조건별 평균값들의 중앙값 기준`,
    }
  }, [rows])

  if (!stat) return null

  const region = filter.region === 'KOR' ? '한국' : '전 세계'
  const usdMode = filter.currency === 'USD'
  const toUsd = (v: number) => (v * 10000) / fx.rate
  const usdText = (v: number) =>
    toUsd(v).toLocaleString('en-US', { maximumFractionDigits: Math.abs(toUsd(v)) >= 100 ? 0 : 1 })
  // 주 숫자·범위는 선택 통화, 보조 줄은 반대 통화
  const mainText = usdMode ? `$${usdText(stat.value)}` : fmtFull(stat.value)
  const mainUnit = usdMode ? 'USD/tCO₂' : unitLabel
  const subText = usdMode ? `= ${fmtFull(stat.value)} ${unitLabel}` : `≈ $${usdText(stat.value)} USD`
  const rangeText = (v: number) => (usdMode ? `$${usdText(v)}` : fmtFull(v))
  const pos = stat.hi > stat.lo ? Math.min(1, Math.max(0, (stat.value - stat.lo) / (stat.hi - stat.lo))) : 0.5

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px',
      margin: '4px 0 20px', maxWidth: 520, background: 'var(--bg)',
    }}>
      <div style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>탄소의 사회적 비용 (SCC) — {region}</div>
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, margin: '2px 0' }}>
        {mainText}
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-secondary)', marginLeft: 6 }}>{mainUnit}</span>
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink-secondary)' }}>{subText}</div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-secondary)', marginBottom: 4 }}>
          <span>5%: {rangeText(stat.lo)}</span>
          <span>95%: {rangeText(stat.hi)}</span>
        </div>
        <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'linear-gradient(90deg, #dbe7ff, var(--accent))' }}>
          <div style={{
            position: 'absolute', left: `calc(${(pos * 100).toFixed(1)}% - 3px)`, top: -3,
            width: 6, height: 14, borderRadius: 3, background: 'var(--ink)',
          }} />
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-muted)' }}>{stat.caption}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
        적용 환율 {fx.rate.toLocaleString('ko-KR')}원/USD{fx.isFallback ? ' (기준 고정값)' : fx.asOf ? ` (${fx.asOf})` : ''}
      </div>
    </div>
  )
}
