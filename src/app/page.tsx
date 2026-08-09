'use client'
import { useEffect, useState } from 'react'
import FilterBar from '@/components/FilterBar'
import SccStatCard, { type FxInfo } from '@/components/SccStatCard'
import BoxPlotChart from '@/components/BoxPlotChart'
import FanChart from '@/components/FanChart'
import ChoroplethMap from '@/components/ChoroplethMap'
import MapLegend from '@/components/MapLegend'
import Histogram from '@/components/Histogram'
import RegionTable from '@/components/RegionTable'
import { niceThresholds } from '@/lib/stats'
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
  const [fx, setFx] = useState<FxInfo>({ rate: 1450, asOf: null, isFallback: true })

  useEffect(() => {
    fetch('/api/fx')
      .then((r) => r.json())
      .then((j) => { if (typeof j?.rate === 'number' && j.rate > 0) setFx(j) })
      .catch(() => {}) // 실패 시 고정값 1,450원 유지
  }, [])

  const sccRows = matchRows(filter.region === 'KOR' ? data.korScc : data.globalScc, filter)
  const damageRows = matchRows(filter.region === 'KOR' ? data.korDamage : data.globalDamage, filter)

  // 달러 선택 시 표시 값만 환산 (만 원 × 10,000 ÷ 환율) — 엑셀 다운로드는 원자료(만 원) 유지
  const usd = filter.currency === 'USD'
  const cv = usd ? 10000 / fx.rate : 1
  const sccDisplay = usd
    ? sccRows.map((r) => ({ ...r, mean: r.mean * cv, p05: r.p05 * cv, p25: r.p25 * cv, p50: r.p50 * cv, p75: r.p75 * cv, p95: r.p95 * cv }))
    : sccRows
  const damageDisplay = usd
    ? damageRows.map((r) => ({ ...r, mean: r.mean * cv, p05: r.p05 * cv, p25: r.p25 * cv, p50: r.p50 * cv, p75: r.p75 * cv, p95: r.p95 * cv }))
    : damageRows
  const regionalDisplay = usd
    ? data.regional.map((r) => ({ ...r, value: r.value === null ? null : r.value * cv }))
    : data.regional
  const sccUnit = usd ? UNIT_CONFIG.scc.usdLabel : UNIT_CONFIG.scc.label
  const damageUnit = usd ? UNIT_CONFIG.damage.usdLabel : UNIT_CONFIG.damage.label

  const regionalValues = regionalDisplay.filter((r) => r.value !== null).map((r) => r.value as number)
  const regionalThresholds = niceThresholds(regionalValues, 7)

  return (
    <main>
      <nav className="top-nav">
        <span className="brand">한국형 앙상블 기후변화통합평가모형</span>
        <a href="/" className="active">데이터 보기</a>
        <a href="/model">모형 설명</a>
        <a href="/samples">데이터 샘플 보기</a>
        <a href="/data">샘플 데이터</a>
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
        <SccStatCard rows={sccRows} filter={filter} fx={fx} unitLabel={UNIT_CONFIG.scc.label} />
        <BoxPlotChart rows={sccDisplay} unitLabel={sccUnit} />
      </section>

      <section className="section" id="damage">
        <div className="section-head">
          <div>
            <h2>기후변화 피해비용</h2>
            <p className="section-note">선택 조건 {comboCount(filter)}개 조합 · 연도 {startYear}~2100</p>
          </div>
          <DownloadMenu svgId="damage-chart" imageName="피해비용" excelRows={damageRows} excelName={excelFileName('Damage', filter)} />
        </div>
        <FanChart rows={damageDisplay} comboCount={comboCount(filter)} startYear={startYear} onStartYearChange={setStartYear} unitLabel={damageUnit} />
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
          <ChoroplethMap regional={regionalDisplay} unitLabel={damageUnit} />
          <div className="side-panel">
            <MapLegend thresholds={regionalThresholds} />
            <Histogram values={regionalValues} thresholds={regionalThresholds} />
            <RegionTable regional={regionalDisplay} />
          </div>
        </div>
      </section>
    </main>
  )
}
