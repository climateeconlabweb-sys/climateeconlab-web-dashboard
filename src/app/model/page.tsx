import { contentStore } from '@/lib/content'
import TopNav from '@/components/TopNav'
import ModelArticle from '@/components/ModelArticle'

export const dynamic = 'force-dynamic'

/** 모형 설명 페이지 (E-1~E-3) — CMS에서 게시한 콘텐츠 렌더링, 원고 미입고 시 자리표시자 */
export default async function ModelPage() {
  const content = await contentStore.load()
  const html = content.publishedHtml.trim()

  return (
    <main>
      <TopNav active="/model" />
      <section className="section" style={{ maxWidth: 860, margin: '0 auto' }}>
        {html ? (
          <ModelArticle html={html} />
        ) : (
          <article>
            <h2>한국형 앙상블 기후변화통합평가모형</h2>
            <p className="section-note">아래 내용은 연구소 원고 입고 후 게시됩니다.</p>
            <h3>개념</h3>
            <p className="section-note">— 준비 중 —</p>
            <h3>연구 배경</h3>
            <p className="section-note">— 준비 중 —</p>
            <h3>활용 방안</h3>
            <p className="section-note">— 준비 중 —</p>
          </article>
        )}
      </section>
    </main>
  )
}
