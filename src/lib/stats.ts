import { quantileSorted, median, min, max } from 'd3-array'
import type { DamageRow } from './types'

export interface YearSummary { year: number; medianMean: number; meanMin: number; meanMax: number; envLo: number; envHi: number }

export function summarizeByYear(rows: Pick<DamageRow, 'year' | 'mean' | 'p05' | 'p95'>[]): YearSummary[] {
  const byYear = new Map<number, typeof rows>()
  rows.forEach((r) => byYear.set(r.year, [...(byYear.get(r.year) ?? []), r]))
  return [...byYear.entries()].sort(([a], [b]) => a - b).map(([year, g]) => ({
    year,
    medianMean: median(g, (d) => d.mean)!,
    meanMin: min(g, (d) => d.mean)!,
    meanMax: max(g, (d) => d.mean)!,
    envLo: min(g, (d) => d.p05)!,
    envHi: max(g, (d) => d.p95)!,
  }))
}

/**
 * 차트 세로축 범위 — 실제로 그리는 값(p05·p95·평균)을 모두 포함해야 한다.
 * 백분위수만으로 범위를 잡으면 평균이 p05보다 작거나 p95보다 큰 데이터에서
 * 평균 마커가 축 밖으로 잘려 범례에만 있고 화면에는 안 보이게 된다.
 * includeZero: 0을 기준선으로 쓰는 차트(막대 등)에서 0을 범위에 포함시킨다.
 */
export function statExtent(
  rows: readonly { p05: number; p95: number; mean: number }[],
  includeZero = false,
): [number, number] {
  const values = rows.flatMap((r) => [r.p05, r.p95, r.mean])
  if (includeZero) values.push(0)
  if (values.length === 0) return [0, 1]
  return [Math.min(...values), Math.max(...values)]
}

export function quantileThresholds(values: number[], bins = 7): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  return Array.from({ length: bins - 1 }, (_, i) => quantileSorted(sorted, (i + 1) / bins)!)
}

/** 분위수 경계를 유효숫자 2자리로 반올림한 "깔끔한" 구간 경계 — 지도 색과 범례가 동일 경계 사용 */
export function niceThresholds(values: number[], bins = 7): number[] {
  const round2 = (v: number): number => {
    if (v === 0) return 0
    const m = 10 ** (Math.floor(Math.log10(Math.abs(v))) - 1)
    return Math.round(v / m) * m
  }
  const out: number[] = []
  for (const t of quantileThresholds(values, bins).map(round2)) {
    if (out.length === 0 || t > out[out.length - 1]) out.push(t)
  }
  return out
}

export function binIndex(value: number, thresholds: number[]): number {
  let i = 0
  while (i < thresholds.length && value > thresholds[i]) i++
  return i
}

export function rankDesc(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => b - a)
  return values.map((v) => sorted.indexOf(v) + 1)
}
