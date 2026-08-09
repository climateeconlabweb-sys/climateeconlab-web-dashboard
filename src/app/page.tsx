'use client'
import { useState } from 'react'
import FilterBar from '@/components/FilterBar'
import BoxPlotChart from '@/components/BoxPlotChart'
import FanChart from '@/components/FanChart'
import YearSlider from '@/components/YearSlider'
import { UNIT_CONFIG } from '@/data/config'
import { DEFAULT_FILTER, comboCount, matchRows } from '@/lib/filter'
import type { SccRow, DamageRow, RegionalRow } from '@/lib/types'
import dataset from '@/data/dataset.json'

const data = dataset as unknown as {
  globalScc: SccRow[]
  korScc: SccRow[]
  globalDamage: DamageRow[]
  korDamage: DamageRow[]
  regional: RegionalRow[]
}

export default function Page() {
  const [filter, setFilter] = useState(DEFAULT_FILTER)
  const [endYear, setEndYear] = useState(2100)

  const sccRows = matchRows(filter.region === 'KOR' ? data.korScc : data.globalScc, filter)
  const damageRows = matchRows(filter.region === 'KOR' ? data.korDamage : data.globalDamage, filter)

  return (
    <main>
      <nav className="top-nav">
        <span className="brand">한국형 앙상블 기후변화통합평가모형</span>
        <a href="/" className="active">데이터 보기</a>
        <a href="/model">모형 설명</a>
      </nav>

      <FilterBar value={filter} onChange={setFilter} />

      <section className="section" id="scc">
        <h2>SCC — 탄소의 사회적 비용</h2>
        <p className="section-note">선택 조건 {comboCount(filter)}개 조합</p>
        <BoxPlotChart rows={sccRows} unitLabel={UNIT_CONFIG.scc.label} />
      </section>

      <section className="section" id="damage">
        <h2>기후변화 피해비용</h2>
        <p className="section-note">선택 조건 {comboCount(filter)}개 조합 · 연도 2025~{endYear}</p>
        <FanChart rows={damageRows} comboCount={comboCount(filter)} endYear={endYear} unitLabel={UNIT_CONFIG.damage.label} />
        <YearSlider value={endYear} onChange={setEndYear} />
      </section>

      <section className="section" id="regional">
        <h2>지역별 피해비용</h2>
        <p className="section-note">FUND 모형 기준, 모형 내장 조건 사용 · 시군구 {data.regional.length}곳 (상단 필터와 무관)</p>
        {/* Task 10: ChoroplethMap + Histogram + RegionTable */}
      </section>
    </main>
  )
}
