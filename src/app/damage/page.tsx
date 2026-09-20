'use client'
import { useState } from 'react'
import TopNav from '@/components/TopNav'
import FilterBar from '@/components/FilterBar'
import { UNIT_CONFIG } from '@/data/config'
import { DEFAULT_FILTER, comboCount, matchRows } from '@/lib/filter'
import { DATA } from '@/lib/dataset'
import {
  ModelMedianLines, ModelSmallMultiples, YearConditionHeatmap, EndpointSlope, SparklineTable,
} from '@/components/analysis-charts'

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
      <strong style={{ fontSize: 15 }}>{title}</strong>
      <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', margin: '2px 0 12px' }}>{note}</p>
      {children}
    </div>
  )
}

/** 피해비용 분석 페이지 — 필터에 반응하는 다각도 시각화 */
export default function DamagePage() {
  const data = DATA
  const [filter, setFilter] = useState(DEFAULT_FILTER)
  const fx = data.fx   // 환율은 빌드 시점에 받아 데이터에 구워둔다 (정적 사이트라 실시간 조회 불가)

  const rows = matchRows(filter.region === 'KOR' ? data.korDamage : data.globalDamage, filter)
  const usd = filter.currency === 'USD'
  const cv = usd ? 10000 / fx.rate : 1
  const display = usd
    ? rows.map((r) => ({ ...r, mean: r.mean * cv, p05: r.p05 * cv, p25: r.p25 * cv, p50: r.p50 * cv, p75: r.p75 * cv, p95: r.p95 * cv }))
    : rows
  const unit = usd ? UNIT_CONFIG.damage.usdLabel : UNIT_CONFIG.damage.label
  const regionLabel = filter.region === 'KOR' ? '한국' : '전 세계'

  return (
    <main>
      <TopNav active="/damage" />
      <FilterBar value={filter} onChange={setFilter} />

      <section className="section">
        <h2>피해비용 분석</h2>
        <p className="section-note">
          {regionLabel} · 선택 조건 {comboCount(filter)}개 조합 · 단위 {unit}
          {usd && ` · 적용 환율 ${fx.rate.toLocaleString('ko-KR')}원/USD${fx.isFallback ? ' (기준 고정값)' : ''}`}
        </p>

        {display.length === 0 ? (
          <div className="empty-state">해당 조건의 데이터가 없습니다</div>
        ) : (
          <>
            <Section title="모형별 대표값 추이" note={`모형·연도별 조건 평균들의 중앙값 (${unit})`}>
              <ModelMedianLines rows={display} />
            </Section>

            <Section title="모형별 분포 상세" note={`모형별 전체 5~95 백분위수 외피와 평균들의 중앙값 (${unit}) · 세로축 범위는 모형별로 다름`}>
              <ModelSmallMultiples rows={display} />
            </Section>

            <Section title="연도×조건 히트맵" note={`조건·연도별 평균 (${unit}) · 색이 진할수록 큰 값 · 칸에 마우스를 올리면 값 표시`}>
              <YearConditionHeatmap rows={display} unitLabel={unit} />
            </Section>

            <Section title="2025년과 2100년 비교" note={`조건별 2025년·2100년 평균 두 시점 연결 (${unit})`}>
              <EndpointSlope rows={display} />
            </Section>

            <Section title="조건별 수치와 추세" note={`조건별 2025·2100년 평균과 연도별 평균 추세 (${unit})`}>
              <SparklineTable rows={display} unitLabel={unit} />
            </Section>
          </>
        )}
      </section>
    </main>
  )
}
