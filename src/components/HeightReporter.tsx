'use client'
import { useEffect } from 'react'

/** 아임웹 iframe 임베드 시 이중 스크롤 방지 — 문서 높이를 부모 창에 전달 (§7.3) */
export default function HeightReporter() {
  useEffect(() => {
    if (window.parent === window) return
    const post = () =>
      window.parent.postMessage({ type: 'kiam-height', height: document.body.scrollHeight }, '*')
    post()
    const ro = new ResizeObserver(post)
    ro.observe(document.body)
    return () => ro.disconnect()
  }, [])
  return null
}
