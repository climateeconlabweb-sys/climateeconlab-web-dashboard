// 단위·환율 잠정 설정값 (PRD F-5, O-2) — 고객사 확정 시 이 파일만 수정
export const UNIT_CONFIG = {
  scc: { label: '만 원/tCO₂', provisional: true },
  damage: { label: '만 원', provisional: true },
  usdRate: null as number | null, // 환율 확정 전 null → 통화 토글 비활성(F-5)
}
