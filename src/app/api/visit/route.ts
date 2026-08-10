import { NextResponse } from 'next/server'

/** 방문 로그 → 슬랙 알림 — SLACK_WEBHOOK_URL 미설정 시 아무 동작 안 함 */
export async function POST(req: Request) {
  const webhook = process.env.SLACK_WEBHOOK_URL
  if (!webhook) return new NextResponse(null, { status: 204 })

  const h = req.headers
  const ua = h.get('user-agent') ?? ''
  if (!ua || /bot|crawler|spider|preview|lighthouse|headless/i.test(ua)) {
    return new NextResponse(null, { status: 204 })
  }

  const body = await req.json().catch(() => ({}))
  const path = typeof body.path === 'string' ? body.path.slice(0, 200) : '?'
  const referrer = typeof body.referrer === 'string' && body.referrer ? body.referrer.slice(0, 200) : '직접 방문'

  // IP는 마지막 자리 마스킹 (개인정보 최소화)
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim()
  const maskedIp = ip.includes(':') ? ip.split(':').slice(0, 3).join(':') + ':…' : ip.replace(/\.\d+$/, '.xxx')

  const country = h.get('x-vercel-ip-country') ?? '?'
  const city = decodeURIComponent(h.get('x-vercel-ip-city') ?? '') || '?'
  const time = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'medium' })

  const text = [
    '🌏 대시보드 새 방문',
    `• 시간: ${time} (KST)`,
    `• 페이지: ${path}`,
    `• 위치: ${country} · ${city}`,
    `• 유입: ${referrer}`,
    `• IP: ${maskedIp || '?'}`,
    `• 브라우저: ${ua.slice(0, 160)}`,
  ].join('\n')

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch {
    // 슬랙 실패는 방문자 경험에 영향 주지 않음
  }
  return new NextResponse(null, { status: 204 })
}
