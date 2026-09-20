import { describe, it, expect } from 'vitest'
import { normalizeSccRows, normalizeDamageRows, normalizeRegionalRows, validateDataset } from '@/lib/parse'
import type { Dataset } from '@/lib/types'

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

describe('normalizeRegionalRows', () => {
  const regSheet = [
    ['SIG_CD', 'SIDO_NM', 'SIGUNGU_NM', 'test_var1'],
    ['11110', '서울특별시', '종로구', 1234.5],
    ['11140', '서울특별시', '중구', null],   // 값 없는 지역은 null 유지
    [null, null, null, null],               // 빈 행은 건너뜀
  ]
  it('헤더의 값 컬럼을 찾아 RegionalRow로 변환한다', () => {
    const rows = normalizeRegionalRows(regSheet)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ sigCd: '11110', sidoNm: '서울특별시', sigunguNm: '종로구', value: 1234.5 })
    expect(rows[1].value).toBeNull()
  })
  it('값 컬럼이 없으면 예외를 던진다', () => {
    expect(() => normalizeRegionalRows([['SIG_CD', 'SIDO_NM']])).toThrow(/값 컬럼/)
  })
})

describe('validateDataset', () => {
  // 시트를 잘못 고쳐 행 수가 틀어지면 잡아내야 한다
  const empty: Dataset = { globalScc: [], korScc: [], globalDamage: [], korDamage: [], regional: [] }
  it('행 수가 모자라면 오류 목록을 돌려준다', () => {
    const errors = validateDataset(empty)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.join('\n')).toMatch(/Global_SCC/)
  })
})
