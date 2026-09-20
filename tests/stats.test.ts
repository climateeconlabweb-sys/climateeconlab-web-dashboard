import { describe, it, expect } from 'vitest'
import { summarizeByYear, quantileThresholds, binIndex, rankDesc, statExtent } from '@/lib/stats'

describe('summarizeByYear (D-2 요약 모드)', () => {
  const rows = [
    { year: 2025, mean: 10, p05: -5, p95: 30 }, { year: 2025, mean: 20, p05: 0, p95: 40 },
    { year: 2025, mean: 30, p05: 5, p95: 50 }, { year: 2030, mean: 100, p05: 50, p95: 200 },
  ] as never[]
  it('연도별로 mean 중앙값·mean 범위·전체 p05~p95 외피를 계산한다', () => {
    const s = summarizeByYear(rows)
    expect(s[0]).toEqual({ year: 2025, medianMean: 20, meanMin: 10, meanMax: 30, envLo: -5, envHi: 50 })
    expect(s[1].year).toBe(2030)
  })
})

describe('quantileThresholds/binIndex (M-2 7구간)', () => {
  const values = Array.from({ length: 70 }, (_, i) => i + 1) // 1..70
  it('내부 경계 6개를 만들고 구간마다 지역 수가 비슷하다', () => {
    const t = quantileThresholds(values, 7)
    expect(t).toHaveLength(6)
    const counts = Array(7).fill(0)
    values.forEach((v) => counts[binIndex(v, t)]++)
    counts.forEach((c) => expect(c).toBe(10))
  })
})

describe('rankDesc (M-4 전국 순위)', () => {
  it('값이 클수록 순위가 앞선다', () => {
    expect(rankDesc([30, 10, 20])).toEqual([1, 3, 2])
  })
})

describe('statExtent', () => {
  // 실제 KOR_SCC 시트가 이런 형태다: 평균이 p05보다 훨씬 작다.
  // 범위에 평균이 빠지면 평균 마커가 축 밖으로 잘려 범례에만 남는다.
  const 평균이_아래로_벗어난_행 = [{ p05: -1.59, p95: 25.93, mean: -33.06 }]

  it('평균이 p05보다 작아도 범위에 포함한다', () => {
    expect(statExtent(평균이_아래로_벗어난_행)).toEqual([-33.06, 25.93])
  })

  it('평균이 p95보다 커도 범위에 포함한다', () => {
    expect(statExtent([{ p05: 1, p95: 10, mean: 42 }])).toEqual([1, 42])
  })

  it('includeZero면 0을 기준선으로 포함한다', () => {
    expect(statExtent([{ p05: 5, p95: 10, mean: 7 }], true)).toEqual([0, 10])
  })

  it('여러 행의 최소·최대를 아우른다', () => {
    expect(statExtent([
      { p05: 0, p95: 5, mean: 2 },
      { p05: -8, p95: 3, mean: 1 },
      { p05: 1, p95: 9, mean: 11 },
    ])).toEqual([-8, 11])
  })

  it('빈 배열이면 축이 깨지지 않도록 기본 범위를 준다', () => {
    expect(statExtent([])).toEqual([0, 1])
  })
})
