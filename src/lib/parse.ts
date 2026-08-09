import { MODELS, ECS_VALUES, DR_VALUES, type SccRow, type DamageRow, type Model, type Ecs, type Dr } from './types'

function findHeader(sheet: unknown[][], key: string): { headerIdx: number; cols: Record<string, number> } {
  for (let i = 0; i < sheet.length; i++) {
    const row = sheet[i] ?? []
    const j = row.findIndex((c) => typeof c === 'string' && c.trim().toLowerCase() === key)
    if (j >= 0) {
      const cols: Record<string, number> = {}
      row.forEach((c, idx) => { if (typeof c === 'string') cols[c.trim().toLowerCase()] = idx })
      return { headerIdx: i, cols }
    }
  }
  throw new Error(`헤더(${key})를 찾을 수 없습니다`)
}
function asModel(v: unknown): Model {
  if (typeof v === 'string' && (MODELS as readonly string[]).includes(v)) return v as Model
  throw new Error(`알 수 없는 모형: ${String(v)}`)
}
function asNum(v: unknown, label: string): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  throw new Error(`숫자가 아닌 값(${label}): ${String(v)}`)
}
function asEcs(v: unknown): Ecs {
  const n = asNum(v, 'ECS')
  if ((ECS_VALUES as readonly number[]).includes(n)) return n as Ecs
  throw new Error(`알 수 없는 ECS: ${n}`)
}
function asDr(v: unknown): Dr {
  const n = asNum(v, 'DR')
  if ((DR_VALUES as readonly number[]).includes(n)) return n as Dr
  throw new Error(`알 수 없는 DR: ${n}`)
}
const STAT_KEYS = ['mean', 'p05', 'p25', 'p50', 'p75', 'p95'] as const

export function normalizeSccRows(sheet: unknown[][]): SccRow[] {
  const { headerIdx, cols } = findHeader(sheet, 'model')
  const out: SccRow[] = []
  for (const row of sheet.slice(headerIdx + 1)) {
    if (row?.[cols['model']] == null) continue
    const base = { model: asModel(row[cols['model']]), ecs: asEcs(row[cols['ecs']]), dr: asDr(row[cols['dr']]) }
    const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, asNum(row[cols[k]], k)]))
    out.push({ ...base, ...stats } as SccRow)
  }
  return out
}

export function normalizeDamageRows(sheet: unknown[][]): DamageRow[] {
  const { headerIdx, cols } = findHeader(sheet, 'year')
  const out: DamageRow[] = []
  for (const row of sheet.slice(headerIdx + 1)) {
    if (row?.[cols['year']] == null) continue
    out.push({
      year: asNum(row[cols['year']], 'year'),
      model: asModel(row[cols['model']]), ecs: asEcs(row[cols['ecs']]), dr: asDr(row[cols['dr']]),
      ...Object.fromEntries(STAT_KEYS.map((k) => [k, asNum(row[cols[k]], k)])),
    } as DamageRow)
  }
  return out
}
