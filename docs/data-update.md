# 데이터 교체 절차 (PRD §6.3)

확정 데이터 수령 시, 그리고 이후 업데이트 발주 때마다 아래 4단계를 반복한다.

## 절차

1. **새 엑셀을 `data-source/`에 배치**
   - 동일 파일명으로 교체하는 것이 기본: `Sample_National_and_Global (1).xlsx`, `Sample_Regional (1).xlsx`
   - 파일명이 다르면 `scripts/convert-data.ts` 상단의 `NAT` / `REG` 경로 상수를 수정
2. **변환 실행**: `npm run convert`
   - 검증 항목: SCC 시트별 36조합, Damage 시트별 576행(36조합 × 16년), 연도 수 16, Regional 지역 수 220 이상, 값 컬럼 존재
   - 검증 실패 시 오류 목록이 출력되고 `src/data/dataset.json`은 갱신되지 않음 → 데이터 문제를 고객사에 회신
3. **미리보기 배포로 고객사 확인**: `npx vercel` (미리보기 URL 공유)
4. **운영 반영**: `npx vercel --prod`

## 컬럼/단위 변경 시 수정 위치

| 변경 | 수정 위치 |
|---|---|
| Regional 값 컬럼명 확정 (현재 test_var1) | `scripts/convert-data.ts`의 `vi` 정규식 |
| 단위(천 원/만 원)·환율 확정 | `src/data/config.ts` |
| SCC에 연도 축 추가 | `src/lib/types.ts`의 `SccRow.year` 활용 + 변환 스크립트에 검증 추가 |

## 리허설 기록

| 일시 | 내용 | 결과 |
|---|---|---|
| (Task 14에서 기록) | | |
