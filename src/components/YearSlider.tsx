'use client'

/** 연도 슬라이더 (D-4) — 시작 연도 선택(기본 2025), 5년 스냅, 시작 연도~2100 구간 표시 */
export default function YearSlider({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--ink-secondary)', flex: 'none' }}>시작 연도</span>
      <input
        type="range"
        min={2025}
        max={2095}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)' }}
        aria-label="표시 시작 연도"
      />
      <span style={{ fontSize: 13, color: 'var(--ink)', width: 88, flex: 'none' }}>{value} ~ 2100</span>
    </div>
  )
}
