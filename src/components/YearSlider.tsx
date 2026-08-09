'use client'

/** 연도 슬라이더 (D-4) — 2025~2100, 5년 스냅, 해당 시점까지의 그래프만 표시 */
export default function YearSlider({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--ink-secondary)', flex: 'none' }}>표시 기간</span>
      <input
        type="range"
        min={2025}
        max={2100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)' }}
        aria-label="표시할 마지막 연도"
      />
      <span style={{ fontSize: 13, color: 'var(--ink)', width: 88, flex: 'none' }}>2025 ~ {value}</span>
    </div>
  )
}
