// TopoJSON 경계의 지역 코드와 dataset.json의 regional sigCd를 대조 (Task 9 Step 3)
import { readFileSync } from 'fs'

interface Geometry { properties: { code: string; name: string } }

const topo = JSON.parse(readFileSync('public/geo/sigungu.topo.json', 'utf8'))
const objName = Object.keys(topo.objects)[0]
const geoms: Geometry[] = topo.objects[objName].geometries
const geoCodes = new Map(geoms.map((g) => [g.properties.code, g.properties.name]))

const dataset = JSON.parse(readFileSync('src/data/dataset.json', 'utf8'))
const dataCodes = new Map<string, string>(
  dataset.regional.map((r: { sigCd: string; sidoNm: string; sigunguNm: string }) => [r.sigCd, `${r.sidoNm} ${r.sigunguNm}`]),
)

const dataOnly = [...dataCodes.entries()].filter(([code]) => !geoCodes.has(code))
const geoOnly = [...geoCodes.entries()].filter(([code]) => !dataCodes.has(code))

console.log(`경계 지역 수: ${geoCodes.size} · 데이터 지역 수: ${dataCodes.size}`)
console.log(`데이터에만 있음(지도에 못 그림): ${dataOnly.length}건`)
dataOnly.forEach(([code, name]) => console.log(`  - ${code} ${name}`))
console.log(`지도에만 있음(데이터 없음 → 빗금): ${geoOnly.length}건`)
geoOnly.forEach(([code, name]) => console.log(`  - ${code} ${name}`))

if (dataOnly.length === 0) console.log('미매칭 0건 — 조인 OK')
