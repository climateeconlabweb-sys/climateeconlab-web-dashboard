# 아임웹 임베드 가이드 (§7.3)

Climateeconlab.com(아임웹) 페이지에 대시보드를 삽입하는 방법.

## 삽입 코드

아임웹 편집기에서 "코드" 위젯을 추가하고 아래를 붙여넣는다. `<배포주소>`는 Vercel 배포 URL로 교체.

```html
<iframe
  id="kiam-frame"
  src="https://<배포주소>/"
  style="width:100%;border:0;display:block;"
  scrolling="no"
  title="한국형 앙상블 기후변화통합평가모형 대시보드"
></iframe>
<script>
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'kiam-height') {
      document.getElementById('kiam-frame').style.height = e.data.height + 'px';
    }
  });
</script>
```

- 대시보드가 자기 높이를 `postMessage`로 전달하고 위 스크립트가 iframe 높이를 맞춰서 **이중 스크롤이 생기지 않는다** (AC-10)
- `/admin`(관리자)은 임베드하지 않는다 — CSP(`frame-ancestors 'none'`)로 차단되어 있음
- 임베드 허용 도메인: climateeconlab.com, *.imweb.me — 다른 도메인에 삽입하려면 `next.config.ts`의 `EMBED_CSP` 수정

## 배포

```bash
npx vercel        # 미리보기 배포 (고객사 확인용 URL)
npx vercel --prod # 운영 배포
```
