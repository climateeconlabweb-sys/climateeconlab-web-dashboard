import { describe, it, expect } from 'vitest'
import { excelFileName } from '@/lib/download'
import { DEFAULT_FILTER } from '@/lib/filter'

describe('excelFileName (§5.2 파일명 규칙)', () => {
  it('개별 조합: 조건을 파일명에 표기', () => {
    expect(excelFileName('Damage', { ...DEFAULT_FILTER, model: 'FUND', ecs: 2.6, dr: 2 }))
      .toBe('KOR_Damage_FUND_ECS2.6_DR2.xlsx')
  })
  it('전체 선택: 전체로 표기', () => {
    expect(excelFileName('SCC', DEFAULT_FILTER)).toBe('KOR_SCC_전체.xlsx')
  })
  it('부분 선택: 축별 전체 표기', () => {
    expect(excelFileName('SCC', { ...DEFAULT_FILTER, region: 'Global', model: 'RICE' }))
      .toBe('Global_SCC_RICE_ECS전체_DR전체.xlsx')
  })
  it('지역별: 고정 파일명', () => {
    expect(excelFileName('Regional', DEFAULT_FILTER)).toBe('Regional_피해비용.xlsx')
  })
})
