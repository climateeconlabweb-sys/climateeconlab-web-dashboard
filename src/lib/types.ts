export const MODELS = ['FUND', 'RICE', 'WITCH', 'PAGE'] as const
export type Model = (typeof MODELS)[number]
export const ECS_VALUES = [2.6, 3.3, 4.1] as const
export const DR_VALUES = [2, 2.5, 3] as const
export type Ecs = (typeof ECS_VALUES)[number]
export type Dr = (typeof DR_VALUES)[number]
export const YEARS = Array.from({ length: 16 }, (_, i) => 2025 + i * 5)

export interface Stats { mean: number; p05: number; p25: number; p50: number; p75: number; p95: number }
export interface SccRow extends Stats { model: Model; ecs: Ecs; dr: Dr; year?: number /* SCC 연도 축 추가 가능성 대비(PRD §6.2) */ }
export interface DamageRow extends SccRow { year: number }
export interface RegionalRow { sigCd: string; sidoNm: string; sigunguNm: string; value: number | null }

export interface Dataset {
  globalScc: SccRow[]
  korScc: SccRow[]
  globalDamage: DamageRow[]
  korDamage: DamageRow[]
  regional: RegionalRow[]
}

export interface FxInfo { rate: number; asOf: string | null; isFallback: boolean }

/** 빌드 시점에 구글 시트에서 만들어 두는 데이터 파일 (src/data/dataset.json) */
export interface Snapshot extends Dataset {
  /** 이 데이터를 시트에서 읽어온 시각 (ISO) — 화면에 "데이터 기준"으로 표시 */
  generatedAt: string
  fx: FxInfo
}
