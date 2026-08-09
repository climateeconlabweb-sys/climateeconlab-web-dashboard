import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// 이미지 업로드 (A-2) — 로컬 편집 전용, public/uploads/에 저장
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }
  if (req.headers.get('x-admin-password') !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 })
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
  const fileName = `${Date.now()}-${safeName}`
  const dir = path.join(process.cwd(), 'public', 'uploads')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()))
  return NextResponse.json({ url: `/uploads/${fileName}` })
}
