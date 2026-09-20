# 데이터 교체 절차 (PRD §6.3)

평상시 데이터는 **구글 시트를 고치면 GitHub Actions가 15분마다 자동 반영**한다(`README.md` 참고).
아래 절차는 엑셀 원본으로 데이터를 통째로 교체할 때만 쓴다.

## 절차

1. **새 엑셀을 `data-source/`에 배치**
   - 동일 파일명으로 교체하는 것이 기본: `Sample_National_and_Global (1).xlsx`, `Sample_Regional (1).xlsx`
   - 파일명이 다르면 `scripts/convert-data.ts` 상단의 `NAT` / `REG` 경로 상수를 수정
2. **변환 실행**: `npm run convert`
   - 검증 항목: SCC 시트별 36조합, Damage 시트별 576행(36조합 × 16년), 연도 수 16, Regional 지역 수 220 이상, 값 컬럼 존재
   - 검증 실패 시 오류 목록이 출력되고 `src/data/dataset.json`은 갱신되지 않음 → 데이터 문제를 고객사에 회신
3. **로컬 확인**: `npm run dev` 또는 `npm run build:pages`로 정적 산출물 점검
4. **운영 반영**: `main`에 커밋·푸시하면 GitHub Actions가 빌드·배포한다
   (Actions 탭에서 수동 실행도 가능)

## 컬럼/단위 변경 시 수정 위치

| 변경 | 수정 위치 |
|---|---|
| Regional 값 컬럼명 확정 (현재 test_var1) | `src/lib/parse.ts`의 `normalizeRegionalRows` 정규식 |
| 단위(천 원/만 원)·환율 확정 | `src/data/config.ts` |
| SCC에 연도 축 추가 | `src/lib/types.ts`의 `SccRow.year` 활용 + 변환 스크립트에 검증 추가 |

## 리허설 기록

| 일시 | 내용 | 결과 |
|---|---|---|
| 2026-08-09 | KOR_SCC 첫 행 mean 3.9671181 → 9999.123 수정 후 `npm run convert` → dataset.json 반영 확인 → 원본 복원 후 재변환으로 원복 확인 | 성공 (검증 리포트 정상, AC-12 충족) |
