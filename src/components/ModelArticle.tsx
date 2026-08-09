'use client'
import { useEffect, useRef, useState } from 'react'
import { MODELS, type Model } from '@/lib/types'

/** 모형 설명 필터 — 전체 또는 개별 모형의 설명만 표시. 콘텐츠의 data-model / data-part 구획 기준 */
export default function ModelArticle({ html }: { html: string }) {
  const [sel, setSel] = useState<'ALL' | Model>('ALL')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    root.querySelectorAll<HTMLElement>('[data-model]').forEach((el) => {
      el.style.display = sel === 'ALL' || el.dataset.model === sel ? '' : 'none'
    })
    root.querySelectorAll<HTMLElement>('[data-part]').forEach((el) => {
      el.style.display = sel === 'ALL' ? '' : 'none'
    })
  }, [sel, html])

  return (
    <div>
      <div className="model-filter" role="group" aria-label="모형 선택">
        <span className="group-label">모형</span>
        {(['ALL', ...MODELS] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`filter-btn${sel === m ? ' selected' : ''}`}
            onClick={() => setSel(m)}
          >
            {m === 'ALL' ? '전체' : m}
          </button>
        ))}
      </div>
      <article ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
