# 한국형 앙상블 기후변화통합평가모형 대시보드

기후변화로 생기는 **피해비용**과 **탄소의 사회적 비용(SCC)** 을 일반 이용자가
직접 조건을 바꿔가며 살펴볼 수 있게 만든 웹 대시보드다.
climateeconlab.com(아임웹) 페이지에 iframe으로 삽입해 서비스한다.

- 서비스 주소: <https://climateeconlabweb-sys.github.io/climateeconlab-web-dashboard/>
- 삽입 방법: `docs/imweb-embed.md`

## 무엇을 보여주는가

**SCC(탄소의 사회적 비용)** 는 이산화탄소 1톤을 더 배출했을 때 사회가 치르는 비용,
**피해비용**은 기후변화로 해당 연도에 발생하는 총 피해액이다.
두 값 모두 하나의 숫자로 딱 떨어지지 않고, 어떤 모형·가정을 쓰느냐에 따라 크게 달라진다.
그래서 이 대시보드는 **여러 조건의 결과를 한꺼번에 보여주는 것**을 목적으로 한다.

이용자가 고를 수 있는 조건은 네 가지다.

| 조건 | 선택지 | 의미 |
| --- | --- | --- |
| 지역 | 한국 / 전 세계 | 피해를 집계하는 범위 |
| 모형 | FUND · RICE · WITCH · PAGE | 국제적으로 널리 쓰이는 통합평가모형 4종 |
| 기후민감도(ECS) | 2.6 / 3.3 / 4.1 ℃ | CO₂가 두 배가 될 때 오르는 기온. 클수록 피해가 크다 |
| 할인율(DR) | 2 / 2.5 / 3 % | 미래의 피해를 현재 가치로 환산하는 비율. 낮을수록 미래를 무겁게 본다 |

모형·기후민감도·할인율은 "전체"로 둘 수 있고, 그러면 최대 36개 조합의 분포가
한 화면에 겹쳐 보인다. 대표값은 **중앙값(p50)** 을 쓰고, 불확실성은 5·25·75·95 백분위수
구간으로 함께 표시한다. 화폐 단위는 원(만 원)과 달러를 토글할 수 있다.

## 화면 구성

| 경로 | 화면 | 내용 |
| --- | --- | --- |
| `/` | 데이터 보기 | SCC 요약값·상자그림, 연도별 피해비용 팬차트, 시군구 단계구분도, 지역 분포 히스토그램·표 |
| `/damage` | 피해비용 분석 | 모형별 추세선, 스몰멀티플, 연도×조건 히트맵, 구간별 증가율 등 다각도 시각화 |
| `/model` | 모형 설명 | 연구소가 작성한 모형 소개 원고 |
| `/samples` | 데이터 샘플 보기 | 같은 데이터를 어떤 차트로 표현할 수 있는지 모아 본 카탈로그 |
| `/data` | 샘플 데이터 | 원자료를 표로 확인 (전 세계·한국 SCC, 피해비용, 지역별) |

모든 차트는 PNG 이미지와 엑셀 파일로 내려받을 수 있다.
연도 축은 2025년부터 2100년까지 5년 간격이다.

## 데이터가 흘러오는 길

수치는 연구소가 관리하는 **구글 시트**에 있고, 사이트는 그 시트를 읽어 만든다.

```
구글 시트(비공개) ──┐
                   ├─ GitHub Actions (15분마다) ─ npm run convert ─ next build ─ Pages 배포
서비스 계정 키(Secrets)┘
```

연구소가 시트 숫자를 고치면 별도 작업 없이 다음 빌드에 반영된다.
자세한 교체 절차는 `docs/data-update.md`에 있다.

---

아래는 이 저장소를 직접 만지는 사람을 위한 운영 메모다.

## 배포 구조 (GitHub Pages)

정적 사이트라 서버가 없으므로 **데이터는 빌드 시점에 확정**되고,
GitHub Actions가 주기적으로 다시 빌드해 최신 시트 내용을 반영한다.

- 워크플로: `.github/workflows/deploy.yml` (`main` push · 15분 주기 · 수동 실행)
- 실제 반영까지 **10~30분** 소요 (GitHub 스케줄은 혼잡 시 지연된다). 급하면 Actions 탭에서 수동 실행.
- 서비스 계정 키는 Secrets에만 있고 산출물(`out/`)에는 들어가지 않는다 — 워크플로가 매번 검사한다.
- 데이터가 언제 것인지는 화면에 띄우지 않는다. 확인이 필요하면 `src/data/dataset.json`의
  `generatedAt`(시트를 읽어온 시각)이나 Actions 탭의 마지막 성공 실행 시각을 본다.

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

Next.js(App Router) + React + D3 기반이다.

```bash
npm run dev          # http://localhost:3000 — 서버 모드라 /admin CMS도 동작한다
npm test             # 유닛 테스트
npm run build:pages  # GitHub Pages와 동일한 정적 산출물을 out/ 에 생성
```

`/admin`(원고 편집)은 로컬 전용이다. 원고를 고치면 `content/model-page.json`이 바뀌므로
**커밋·푸시해야 운영에 반영**된다.

### 커밋 신원

공개 저장소이므로 커밋에 개인 이메일이 들어가면 그대로 공개된다.
이 저장소의 커밋은 `climateeconlabweb-sys <…@users.noreply.github.com>` 로 통일한다.

- 배포 워크플로가 **noreply 주소가 아닌 커밋이 있으면 빌드를 중단**한다.
- 새 컴퓨터에서 작업한다면 clone 후 한 번 설정하거나(아래), 전역 `~/.gitconfig`에
  원격 주소 기준 조건부 설정을 넣어두면 clone할 때마다 자동 적용된다.

```bash
# 이 저장소에만 적용
git config user.name  "climateeconlabweb-sys"
git config user.email "329795782+climateeconlabweb-sys@users.noreply.github.com"
```

```gitconfig
# ~/.gitconfig — 이 계정의 저장소를 clone하면 자동 적용 (git 2.36+)
[includeIf "hasconfig:remote.*.url:https://github.com/climateeconlabweb-sys/**"]
	path = ~/.gitconfig-climateeconlab
```

## 더 보기

- 데이터 교체 절차: `docs/data-update.md`
- 아임웹 임베드: `docs/imweb-embed.md`
- 검수 결과: `docs/acceptance-check.md`
