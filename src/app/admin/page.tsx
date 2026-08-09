'use client'
import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'

type Status = 'locked' | 'ready' | 'prod'

/** 관리자 편집 화면 (A-1~A-4) — 로컬 개발 환경 전용, 비밀번호 게이트 */
export default function AdminPage() {
  const [status, setStatus] = useState<Status>('locked')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: '',
    immediatelyRender: false,
  })

  useEffect(() => {
    const saved = sessionStorage.getItem('kiam-admin-pw')
    if (saved) void unlock(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor === null])

  async function unlock(pw: string) {
    const res = await fetch('/api/content', { headers: { 'x-admin-password': pw } })
    if (res.status === 404) { setStatus('prod'); return }
    if (!res.ok) { setMessage('비밀번호가 올바르지 않습니다'); return }
    const content = await res.json()
    sessionStorage.setItem('kiam-admin-pw', pw)
    setPassword(pw)
    setStatus('ready')
    setMessage('')
    editor?.commands.setContent(content.draftHtml || '<h2>한국형 앙상블 기후변화통합평가모형</h2><p></p>')
  }

  async function post(action: 'saveDraft' | 'publish') {
    const res = await fetch('/api/content', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ action, html: editor?.getHTML() ?? '' }),
    })
    setMessage(res.ok ? (action === 'publish' ? '게시 완료 — /model 에 반영되었습니다' : '임시저장 완료') : '저장 실패')
  }

  async function uploadImage(file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', headers: { 'x-admin-password': password }, body: form })
    if (res.ok) {
      const { url } = await res.json()
      editor?.chain().focus().setImage({ src: url }).run()
    } else {
      setMessage('이미지 업로드 실패')
    }
  }

  if (status === 'prod') {
    return <main className="section"><p className="section-note">이 화면은 로컬 편집 전용입니다. 운영 사이트에서는 사용할 수 없습니다.</p></main>
  }

  if (status === 'locked') {
    return (
      <main className="section" style={{ maxWidth: 420 }}>
        <h2>관리자 로그인</h2>
        <form onSubmit={(e) => { e.preventDefault(); void unlock(password) }} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="관리자 비밀번호" autoFocus
            style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
          />
          <button type="submit" className="filter-btn">확인</button>
        </form>
        {message && <p className="section-note" style={{ marginTop: 10 }}>{message}</p>}
      </main>
    )
  }

  return (
    <main className="section">
      <h2>모형 설명 페이지 편집</h2>
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>소제목</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()}>굵게</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()}>목록</button>
        <button type="button" onClick={() => fileInput.current?.click()}>이미지</button>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => void post('saveDraft')}>임시저장</button>
        <button type="button" onClick={() => setPreview(editor?.getHTML() ?? '')}>미리보기</button>
        <button type="button" onClick={() => void post('publish')} style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>게시</button>
      </div>
      <input
        ref={fileInput} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f); e.target.value = '' }}
      />
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, minHeight: 360 }}>
        <EditorContent editor={editor} />
      </div>
      {message && <p className="section-note" style={{ marginTop: 10 }}>{message}</p>}

      {preview !== null && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setPreview(null)}
        >
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', maxWidth: 760, width: '90%', maxHeight: '85vh', overflowY: 'auto', padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>미리보기</strong>
              <button type="button" className="filter-btn" onClick={() => setPreview(null)}>닫기</button>
            </div>
            <article dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        </div>
      )}
    </main>
  )
}
