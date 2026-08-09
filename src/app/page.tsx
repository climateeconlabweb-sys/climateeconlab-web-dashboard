'use client'
import { useState } from 'react'
import FilterBar from '@/components/FilterBar'
import BoxPlotChart from '@/components/BoxPlotChart'
import FanChart from '@/components/FanChart'
import ChoroplethMap from '@/components/ChoroplethMap'
import Histogram from '@/components/Histogram'
import RegionTable from '@/components/RegionTable'
import { quantileThresholds } from '@/lib/stats'
import DownloadMenu from '@/components/DownloadMenu'
import { excelFileName } from '@/lib/download'
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
  const [startYear, setStartYear] = useState(2025)

  const sccRows = matchRows(filter.region === 'KOR' ? data.korScc : data.globalScc, filter)
  const damageRows = matchRows(filter.region === 'KOR' ? data.korDamage : data.globalDamage, filter)
  const regionalValues = data.regional.filter((r) => r.value !== null).map((r) => r.value as number)
  const regionalThresholds = quantileThresholds(regionalValues, 7)

  return (
    <main>
      <nav className="top-nav">
        <span className="brand">한국형 앙상블 기후변화통합평가모형</span>
        <a href="/" className="active">데이터 보기</a>
        <a href="/model">모형 설명</a>
      </nav>

      <FilterBar value={filter} onChange={setFilter} />

      <section className="section" id="scc">
        <div className="section-head">
          <div>
            <h2>SCC — 탄소의 사회적 비용</h2>
            <p className="section-note">선택 조건 {comboCount(filter)}개 조합</p>
          </div>
          <DownloadMenu svgId="scc-chart" imageName="SCC" excelRows={sccRows} excelName={excelFileName('SCC', filter)} />
        </div>
        <BoxPlotChart rows={sccRows} unitLabel={UNIT_CONFIG.scc.label} />
      </section>

      <section className="section" id="damage">
        <div className="section-head">
          <div>
            <h2>기후변화 피해비용</h2>
            <p className="section-note">선택 조건 {comboCount(filter)}개 조합 · 연도 {startYear}~2100</p>
          </div>
          <DownloadMenu svgId="damage-chart" imageName="피해비용" excelRows={damageRows} excelName={excelFileName('Damage', filter)} />
        </div>
        <FanChart rows={damageRows} comboCount={comboCount(filter)} startYear={startYear} onStartYearChange={setStartYear} unitLabel={UNIT_CONFIG.damage.label} />
      </section>

      <section className="section" id="regional">
        <div className="section-head">
          <div>
            <h2>지역별 피해비용</h2>
            <p className="section-note">FUND 모형 기준, 모형 내장 조건 사용 · 시군구 {data.regional.length}곳 (상단 필터와 무관)</p>
          </div>
          <DownloadMenu svgId="regional-map" imageName="지역별_피해비용" excelRows={data.regional} excelName={excelFileName('Regional', filter)} />
        </div>
        <div className="section-body">
          <ChoroplethMap regional={data.regional} unitLabel={UNIT_CONFIG.damage.label} />
          <div className="side-panel">
            <Histogram values={regionalValues} thresholds={regionalThresholds} />
            <RegionTable regional={data.regional} />
          </div>
        </div>
      </section>
    </main>
  )
}
