import * as XLSX from 'xlsx'
import { writeFileSync, mkdirSync } from 'fs'
import { normalizeSccRows, normalizeDamageRows } from '../src/lib/parse'
import { YEARS } from '../src/lib/types'

const NAT = 'data-source/Sample_National_and_Global (1).xlsx'  // 파일 교체 시 이 경로의 파일만 갈아끼움
const REG = 'data-source/Sample_Regional (1).xlsx'

function sheet(wb: XLSX.WorkBook, name: string): unknown[][] {
  const ws = wb.Sheets[name]
  if (!ws) throw new Error(`시트 없음: ${name}`)
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][]
}
const errors: string[] = []
const check = (cond: boolean, msg: string) => { if (!cond) errors.push(msg) }

const nat = XLSX.readFile(NAT)
const globalScc = normalizeSccRows(sheet(nat, 'Global_SCC'))
const korScc = normalizeSccRows(sheet(nat, 'KOR_SCC'))
const globalDamage = normalizeDamageRows(sheet(nat, 'Global_Damage'))
const korDamage = normalizeDamageRows(sheet(nat, 'KOR_Damage'))

for (const [name, rows] of [['Global_SCC', globalScc], ['KOR_SCC', korScc]] as const)
  check(rows.length === 36, `${name}: 36조합이 아님 (${rows.length})`)
for (const [name, rows] of [['Global_Damage', globalDamage], ['KOR_Damage', korDamage]] as const) {
  check(rows.length === 36 * YEARS.length, `${name}: ${36 * YEARS.length}행이 아님 (${rows.length})`)
  check(new Set(rows.map((r) => r.year)).size === YEARS.length, `${name}: 연도 수 불일치`)
}

// Regional: 1행 헤더 (SIG_CD, SIDO_NM, SIGUNGU_NM, ..., 값 컬럼)
const regWb = XLSX.readFile(REG)
const regRaw = sheet(regWb, regWb.SheetNames[0]) as (string | number | null)[][]
const header = regRaw[0].map((c) => String(c ?? ''))
const vi = header.findIndex((h) => /^(value|test_var1)$/i.test(h))  // 확정 데이터의 값 컬럼명이 정해지면 여기 갱신
check(vi >= 0, `Regional: 값 컬럼(value/test_var1)을 찾을 수 없음`)
const regional = regRaw.slice(1).filter((r) => r[0] != null).map((r) => ({
  sigCd: String(r[0]), sidoNm: String(r[1]), sigunguNm: String(r[2]),
  value: typeof r[vi] === 'number' ? (r[vi] as number) : null,
}))
check(regional.length >= 220, `Regional: 지역 수 이상 (${regional.length})`)

if (errors.length) { console.error('검증 실패:\n' + errors.join('\n')); process.exit(1) }
mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/dataset.json', JSON.stringify({ globalScc, korScc, globalDamage, korDamage, regional }))
console.log(`변환 완료: SCC ${globalScc.length}+${korScc.length}, Damage ${globalDamage.length}+${korDamage.length}, Regional ${regional.length}`)
