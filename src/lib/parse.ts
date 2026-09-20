import { MODELS, ECS_VALUES, DR_VALUES, YEARS, type SccRow, type DamageRow, type RegionalRow, type Dataset, type Model, type Ecs, type Dr } from './types'

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

/** Regional 시트: 1행 헤더(SIG_CD, SIDO_NM, SIGUNGU_NM, …, 값 컬럼) */
export function normalizeRegionalRows(sheet: unknown[][]): RegionalRow[] {
  const header = (sheet[0] ?? []).map((c) => String(c ?? '').trim())
  const vi = header.findIndex((h) => /^(value|test_var1)$/i.test(h))  // 확정 데이터의 값 컬럼명이 정해지면 여기 갱신
  if (vi < 0) throw new Error(`Regional: 값 컬럼(value/test_var1)을 찾을 수 없습니다 (헤더: ${header.join(', ')})`)
  return sheet.slice(1)
    .filter((r) => r?.[0] != null)
    .map((r) => ({
      sigCd: String(r[0]), sidoNm: String(r[1]), sigunguNm: String(r[2]),
      value: typeof r[vi] === 'number' ? (r[vi] as number) : null,
    }))
}

/** 시트 교체·수정으로 데이터가 깨졌는지 확인 — 문제 없으면 빈 배열 */
export function validateDataset(d: Dataset): string[] {
  const errors: string[] = []
  const check = (cond: boolean, msg: string) => { if (!cond) errors.push(msg) }
  for (const [name, rows] of [['Global_SCC', d.globalScc], ['KOR_SCC', d.korScc]] as const)
    check(rows.length === 36, `${name}: 36조합이 아님 (${rows.length})`)
  for (const [name, rows] of [['Global_Damage', d.globalDamage], ['KOR_Damage', d.korDamage]] as const) {
    check(rows.length === 36 * YEARS.length, `${name}: ${36 * YEARS.length}행이 아님 (${rows.length})`)
    check(new Set(rows.map((r) => r.year)).size === YEARS.length, `${name}: 연도 수 불일치`)
  }
  check(d.regional.length >= 220, `Regional: 지역 수 이상 (${d.regional.length})`)
  return errors
}
