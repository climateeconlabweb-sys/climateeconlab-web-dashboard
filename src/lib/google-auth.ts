import { createSign } from 'crypto'
import { readFileSync } from 'fs'

// 구글 서비스 계정 OAuth2 (JWT bearer) — 비공개 시트를 읽기 위한 인증.
// googleapis 패키지를 쓰지 않는다: 필요한 건 JWT 서명 하나뿐이고 Node 내장 crypto로 충분하다.

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url')

export interface ServiceAccount { clientEmail: string; privateKey: string }

/**
 * 서비스 계정 키를 읽는다. 설정이 없으면 null (공개 링크 방식으로 동작).
 * 운영(CI·호스팅)에서는 GOOGLE_SERVICE_ACCOUNT_KEY에 JSON 내용을 통째로 넣고,
 * 로컬에서는 GOOGLE_SERVICE_ACCOUNT_KEY_FILE에 키 파일 경로만 적어도 된다.
 */
export function readServiceAccount(): ServiceAccount | null {
  const file = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE?.trim()
  const raw = (file ? readFileSync(file, 'utf8') : process.env.GOOGLE_SERVICE_ACCOUNT_KEY)?.trim()
  if (!raw) return null
  let json: { client_email?: string; private_key?: string }
  try {
    json = JSON.parse(raw)
  } catch {
    throw new Error(`서비스 계정 키가 올바른 JSON이 아닙니다 (${file ?? 'GOOGLE_SERVICE_ACCOUNT_KEY'})`)
  }
  if (!json.client_email || !json.private_key) {
    throw new Error(`서비스 계정 키에 client_email 또는 private_key가 없습니다 (${file ?? 'GOOGLE_SERVICE_ACCOUNT_KEY'})`)
  }
  return {
    clientEmail: json.client_email,
    // 환경변수로 옮기는 과정에서 줄바꿈이 \n 두 글자로 들어오는 경우가 흔하다
    privateKey: json.private_key.replace(/\\n/g, '\n'),
  }
}

/** 구글 토큰 엔드포인트에 제출할 서명된 JWT를 만든다 */
export function createAssertion(sa: ServiceAccount, scope: string, nowSec: number): string {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({
    iss: sa.clientEmail,
    scope,
    aud: TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 3600,   // 구글이 허용하는 최대 유효기간
  }))
  const body = `${header}.${claims}`
  return `${body}.${b64url(createSign('RSA-SHA256').update(body).sign(sa.privateKey))}`
}

let cached: { token: string; expiresAtSec: number } | null = null

/** 액세스 토큰을 발급받는다. 만료 1분 전까지는 재사용 */
export async function getAccessToken(sa: ServiceAccount, scope: string): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000)
  if (cached && cached.expiresAtSec > nowSec + 60) return cached.token

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: createAssertion(sa, scope, nowSec),
    }),
    cache: 'no-store',
  })
  if (!res.ok) {
    // 본문에 비밀값은 없고 원인 설명만 들어온다 (invalid_grant 등). 길이만 잘라 로그 오염 방지
    throw new Error(`구글 토큰 발급 실패: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`)
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) throw new Error('구글 토큰 응답에 access_token이 없습니다')
  cached = { token: json.access_token, expiresAtSec: nowSec + (json.expires_in ?? 3600) }
  return cached.token
}
