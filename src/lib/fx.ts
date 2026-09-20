import type { FxInfo } from './types'

// 원/달러 환율 — 정적 사이트라 브라우저에서 부를 수 없으므로 빌드할 때 받아 데이터 파일에 굽는다.
// 조회에 실패하면 고정값을 쓰고 isFallback으로 표시한다.
export const FALLBACK_RATE = 1450

export async function fetchFx(): Promise<FxInfo> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!res.ok) throw new Error(`status ${res.status}`)
    const json = await res.json()
    const rate = json?.rates?.KRW
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) throw new Error('no KRW rate')
    const asOf = typeof json.time_last_update_unix === 'number'
      ? new Date(json.time_last_update_unix * 1000).toISOString().slice(0, 10)
      : null
    return { rate: Math.round(rate), asOf, isFallback: false }
  } catch {
    return { rate: FALLBACK_RATE, asOf: null, isFallback: true }
  }
}
