const LINKS = [
  ['/', '데이터 보기'],
  ['/damage', '피해비용 분석'],
  ['/model', '모형 설명'],
  ['/samples', '데이터 샘플 보기'],
  ['/data', '샘플 데이터'],
] as const

/** 상단 공용 내비게이션 — active에 현재 경로 전달 */
export default function TopNav({ active }: { active: string }) {
  return (
    <nav className="top-nav">
      <span className="brand">한국형 앙상블 기후변화통합평가모형</span>
      {LINKS.map(([href, label]) => (
        <a key={href} href={href} className={active === href ? 'active' : undefined}>{label}</a>
      ))}
    </nav>
  )
}
