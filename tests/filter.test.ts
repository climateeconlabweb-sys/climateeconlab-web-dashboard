import { describe, it, expect } from 'vitest'
import { DEFAULT_FILTER, comboCount, matchRows } from '@/lib/filter'

const rows = [
  { model: 'FUND', ecs: 2.6, dr: 2 }, { model: 'FUND', ecs: 3.3, dr: 2 },
  { model: 'RICE', ecs: 2.6, dr: 2.5 }, { model: 'PAGE', ecs: 4.1, dr: 3 },
] as const

describe('filter', () => {
  it('기본값: 한국, 전체·전체·전체, 원화 (F-2)', () => {
    expect(DEFAULT_FILTER).toEqual({ region: 'KOR', model: 'ALL', ecs: 'ALL', dr: 'ALL', currency: 'KRW' })
  })
  it('조합 수: 전체×전체×전체=36, 개별×전체×전체=9, 개별×개별×개별=1 (F-3)', () => {
    expect(comboCount(DEFAULT_FILTER)).toBe(36)
    expect(comboCount({ ...DEFAULT_FILTER, model: 'FUND' })).toBe(9)
    expect(comboCount({ ...DEFAULT_FILTER, model: 'FUND', ecs: 2.6, dr: 2 })).toBe(1)
  })
  it('matchRows: ALL은 통과, 개별 값은 일치만', () => {
    expect(matchRows(rows as never, DEFAULT_FILTER)).toHaveLength(4)
    expect(matchRows(rows as never, { ...DEFAULT_FILTER, model: 'FUND' })).toHaveLength(2)
    expect(matchRows(rows as never, { ...DEFAULT_FILTER, model: 'FUND', ecs: 3.3 })).toHaveLength(1)
  })
})
