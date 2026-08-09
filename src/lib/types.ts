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
