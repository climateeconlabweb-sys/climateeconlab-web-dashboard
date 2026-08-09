// 단위 잠정 설정값 (PRD F-5, O-2) — 고객사 확정 시 이 파일만 수정
// 환율은 /api/fx에서 일별 조회 (실패 시 1,450원 고정)
export const UNIT_CONFIG = {
  scc: { label: '만 원/tCO₂', usdLabel: 'USD/tCO₂', provisional: true },
  damage: { label: '만 원', usdLabel: 'USD', provisional: true },
}
