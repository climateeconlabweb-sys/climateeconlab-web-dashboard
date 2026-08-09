import type { Model, Ecs, Dr } from './types'

export interface FilterState {
  region: 'Global' | 'KOR'
  model: 'ALL' | Model
  ecs: 'ALL' | Ecs
  dr: 'ALL' | Dr
  currency: 'KRW' | 'USD'
}
export const DEFAULT_FILTER: FilterState = { region: 'KOR', model: 'ALL', ecs: 'ALL', dr: 'ALL', currency: 'KRW' }

export function comboCount(f: FilterState): number {
  return (f.model === 'ALL' ? 4 : 1) * (f.ecs === 'ALL' ? 3 : 1) * (f.dr === 'ALL' ? 3 : 1)
}

export function matchRows<T extends { model: Model; ecs: Ecs; dr: Dr }>(rows: readonly T[], f: FilterState): T[] {
  return rows.filter((r) =>
    (f.model === 'ALL' || r.model === f.model) &&
    (f.ecs === 'ALL' || r.ecs === f.ecs) &&
    (f.dr === 'ALL' || r.dr === f.dr))
}
