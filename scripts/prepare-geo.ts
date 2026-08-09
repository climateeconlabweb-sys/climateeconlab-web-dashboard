// 2013 통계청 경계 TopoJSON의 지역 코드를 현행 데이터 코드 체계로 리코딩 (Task 9)
// - 군 코드: X3XX → X5XX (+200) 일괄 개편 반영
// - 구 단위 세분(수원시장안구 등) → 통합시 코드로 병합 (데이터가 시 단위 1개 값)
// - 특수: 청원군→청주시 통합(2014), 군위군→대구 편입(2023), 인천 남구→미추홀구
// ※ 경계 형상은 2013년판 — 최신 SGIS 경계 확보 시 다운로드 원본만 교체 후 재실행
import { readFileSync, writeFileSync } from 'fs'

const SRC = 'public/geo/sigungu.topo.json'

const SPECIAL: Record<string, string> = {
  '33310': '33040', // 청원군 → 청주시
  '37310': '22520', // 군위군 → 대구 군위군
  '23030': '23090', // 인천 남구 → 미추홀구
}
const CITY_MERGE: Record<string, string> = {
  '3101': '31010', // 수원시
  '3102': '31020', // 성남시
  '3104': '31040', // 안양시
  '3105': '31050', // 부천시
  '3109': '31090', // 안산시
  '3110': '31100', // 고양시
  '3119': '31190', // 용인시
  '3301': '33040', // (구)청주시 상당구·흥덕구 → 청주시
  '3401': '34010', // 천안시
  '3501': '35010', // 전주시
  '3701': '37010', // 포항시
  '3811': '38110', // 창원시
}

function recode(code: string): string {
  if (SPECIAL[code]) return SPECIAL[code]
  const prefix4 = code.slice(0, 4)
  if (CITY_MERGE[prefix4] && code[4] !== '0') return CITY_MERGE[prefix4]
  if (code[2] === '3' || code[2] === '4') return String(Number(code) + 200) // 군 코드 개편 X3XX·X4XX → +200
  return code
}

const topo = JSON.parse(readFileSync(SRC, 'utf8'))
const objName = Object.keys(topo.objects)[0]
const dataset = JSON.parse(readFileSync('src/data/dataset.json', 'utf8'))
const nameByCode = new Map<string, string>(
  dataset.regional.map((r: { sigCd: string; sidoNm: string; sigunguNm: string }) => [r.sigCd, `${r.sidoNm} ${r.sigunguNm}`]),
)

let changed = 0
for (const g of topo.objects[objName].geometries) {
  const from = g.properties.code
  const to = recode(from)
  if (from !== to) changed++
  g.properties.code = to
  g.properties.name = nameByCode.get(to) ?? g.properties.name
}
writeFileSync(SRC, JSON.stringify(topo))
console.log(`리코딩 완료: ${changed}건 변경`)
