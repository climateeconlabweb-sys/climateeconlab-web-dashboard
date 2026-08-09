'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SccRow } from '@/lib/types'
import type { FilterState } from '@/lib/filter'
import { fmtFull } from '@/lib/format'

/** 값이 바뀔 때 이전 값에서 새 값으로 부드럽게 굴러가는 숫자 (450ms ease-out) */
function useAnimatedNumber(target: number, duration = 450): number {
  const [display, setDisplay] = useState(target)
  const displayRef = useRef(target)
  const fromRef = useRef(target)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = from + (target - from) * eased
      displayRef.current = v
      setDisplay(v)
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      fromRef.current = displayRef.current // 중간에 끊기면 현재 위치에서 이어서
    }
  }, [target, duration])

  return display
}

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

  // 필터 변경 시 숫자·마커가 이전 값에서 굴러가도록 애니메이션 (훅 순서 유지를 위해 조기 반환 전에 호출)
  const aValue = useAnimatedNumber(stat?.value ?? 0)
  const aLo = useAnimatedNumber(stat?.lo ?? 0)
  const aHi = useAnimatedNumber(stat?.hi ?? 0)

  if (!stat) return null

  const region = filter.region === 'KOR' ? '한국' : '전 세계'
  const usdMode = filter.currency === 'USD'
  const toUsd = (v: number) => (v * 10000) / fx.rate
  const usdText = (v: number) =>
    toUsd(v).toLocaleString('en-US', { maximumFractionDigits: Math.abs(toUsd(v)) >= 100 ? 0 : 1 })
  // 주 숫자·범위는 선택 통화, 보조 줄은 반대 통화
  const mainText = usdMode ? `$${usdText(aValue)}` : fmtFull(aValue)
  const mainUnit = usdMode ? 'USD/tCO₂' : unitLabel
  const subText = usdMode ? `= ${fmtFull(aValue)} ${unitLabel}` : `≈ $${usdText(aValue)} USD`
  const rangeText = (v: number) => (usdMode ? `$${usdText(v)}` : fmtFull(v))
  const pos = aHi > aLo ? Math.min(1, Math.max(0, (aValue - aLo) / (aHi - aLo))) : 0.5

  // 조건이 여럿일 때: 평균 기준 최저·최고 조건 미니 카드로 우측 공간 활용
  const lowest = rows.reduce((a, b) => (a.mean <= b.mean ? a : b))
  const highest = rows.reduce((a, b) => (a.mean >= b.mean ? a : b))
  const mini = (title: string, r: SccRow) => (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px',
      flex: '1 1 180px', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2,
    }}>
      <div style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>{title} · 평균 기준</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>
        {rangeText(r.mean)}
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-secondary)', marginLeft: 5 }}>{mainUnit}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{r.model} · 기후민감도 {r.ecs}℃ · 할인율 {r.dr}%</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch', margin: '4px 0 20px' }}>
    <div style={{
      border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px',
      flex: '2 1 340px', maxWidth: 520, background: 'var(--bg)',
    }}>
      <div style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>탄소의 사회적 비용 (SCC) — {region}</div>
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, margin: '2px 0' }}>
        {mainText}
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-secondary)', marginLeft: 6 }}>{mainUnit}</span>
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink-secondary)' }}>{subText}</div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-secondary)', marginBottom: 4 }}>
          <span>5%: {rangeText(aLo)}</span>
          <span>95%: {rangeText(aHi)}</span>
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
    {rows.length > 1 && mini('가장 낮은 조건', lowest)}
    {rows.length > 1 && mini('가장 높은 조건', highest)}
    </div>
  )
}
