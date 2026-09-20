import { contentStore } from '@/lib/content'
import TopNav from '@/components/TopNav'
import ModelArticle from '@/components/ModelArticle'
import { BASE_PATH } from '@/lib/base-path'

/**
 * 모형 설명 페이지 (E-1~E-3) — CMS에서 게시한 콘텐츠 렌더링, 원고 미입고 시 자리표시자.
 * 정적 배포이므로 빌드 시점의 content/model-page.json 내용이 그대로 굳는다
 * (원고를 고치면 로컬에서 편집·커밋 → 다시 빌드).
 */
export default async function ModelPage() {
  const content = await contentStore.load()
  // 본문의 <img src="/model-img/..."> 는 Next가 손대지 않으므로 basePath를 직접 붙여준다
  const html = content.publishedHtml.trim().replaceAll('src="/model-img/', `src="${BASE_PATH}/model-img/`)

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
