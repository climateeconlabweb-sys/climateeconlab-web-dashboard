'use client'
import { useState } from 'react'
import Link from 'next/link'
import { DATA } from '@/lib/dataset'

/** "2026-09-21 14:30" 형태 — 데이터가 언제 기준인지 보여주기 위해 */
function formatGeneratedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul',
  }).format(d)
}

const LINKS = [
  ['/', '데이터 보기'],
  ['/damage', '피해비용 분석'],
  ['/model', '모형 설명'],
  ['/samples', '데이터 샘플 보기'],
  ['/data', '샘플 데이터'],
] as const

/** 상단 공용 내비게이션 — 모바일에서는 햄버거 버튼으로 접힘 */
export default function TopNav({ active }: { active: string }) {
  const [open, setOpen] = useState(false)
  const generatedAt = formatGeneratedAt(DATA.generatedAt)
  return (
    <nav className="top-nav">
      <span className="brand">한국형 앙상블 기후변화통합평가모형</span>
      <button
        type="button"
        className="nav-toggle"
        aria-label="메뉴 열기"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
          <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <div className={`nav-links${open ? ' open' : ''}`}>
        {LINKS.map(([href, label]) => (
          // next/link를 써야 basePath(/climateeconlab-web-dashboard)가 자동으로 붙는다
          <Link key={href} href={href} className={active === href ? 'active' : undefined} onClick={() => setOpen(false)}>
            {label}
          </Link>
        ))}
      </div>
      {generatedAt && <span className="data-stamp">데이터 기준 {generatedAt}</span>}
    </nav>
  )
}
