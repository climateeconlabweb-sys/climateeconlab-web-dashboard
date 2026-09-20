import { describe, it, expect } from 'vitest'
import { generateKeyPairSync, createVerify } from 'crypto'
import { createAssertion, readServiceAccount } from '@/lib/google-auth'

// 테스트용 키쌍 — 서명이 실제로 검증되는지 확인하려면 진짜 RSA 키가 필요하다
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})
const sa = { clientEmail: 'dash@proj.iam.gserviceaccount.com', privateKey }
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const NOW = 1_700_000_000

const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString())

describe('createAssertion', () => {
  const jwt = createAssertion(sa, SCOPE, NOW)
  const [header, claims, signature] = jwt.split('.')

  it('구글이 요구하는 헤더와 클레임을 담는다', () => {
    expect(decode(header)).toEqual({ alg: 'RS256', typ: 'JWT' })
    expect(decode(claims)).toEqual({
      iss: sa.clientEmail,
      scope: SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: NOW,
      exp: NOW + 3600,
    })
  })

  it('서명이 공개키로 검증된다', () => {
    const ok = createVerify('RSA-SHA256')
      .update(`${header}.${claims}`)
      .verify(publicKey, Buffer.from(signature, 'base64url'))
    expect(ok).toBe(true)
  })

  it('내용이 한 글자라도 바뀌면 검증에 실패한다', () => {
    const tampered = Buffer.from(JSON.stringify({ ...decode(claims), scope: 'https://www.googleapis.com/auth/drive' }))
      .toString('base64url')
    const ok = createVerify('RSA-SHA256')
      .update(`${header}.${tampered}`)
      .verify(publicKey, Buffer.from(signature, 'base64url'))
    expect(ok).toBe(false)
  })
})

describe('readServiceAccount', () => {
  const withEnv = <T>(value: string | undefined, fn: () => T): T => {
    const prev = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    if (value === undefined) delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    else process.env.GOOGLE_SERVICE_ACCOUNT_KEY = value
    try { return fn() } finally {
      if (prev === undefined) delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY
      else process.env.GOOGLE_SERVICE_ACCOUNT_KEY = prev
    }
  }

  it('설정이 없으면 null (공개 링크 방식으로 동작)', () => {
    expect(withEnv(undefined, readServiceAccount)).toBeNull()
  })

  it('환경변수로 옮기며 \\n 두 글자가 된 줄바꿈을 되살린다', () => {
    const key = JSON.stringify({ client_email: 'a@b.iam.gserviceaccount.com', private_key: '-----BEGIN-----\\nAAA\\n-----END-----' })
    const parsed = withEnv(key, readServiceAccount)
    expect(parsed?.privateKey).toBe('-----BEGIN-----\nAAA\n-----END-----')
  })

  it('JSON이 깨졌으면 알아볼 수 있는 오류를 낸다', () => {
    expect(() => withEnv('not json', readServiceAccount)).toThrow(/올바른 JSON/)
  })

  it('필수 항목이 빠졌으면 오류를 낸다', () => {
    expect(() => withEnv(JSON.stringify({ client_email: 'a@b' }), readServiceAccount)).toThrow(/private_key/)
  })
})
