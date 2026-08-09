import { describe, it, expect } from 'vitest'
import { normalizeSccRows, normalizeDamageRows } from '@/lib/parse'

// 실제 엑셀 구조: 앞 2행 공백, 3행 헤더, 1열 공백 (Sample_National_and_Global 기준)
const sccSheet = [
  [null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null],
  [null, 'model', 'ECS', 'DR', 'mean', 'p05', 'p25', 'p50', 'p75', 'p95'],
  [null, 'FUND', 2.6, 2, 136.0, -49.6, 18.7, 86.7, 198.7, 505.7],
]
const damageSheet = [
  [null, null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null, null],
  [null, 'year', 'model', 'ECS', 'DR', 'mean', 'p05', 'p25', 'p50', 'p75', 'p95'],
  [null, 2025, 'FUND', 2.6, 2, 711958.5, -7820485.0, -3147577.3, 485441.8, 4309888.0, 9788168.5],
]

describe('normalizeSccRows', () => {
  it('헤더를 찾아 행을 SccRow로 변환한다', () => {
    const rows = normalizeSccRows(sccSheet)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({ model: 'FUND', ecs: 2.6, dr: 2, mean: 136.0, p05: -49.6, p25: 18.7, p50: 86.7, p75: 198.7, p95: 505.7 })
  })
  it('알 수 없는 모형이면 예외를 던진다', () => {
    const bad = [...sccSheet.slice(0, 3), [null, 'XXX', 2.6, 2, 1, 1, 1, 1, 1, 1]]
    expect(() => normalizeSccRows(bad)).toThrow(/XXX/)
  })
})

describe('normalizeDamageRows', () => {
  it('year 컬럼 포함 변환', () => {
    const rows = normalizeDamageRows(damageSheet)
    expect(rows[0].year).toBe(2025)
    expect(rows[0].model).toBe('FUND')
  })
})
