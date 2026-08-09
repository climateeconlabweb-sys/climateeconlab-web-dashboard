import { NextRequest, NextResponse } from 'next/server'
import { contentStore } from '@/lib/content'

// 로컬 편집 전용 (A-4): 운영 빌드에서는 404, 비밀번호 불일치 시 401
function guard(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }
  if (req.headers.get('x-admin-password') !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const denied = guard(req)
  if (denied) return denied
  return NextResponse.json(await contentStore.load())
}

export async function POST(req: NextRequest) {
  const denied = guard(req)
  if (denied) return denied
  const body = (await req.json()) as { action: 'saveDraft' | 'publish'; html?: string }
  if (body.action === 'saveDraft') {
    await contentStore.saveDraft(body.html ?? '')
  } else if (body.action === 'publish') {
    await contentStore.publish()
  } else {
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
