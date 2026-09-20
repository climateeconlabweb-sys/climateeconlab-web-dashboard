'use client'
import TopNav from '@/components/TopNav'
import { UNIT_CONFIG } from '@/data/config'
import { DATA } from '@/lib/dataset'
import {
  DumbbellChart, ErrorBarChart, SccHeatmap, SlopeSensitivity,
  DotPlot, MedianBars, ModelCards,
  ModelMedianLines, ModelSmallMultiples, YearConditionHeatmap, EndpointSlope, SparklineTable,
  TopRegionsBar,
} from '@/components/analysis-charts'

function Badge({ kind }: { kind: 'full' | 'median' | 'partial' }) {
  const text = kind === 'full' ? '요약통계 전체 사용' : kind === 'median' ? '중앙값만 사용' : '일부 값만 사용'
  const color = kind === 'full' ? 'var(--accent)' : kind === 'median' ? 'var(--model-rice)' : 'var(--model-witch)'
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 600, color, border: `1px solid ${color}`,
      borderRadius: 20, padding: '2px 10px', flex: 'none',
    }}>
      {text}
    </span>
  )
}

function Sample({ no, title, dataUsed, badge, children }: {
  no: number
  title: string
  dataUsed: string
  badge: 'full' | 'median' | 'partial'
  children: React.ReactNode
}) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <strong style={{ fontSize: 15 }}>{no}. {title}</strong>
        <Badge kind={badge} />
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', margin: '0 0 12px' }}>사용 데이터: {dataUsed}</p>
      {children}
    </div>
  )
}

/** 시각화 후보 샘플 페이지 — 고객사가 보고 채택 여부를 결정하기 위한 비교용 */
export default function SamplesPage() {
  const data = DATA
  const scc = data.korScc
  const damage = data.korDamage
  const regional = data.regional
  const sccUnit = UNIT_CONFIG.scc.label
  const damageUnit = UNIT_CONFIG.damage.label

  return (
    <main>
      <TopNav active="/samples" />

      <section className="section">
        <h2>데이터 샘플 보기</h2>
        <p className="section-note">
          시각화 방식 검토용 샘플 페이지입니다. 모든 차트는 동일 데이터(한국 · 전체 조건 36개 · {sccUnit.includes('만') ? '만 원' : sccUnit} 기준)로 그렸습니다.
          채택할 번호를 알려주시면 본 화면(필터·툴팁·다운로드 연동)으로 완성합니다.
        </p>

        <h3 style={{ margin: '20px 0 12px' }}>A. SCC — 박스플롯의 대안</h3>

        <Sample no={1} title="덤벨 차트 (구간 + 평균점, 값 정렬)" badge="full"
          dataUsed={`조건별 p05·p95 구간과 평균 (${sccUnit})`}>
          <DumbbellChart rows={scc} />
        </Sample>

        <Sample no={2} title="오차 막대 막대그래프" badge="full"
          dataUsed={`조건별 평균(막대)과 p05~p95(수염) (${sccUnit})`}>
          <ErrorBarChart rows={scc} />
        </Sample>

        <Sample no={3} title="히트맵 (모형별 기후민감도×할인율 격자)" badge="median"
          dataUsed={`조건별 중앙값(p50) (${sccUnit}) — 색이 진할수록 큰 값`}>
          <SccHeatmap rows={scc} />
        </Sample>

        <Sample no={4} title="민감도 기울기 차트 (할인율별 패널)" badge="partial"
          dataUsed={`조건별 평균 (${sccUnit}) — 기후민감도 축에 따른 변화`}>
          <SlopeSensitivity rows={scc} />
        </Sample>

        <h3 style={{ margin: '28px 0 12px' }}>B. SCC — 중앙값 하나만 사용하는 단순 보기</h3>

        <Sample no={5} title="정렬 점 차트" badge="median"
          dataUsed={`조건별 중앙값(p50) (${sccUnit})`}>
          <DotPlot rows={scc} />
        </Sample>

        <Sample no={6} title="단순 막대 차트" badge="median"
          dataUsed={`조건별 중앙값(p50) (${sccUnit})`}>
          <MedianBars rows={scc} />
        </Sample>

        <Sample no={7} title="모형별 미니 카드" badge="median"
          dataUsed={`모형별 조건 중앙값들의 중앙값 (${sccUnit})`}>
          <ModelCards rows={scc} unitLabel={sccUnit} />
        </Sample>

        <h3 style={{ margin: '28px 0 12px' }}>C. 피해비용 — 팬차트의 대안·보조</h3>

        <Sample no={8} title="모형별 대표값 선 차트" badge="median"
          dataUsed={`모형·연도별 조건 평균들의 중앙값 (${damageUnit})`}>
          <ModelMedianLines rows={damage} />
        </Sample>

        <Sample no={9} title="모형별 스몰 멀티플즈 (외피 + 대표선)" badge="full"
          dataUsed={`모형별 전체 p05~p95 외피와 평균들의 중앙값 (${damageUnit}) · 세로축 범위는 모형별로 다름`}>
          <ModelSmallMultiples rows={damage} />
        </Sample>

        <Sample no={10} title="연도×조건 히트맵" badge="partial"
          dataUsed={`조건·연도별 평균 (${damageUnit}) — 색이 진할수록 큰 값`}>
          <YearConditionHeatmap rows={damage} unitLabel={damageUnit} />
        </Sample>

        <Sample no={11} title="2025→2100 기울기 차트" badge="partial"
          dataUsed={`조건별 2025년·2100년 평균 두 값 (${damageUnit})`}>
          <EndpointSlope rows={damage} />
        </Sample>

        <Sample no={12} title="표 + 스파크라인" badge="partial"
          dataUsed={`조건별 2025·2100년 평균과 연도별 평균 추세 (${damageUnit})`}>
          <SparklineTable rows={damage} unitLabel={damageUnit} />
        </Sample>

        <h3 style={{ margin: '28px 0 12px' }}>D. 지역별 — 지도의 보조</h3>

        <Sample no={13} title="상위 20개 지역 막대 차트" badge="partial"
          dataUsed={`시군구별 피해비용 상위 20곳 (${damageUnit})`}>
          <TopRegionsBar regional={regional} unitLabel={damageUnit} />
        </Sample>
      </section>
    </main>
  )
}
