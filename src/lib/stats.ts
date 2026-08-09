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

export function quantileThresholds(values: number[], bins = 7): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  return Array.from({ length: bins - 1 }, (_, i) => quantileSorted(sorted, (i + 1) / bins)!)
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
