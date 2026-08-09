'use client'
import { useState } from 'react'
import type { SccRow, DamageRow, RegionalRow } from '@/lib/types'
import { UNIT_CONFIG } from '@/data/config'
import { fmtFull } from '@/lib/format'
import dataset from '@/data/dataset.json'

const data = dataset as unknown as {
  globalScc: SccRow[]
  korScc: SccRow[]
  globalDamage: DamageRow[]
  korDamage: DamageRow[]
  regional: RegionalRow[]
}

const TABS = [
  { key: 'globalScc', label: '전 세계 SCC' },
  { key: 'korScc', label: '한국 SCC' },
  { key: 'globalDamage', label: '전 세계 피해비용' },
  { key: 'korDamage', label: '한국 피해비용' },
  { key: 'regional', label: '지역별 피해비용' },
] as const

type TabKey = (typeof TABS)[number]['key']

const th: React.CSSProperties = { textAlign: 'right', padding: '6px 10px', color: 'var(--ink-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }
const thL: React.CSSProperties = { ...th, textAlign: 'left' }
const td: React.CSSProperties = { textAlign: 'right', padding: '5px 10px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
const tdL: React.CSSProperties = { ...td, textAlign: 'left' }

function ScrollTable({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxHeight: 620, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>{children}</table>
    </div>
  )
}

const stickyRow: React.CSSProperties = { position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }

function SccTable({ rows }: { rows: SccRow[] }) {
  return (
    <ScrollTable>
      <thead>
        <tr style={stickyRow}>
          <th style={thL}>모형</th><th style={th}>기후민감도(℃)</th><th style={th}>할인율(%)</th>
          <th style={th}>평균</th><th style={th}>p05</th><th style={th}>p25</th><th style={th}>p50</th><th style={th}>p75</th><th style={th}>p95</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={tdL}>{r.model}</td><td style={td}>{r.ecs}</td><td style={td}>{r.dr}</td>
            <td style={td}>{fmtFull(r.mean)}</td><td style={td}>{fmtFull(r.p05)}</td><td style={td}>{fmtFull(r.p25)}</td>
            <td style={td}>{fmtFull(r.p50)}</td><td style={td}>{fmtFull(r.p75)}</td><td style={td}>{fmtFull(r.p95)}</td>
          </tr>
        ))}
      </tbody>
    </ScrollTable>
  )
}

function DamageTable({ rows }: { rows: DamageRow[] }) {
  return (
    <ScrollTable>
      <thead>
        <tr style={stickyRow}>
          <th style={thL}>모형</th><th style={th}>기후민감도(℃)</th><th style={th}>할인율(%)</th><th style={th}>연도</th>
          <th style={th}>평균</th><th style={th}>p05</th><th style={th}>p25</th><th style={th}>p50</th><th style={th}>p75</th><th style={th}>p95</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={tdL}>{r.model}</td><td style={td}>{r.ecs}</td><td style={td}>{r.dr}</td><td style={td}>{r.year}</td>
            <td style={td}>{fmtFull(r.mean)}</td><td style={td}>{fmtFull(r.p05)}</td><td style={td}>{fmtFull(r.p25)}</td>
            <td style={td}>{fmtFull(r.p50)}</td><td style={td}>{fmtFull(r.p75)}</td><td style={td}>{fmtFull(r.p95)}</td>
          </tr>
        ))}
      </tbody>
    </ScrollTable>
  )
}

function RegionalTable({ rows }: { rows: RegionalRow[] }) {
  return (
    <ScrollTable>
      <thead>
        <tr style={stickyRow}>
          <th style={thL}>행정구역 코드</th><th style={thL}>시도</th><th style={thL}>시군구</th><th style={th}>피해비용</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.sigCd} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={tdL}>{r.sigCd}</td><td style={tdL}>{r.sidoNm}</td><td style={tdL}>{r.sigunguNm}</td>
            <td style={td}>{r.value === null ? '데이터 없음' : fmtFull(r.value)}</td>
          </tr>
        ))}
      </tbody>
    </ScrollTable>
  )
}

/** 샘플 데이터 페이지 — 수령한 원자료 5종을 표로 열람 */
export default function DataPage() {
  const [tab, setTab] = useState<TabKey>('globalScc')
  const rows = data[tab]
  const unit = tab.endsWith('Scc') ? UNIT_CONFIG.scc.label : UNIT_CONFIG.damage.label

  return (
    <main>
      <nav className="top-nav">
        <span className="brand">한국형 앙상블 기후변화통합평가모형</span>
        <a href="/">데이터 보기</a>
        <a href="/model">모형 설명</a>
        <a href="/samples">데이터 샘플 보기</a>
        <a href="/data" className="active">샘플 데이터</a>
      </nav>

      <section className="section">
        <h2>샘플 데이터</h2>
        <p className="section-note">수령한 데이터 원자료입니다. 단위: {unit} · 총 {rows.length.toLocaleString('ko-KR')}행</p>

        <div className="filter-group" role="group" aria-label="데이터 선택" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`filter-btn${tab === t.key ? ' selected' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'globalScc' && <SccTable rows={data.globalScc} />}
        {tab === 'korScc' && <SccTable rows={data.korScc} />}
        {tab === 'globalDamage' && <DamageTable rows={data.globalDamage} />}
        {tab === 'korDamage' && <DamageTable rows={data.korDamage} />}
        {tab === 'regional' && <RegionalTable rows={data.regional} />}
      </section>
    </main>
  )
}
