'use client'
import { useEffect } from 'react'

/** 방문 로그 전송 — 브라우저 세션당 1회, 실패해도 무시 */
export default function VisitLogger() {
  useEffect(() => {
    if (sessionStorage.getItem('visit-logged')) return
    sessionStorage.setItem('visit-logged', '1')
    fetch('/api/visit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: location.pathname, referrer: document.referrer }),
      keepalive: true,
    }).catch(() => {})
  }, [])
  return null
}
