'use client'
import { useMemo } from 'react'
import type { RegionalRow } from '@/lib/types'
import { fmtFull } from '@/lib/format'

/** 지역별 값 순위표 (M-7) — 값이 큰 순서, 스크롤 */
export default function RegionTable({ regional }: { regional: RegionalRow[] }) {
  const sorted = useMemo(
    () =>
      [...regional].sort((a, b) => {
        if (a.value === null) return 1
        if (b.value === null) return -1
        return b.value - a.value
      }),
    [regional],
  )
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>지역별 값 — 숫자로 보기</div>
      <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: 'var(--surface)' }}>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--ink-secondary)', fontWeight: 600 }}>순위</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--ink-secondary)', fontWeight: 600 }}>지역</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--ink-secondary)', fontWeight: 600 }}>값</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.sigCd} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ textAlign: 'right', padding: '5px 8px', color: 'var(--ink-muted)' }}>{r.value === null ? '—' : i + 1}</td>
                <td style={{ padding: '5px 8px' }}>{r.sidoNm} {r.sigunguNm}</td>
                <td style={{ textAlign: 'right', padding: '5px 8px' }}>{r.value === null ? '데이터 없음' : fmtFull(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
