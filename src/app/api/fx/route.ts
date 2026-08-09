import { NextResponse } from 'next/server'

/** 일별 원/달러 환율 — 하루 1회 캐시, 실패 시 1,450원 고정 */
const FALLBACK_RATE = 1450

export async function GET() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 86400 } })
    if (!res.ok) throw new Error(`status ${res.status}`)
    const json = await res.json()
    const rate = json?.rates?.KRW
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) throw new Error('no KRW rate')
    const asOf = typeof json.time_last_update_unix === 'number'
      ? new Date(json.time_last_update_unix * 1000).toISOString().slice(0, 10)
      : null
    return NextResponse.json({ rate: Math.round(rate), asOf, isFallback: false })
  } catch {
    return NextResponse.json({ rate: FALLBACK_RATE, asOf: null, isFallback: true })
  }
}
