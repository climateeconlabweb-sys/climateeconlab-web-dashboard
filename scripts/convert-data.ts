import * as XLSX from 'xlsx'
import { writeFileSync, mkdirSync } from 'fs'
import { normalizeSccRows, normalizeDamageRows, normalizeRegionalRows, validateDataset } from '../src/lib/parse'
import { fetchDataset } from '../src/lib/sheets'
import { fetchFx } from '../src/lib/fx'
import type { Dataset } from '../src/lib/types'

// 평소에는 구글 시트를 실시간으로 읽으므로 이 스크립트는 "스냅샷 갱신"용이다.
// 스냅샷 = 시트를 못 읽을 때 대신 보여줄 최근 저장본 (src/data/dataset.json).
//   npm run convert          구글 시트에서 받아 스냅샷 갱신
//   npm run convert -- xlsx  data-source/ 의 엑셀 파일에서 갱신
const NAT = 'data-source/Sample_National_and_Global (1).xlsx'
const REG = 'data-source/Sample_Regional (1).xlsx'

function sheet(wb: XLSX.WorkBook, name: string): unknown[][] {
  const ws = wb.Sheets[name]
  if (!ws) throw new Error(`시트 없음: ${name}`)
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][]
}

function fromLocalXlsx(): Dataset {
  const nat = XLSX.readFile(NAT)
  const regWb = XLSX.readFile(REG)
  return {
    globalScc: normalizeSccRows(sheet(nat, 'Global_SCC')),
    korScc: normalizeSccRows(sheet(nat, 'KOR_SCC')),
    globalDamage: normalizeDamageRows(sheet(nat, 'Global_Damage')),
    korDamage: normalizeDamageRows(sheet(nat, 'KOR_Damage')),
    regional: normalizeRegionalRows(sheet(regWb, regWb.SheetNames[0])),
  }
}

async function main() {
  const useLocal = process.argv.includes('xlsx')
  const dataset = useLocal ? fromLocalXlsx() : await fetchDataset()  // fetchDataset이 자체 검증까지 수행

  if (useLocal) {
    const errors = validateDataset(dataset)
    if (errors.length) { console.error('검증 실패:\n' + errors.join('\n')); process.exit(1) }
  }

  const fx = await fetchFx()
  const snapshot = { ...dataset, generatedAt: new Date().toISOString(), fx }

  mkdirSync('src/data', { recursive: true })
  writeFileSync('src/data/dataset.json', JSON.stringify(snapshot))
  console.log(
    `데이터 갱신 완료 (${useLocal ? '로컬 엑셀' : '구글 시트'}): ` +
    `SCC ${dataset.globalScc.length}+${dataset.korScc.length}, ` +
    `Damage ${dataset.globalDamage.length}+${dataset.korDamage.length}, Regional ${dataset.regional.length}\n` +
    `환율 ${fx.rate}원/USD${fx.isFallback ? ' (조회 실패, 고정값)' : ` (${fx.asOf})`}`,
  )
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
