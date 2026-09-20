# 아임웹 임베드 가이드 (§7.3)

Climateeconlab.com(아임웹) 페이지에 대시보드를 삽입하는 방법.

## 삽입 코드

아임웹 편집기에서 "코드" 위젯을 추가하고 아래를 붙여넣는다.

```html
<iframe
  id="kiam-frame"
  src="https://climateeconlabweb-sys.github.io/climateeconlab-web-dashboard/"
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
- `/admin`(관리자)은 **정적 배포에 포함되지 않는다** — 로컬에서만 동작하므로 임베드할 대상이 없다
- GitHub Pages는 커스텀 응답 헤더를 지원하지 않아 `EMBED_CSP`(`frame-ancestors`)가 적용되지 않는다.
  임베드 자체는 정상 동작하지만 **삽입 도메인을 제한하지는 못한다**. 제한이 필요하면
  헤더 설정이 가능한 호스팅(Cloudflare Pages 등)으로 옮겨야 한다.

## 배포

`main`에 푸시하면 GitHub Actions가 빌드해 Pages에 올린다 (`.github/workflows/deploy.yml`).
수동 실행은 저장소 Actions 탭 → "Build and deploy to GitHub Pages" → Run workflow.
