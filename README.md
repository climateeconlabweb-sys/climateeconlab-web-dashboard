This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 배포 구조 (GitHub Pages)

정적 사이트로 `https://climateeconlabweb-sys.github.io/climateeconlab-web-dashboard/` 에 배포한다. 서버가 없으므로
**데이터는 빌드 시점에 확정**되고, GitHub Actions가 주기적으로 다시 빌드해 최신 시트 내용을 반영한다.

```
구글 시트(비공개) ──┐
                   ├─ GitHub Actions (15분마다) ─ npm run convert ─ next build ─ Pages 배포
서비스 계정 키(Secrets)┘
```

- 워크플로: `.github/workflows/deploy.yml` (`main` push · 15분 주기 · 수동 실행)
- 실제 반영까지 **10~30분** 소요 (GitHub 스케줄은 혼잡 시 지연된다). 급하면 Actions 탭에서 수동 실행.
- 서비스 계정 키는 Secrets에만 있고 산출물(`out/`)에는 들어가지 않는다 — 워크플로가 매번 검사한다.
- 화면 오른쪽 위 "데이터 기준 …" 표시가 그 페이지 데이터가 언제 것인지 알려준다.

정적 배포라 **서버가 필요한 기능은 빠진다**: API 라우트, 커스텀 CSP 헤더, 방문 슬랙 알림(제거됨).
`/admin` CMS와 환율 조회는 로컬·빌드 시점에서만 동작한다(아래 참고).

로컬에서 정적 빌드를 그대로 재현하려면:

```bash
npm run build:pages   # out/ 생성. /admin·/api는 빌드 동안만 제외됐다가 자동 복구된다
```

## 데이터 소스 (구글 시트)

대시보드 수치는 구글 시트 2개에서 읽는다.

| 시트 | 필요한 탭 이름 |
| --- | --- |
| National & Global | `Global_SCC`, `KOR_SCC`, `Global_Damage`, `KOR_Damage` |
| Regional | 첫 번째 탭 / 헤더에 `value` 또는 `test_var1` 컬럼 |

### 시트 접근 방법 (둘 중 하나)

**A. 시트를 비공개로 유지 — 서비스 계정 (현재 채택)**

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성 (결제 등록 불필요)
2. **API 및 서비스 → 라이브러리**에서 `Google Drive API` 사용 설정
3. **IAM 및 관리자 → 서비스 계정**에서 계정 생성 → **키 → 새 키 만들기 → JSON** 다운로드
4. 구글 시트 2개를 각각 서비스 계정 이메일(`...@....iam.gserviceaccount.com`)에 **뷰어**로 공유
5. JSON 파일 **내용 전체**를 GitHub 저장소의
   **Settings → Secrets and variables → Actions → New repository secret** 에
   이름 `GOOGLE_SERVICE_ACCOUNT_KEY` 로 등록한다

로컬에서는 키 파일을 저장소 폴더에 두고 `.env.local`에 경로만 적어도 된다 (키 파일은 `.gitignore` 처리됨):

```
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./cliamteeconlab-04d356e679bd.json
```

저장소 루트의 `.json`은 `package.json` / `package-lock.json` / `tsconfig.json` 외에는
전부 `.gitignore` 처리되어 있다 — 키 파일 이름이 무엇이든 실수로 커밋되지 않는다.

**B. 링크 공개** — 두 시트 공유를 "링크가 있는 모든 사용자: 뷰어"로. 환경변수 불필요.

`GOOGLE_SERVICE_ACCOUNT_KEY`가 있으면 A, 없으면 B로 자동 동작한다.

연결 확인 (배포 전에 로컬에서):

```bash
npm run check:sheets
```

### 그 밖의 설정

시트 ID는 `src/lib/sheets.ts`에 기본값이 있고, 환경변수 `SHEET_NATIONAL_ID` / `SHEET_REGIONAL_ID`로
덮어쓸 수 있다(시트 교체 시 코드 수정 불필요).

데이터 파일(`src/data/dataset.json`)은 시트 내용 + 생성 시각 + 원/달러 환율을 담는다.
CI가 매 빌드마다 다시 만들지만, 수동으로도 갱신할 수 있다:

```bash
npm run convert          # 구글 시트에서 받아 갱신
npm run convert -- xlsx  # data-source/ 의 엑셀 파일에서 갱신 (시트 접근 없이)
```

시트를 못 읽으면 `convert`가 실패하고 배포도 중단된다 — 잘못된 데이터가 올라가는 대신
직전 배포본이 그대로 유지된다.

## 로컬 개발

```bash
npm run dev          # http://localhost:3000 — 서버 모드라 /admin CMS도 동작한다
npm test             # 유닛 테스트
npm run build:pages  # GitHub Pages와 동일한 정적 산출물을 out/ 에 생성
```

`/admin`(원고 편집)은 로컬 전용이다. 원고를 고치면 `content/model-page.json`이 바뀌므로
**커밋·푸시해야 운영에 반영**된다.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- 이 저장소의 상세 문서: `docs/` (데이터 교체 절차, 아임웹 임베드, 검수 결과)
