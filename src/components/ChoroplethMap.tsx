'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type D3ZoomEvent } from 'd3-zoom'
import { select } from 'd3-selection'
import { feature, mesh } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, Geometry } from 'geojson'
import { niceThresholds, binIndex, rankDesc } from '@/lib/stats'
import { fmtFull } from '@/lib/format'
import type { RegionalRow } from '@/lib/types'
import ChartTooltip, { type TooltipState } from './ChartTooltip'

const W = 640
const H = 720
const SIGUNGU_LABEL_ZOOM = 3 // 이 배율 이상에서 시군구 이름 표시

type RegionFeature = Feature<Geometry, { code: string; name: string }>
type SigunguCollection = GeometryCollection<{ code: string; name: string }>

interface Props {
  regional: RegionalRow[]
  unitLabel: string
  svgId?: string
}

/** 시군구 단계구분도 (M-1~M-5) — 분위수 구간, 시도 경계·이름 라벨, 드래그·핀치 확대 이동, 클릭 확대 */
export default function ChoroplethMap({ regional, unitLabel, svgId = 'regional-map' }: Props) {
  const [topoData, setTopoData] = useState<{ topo: Topology; features: RegionFeature[] } | null | undefined>(undefined)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [t, setT] = useState({ k: 1, x: 0, y: 0 })
  const [animated, setAnimated] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  useEffect(() => {
    fetch('/geo/sigungu.topo.json')
      .then((r) => r.json())
      .then((topo: Topology) => {
        const objName = Object.keys(topo.objects)[0]
        const fc = feature(topo, topo.objects[objName] as SigunguCollection)
        setTopoData({ topo, features: fc.features as RegionFeature[] })
      })
      .catch(() => setTopoData(null))
  }, [])

  const features = topoData?.features ?? null

  const byCode = useMemo(() => new Map(regional.map((r) => [r.sigCd, r])), [regional])
  const valued = useMemo(() => regional.filter((r) => r.value !== null) as (RegionalRow & { value: number })[], [regional])
  const thresholds = useMemo(() => niceThresholds(valued.map((r) => r.value), 7), [valued])
  const rankByCode = useMemo(() => {
    const ranks = rankDesc(valued.map((r) => r.value))
    return new Map(valued.map((r, i) => [r.sigCd, ranks[i]]))
  }, [valued])

  const path = useMemo(() => {
    if (!features || features.length === 0) return null
    const projection = geoMercator().fitSize([W, H], { type: 'FeatureCollection', features })
    return geoPath(projection)
  }, [features])

  // 경계 패스는 한 번만 계산해 재사용 — 호버·제스처 때마다 229개를 다시 그리면 끊긴다
  const ds = useMemo(() => (features && path ? features.map((f) => path(f) ?? '') : []), [features, path])

  const fills = useMemo(
    () =>
      (features ?? []).map((f) => {
        const row = byCode.get(f.properties.code)
        if (!row || row.value === null) return 'url(#hatch-nodata)'
        return `var(--map-${binIndex(row.value, thresholds) + 1})`
      }),
    [features, byCode, thresholds],
  )

  // 시도 경계선 — 시도 코드(앞 2자리)가 다른 시군구 사이의 경계만 추출
  const sidoBorderD = useMemo(() => {
    if (!topoData || !path) return null
    const objName = Object.keys(topoData.topo.objects)[0]
    const borders = mesh(
      topoData.topo,
      topoData.topo.objects[objName] as SigunguCollection,
      (a, b) => a !== b && (a as unknown as RegionFeature).properties.code.slice(0, 2) !== (b as unknown as RegionFeature).properties.code.slice(0, 2),
    )
    return path(borders) ?? null
  }, [topoData, path])

  // 시군구별 중심점·면적 (라벨 배치용)
  const centroids = useMemo(
    () => (features && path ? features.map((f) => ({ c: path.centroid(f), a: Math.abs(path.area(f)) })) : []),
    [features, path],
  )

  // 시도 이름 라벨 — 면적 가중 평균 중심점, 이름은 데이터의 sidoNm
  // 경기(31)는 서울을 둘러싼 모양이라 중심점이 서울 라벨과 겹침 → 남동쪽으로, 세종(29)은 충남과 붙음 → 위로 보정
  const LABEL_OFFSET: Record<string, [number, number]> = useMemo(() => ({ '31': [26, 34], '29': [8, -14] }), [])
  const sidoLabels = useMemo(() => {
    if (!features || centroids.length === 0) return []
    const sidoNmByPrefix = new Map<string, string>()
    regional.forEach((r) => { if (!sidoNmByPrefix.has(r.sigCd.slice(0, 2))) sidoNmByPrefix.set(r.sigCd.slice(0, 2), r.sidoNm) })
    const acc = new Map<string, { x: number; y: number; a: number }>()
    features.forEach((f, i) => {
      const p = f.properties.code.slice(0, 2)
      const { c, a } = centroids[i]
      const cur = acc.get(p) ?? { x: 0, y: 0, a: 0 }
      acc.set(p, { x: cur.x + c[0] * a, y: cur.y + c[1] * a, a: cur.a + a })
    })
    return [...acc.entries()]
      .filter(([p, v]) => v.a > 0 && sidoNmByPrefix.has(p))
      .map(([p, v]) => {
        const [ox, oy] = LABEL_OFFSET[p] ?? [0, 0]
        return { name: sidoNmByPrefix.get(p)!, x: v.x / v.a + ox, y: v.y / v.a + oy }
      })
  }, [features, centroids, regional, LABEL_OFFSET])

  // 시군구 이름 라벨 후보 — 코드당 가장 큰 조각의 중심점
  const sigunguLabelPoints = useMemo(() => {
    if (!features || centroids.length === 0) return []
    const best = new Map<string, { x: number; y: number; a: number; name: string }>()
    features.forEach((f, i) => {
      const { c, a } = centroids[i]
      const code = f.properties.code
      const cur = best.get(code)
      if (cur && cur.a >= a) return
      const row = byCode.get(code)
      best.set(code, { x: c[0], y: c[1], a, name: row ? row.sigunguNm : f.properties.name })
    })
    return [...best.values()]
  }, [features, centroids, byCode])

  // 드래그 팬 + 휠(Ctrl)/핀치 줌 — 확대 전에는 한 손가락 스크롤이 페이지로 통과되도록 touch-action 전환
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !features) return
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .translateExtent([[0, 0], [W, H]])
      .clickDistance(4)
      .filter((e: MouseEvent | WheelEvent | TouchEvent) => {
        if (e.type === 'wheel') return (e as WheelEvent).ctrlKey || (e as WheelEvent).metaKey // 트랙패드 핀치는 ctrl+wheel로 들어옴
        if ('button' in e && e.button) return false
        return true
      })
      .on('zoom', (e: D3ZoomEvent<SVGSVGElement, unknown>) => {
        setAnimated(!e.sourceEvent) // 프로그램 줌만 부드럽게, 제스처는 즉시 반응
        setT({ k: e.transform.k, x: e.transform.x, y: e.transform.y })
        svg.style.touchAction = e.transform.k > 1.05 ? 'none' : 'pan-y'
      })
    zoomRef.current = z
    select(svg).call(z)
    svg.style.touchAction = 'pan-y'
    return () => { select(svg).on('.zoom', null) }
  }, [features])

  // 시군구 클릭 시 해당 영역으로 확대 (M-4)
  useEffect(() => {
    const svg = svgRef.current
    const zb = zoomRef.current
    if (!svg || !zb || !features || !path || !selected) return
    const sel = features.filter((f) => f.properties.code === selected)
    if (!sel.length) return
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    sel.forEach((f) => {
      const [[a, b], [c, d]] = path.bounds(f)
      x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d)
    })
    const k = Math.min(6, 0.7 / Math.max((x1 - x0) / W, (y1 - y0) / H))
    select(svg).call(zb.transform, zoomIdentity.translate(W / 2 - (k * (x0 + x1)) / 2, H / 2 - (k * (y0 + y1)) / 2).scale(k))
  }, [selected, features, path])

  const applyScale = (factor: number) => {
    const svg = svgRef.current
    if (svg && zoomRef.current) select(svg).call(zoomRef.current.scaleBy, factor)
  }
  const resetView = () => {
    setSelected(null)
    const svg = svgRef.current
    if (svg && zoomRef.current) select(svg).call(zoomRef.current.transform, zoomIdentity)
  }

  // 기본 지도 레이어 — 호버·툴팁·줌 상태와 무관하게 캐시 (선 굵기는 non-scaling-stroke로 고정)
  const basePaths = useMemo(
    () =>
      (features ?? []).map((f, i) => {
        const code = f.properties.code
        const row = byCode.get(code)
        return (
          <path
            key={`${code}-${i}`}
            d={ds[i]}
            fill={fills[i]}
            stroke="var(--bg)"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); setSelected((s) => (s === code ? null : code)) }}
            onMouseEnter={() => setHovered(code)}
            onMouseMove={(e) => {
              const name = row ? `${row.sidoNm} ${row.sigunguNm}` : f.properties.name
              if (row && row.value !== null) {
                setTooltip({
                  x: e.clientX, y: e.clientY, title: name,
                  rows: [
                    ['피해비용', `${fmtFull(row.value)} ${unitLabel}`],
                    ['전국 순위', `${rankByCode.get(code)}위 / ${valued.length}곳`],
                  ],
                })
              } else {
                setTooltip({ x: e.clientX, y: e.clientY, title: name, note: '데이터 없음' })
              }
            }}
          />
        )
      }),
    [features, ds, fills, byCode, rankByCode, valued.length, unitLabel],
  )

  if (topoData === undefined) return <div className="empty-state">지도를 불러오는 중…</div>
  if (!features || features.length === 0 || !path) return <div className="empty-state">지도 데이터를 불러오지 못했습니다</div>

  const selectedRow = selected ? byCode.get(selected) : undefined
  const toScreen = (x: number, y: number): [number, number] => [x * t.k + t.x, y * t.k + t.y]
  const inView = ([sx, sy]: [number, number]) => sx >= 0 && sx <= W && sy >= 0 && sy <= H
  const showSigungu = t.k >= SIGUNGU_LABEL_ZOOM

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          id={svgId}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block', background: 'var(--bg)' }}
          role="img"
          aria-label="지역별 피해비용 지도"
          onClick={() => setSelected(null)}
          onMouseLeave={() => { setHovered(null); setTooltip(null) }}
        >
          <defs>
            <pattern id="hatch-nodata" width={6} height={6} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width={6} height={6} fill="var(--surface)" />
              <line x1={0} y1={0} x2={0} y2={6} stroke="var(--ink-muted)" strokeWidth={1.2} />
            </pattern>
          </defs>
          {/* 바다(빈 영역)로 나가면 툴팁 해제 */}
          <rect width={W} height={H} fill="transparent" onMouseEnter={() => { setHovered(null); setTooltip(null) }} />
          <g
            transform={`translate(${t.x},${t.y}) scale(${t.k})`}
            style={{ transition: animated ? 'transform 0.45s ease' : 'none' }}
          >
            {basePaths}
            {/* 시도 경계선 (굵은 경계) */}
            {sidoBorderD && (
              <path d={sidoBorderD} fill="none" stroke="var(--ink-secondary)" strokeWidth={1.1} vectorEffect="non-scaling-stroke" pointerEvents="none" strokeLinejoin="round" />
            )}
            {/* 호버·선택 강조 오버레이 */}
            {features.map((f, i) => {
              const code = f.properties.code
              if (code !== hovered && code !== selected) return null
              return (
                <path
                  key={`hl-${code}-${i}`}
                  d={ds[i]}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth={1.2}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              )
            })}
          </g>
          {/* 라벨은 변환 밖 레이어 — 글자 크기가 배율과 무관하게 일정 */}
          {!showSigungu &&
            sidoLabels.map((l) => {
              const p = toScreen(l.x, l.y)
              if (!inView(p)) return null
              return (
                <text
                  key={l.name}
                  x={p[0]} y={p[1]}
                  textAnchor="middle" dy="0.35em"
                  fontSize={10} fontWeight={600} fill="var(--ink-secondary)"
                  stroke="var(--bg)" strokeWidth={2.5} paintOrder="stroke"
                  pointerEvents="none"
                >
                  {l.name}
                </text>
              )
            })}
          {showSigungu &&
            sigunguLabelPoints.map((l) => {
              const p = toScreen(l.x, l.y)
              if (!inView(p)) return null
              return (
                <text
                  key={`z-${l.name}-${Math.round(l.x)}`}
                  x={p[0]} y={p[1]}
                  textAnchor="middle" dy="0.35em"
                  fontSize={11} fontWeight={600} fill="var(--ink)"
                  stroke="var(--bg)" strokeWidth={2.5} paintOrder="stroke"
                  pointerEvents="none"
                >
                  {l.name}
                </text>
              )
            })}
        </svg>

        {/* 확대·축소·전국 보기 버튼 */}
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button type="button" className="filter-btn" aria-label="확대" style={{ width: 32, padding: '5px 0' }} onClick={() => applyScale(1.6)}>＋</button>
          <button type="button" className="filter-btn" aria-label="축소" style={{ width: 32, padding: '5px 0' }} onClick={() => applyScale(1 / 1.6)}>－</button>
          <button type="button" className="filter-btn" aria-label="전국 보기" style={{ width: 32, padding: '5px 0', fontSize: 11 }} onClick={resetView}>전국</button>
        </div>
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', margin: '6px 0 0' }}>
        드래그로 이동 · 핀치 또는 ＋/－ 버튼으로 확대 · 시군구를 클릭하면 해당 지역으로 확대됩니다
      </p>

      {/* 선택 시 상세 카드 (M-5) */}
      {selectedRow && (
        <div style={{
          marginTop: 10, padding: '10px 14px', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', background: 'var(--surface)',
          display: 'flex', alignItems: 'center', gap: 16, fontSize: 13.5,
        }}>
          <strong>{selectedRow.sidoNm} {selectedRow.sigunguNm}</strong>
          {selectedRow.value !== null ? (
            <>
              <span>피해비용 {fmtFull(selectedRow.value)} ({unitLabel})</span>
              <span>전국 {rankByCode.get(selectedRow.sigCd)}위 / {valued.length}곳</span>
            </>
          ) : (
            <span>데이터 없음</span>
          )}
          <button
            type="button" className="filter-btn" style={{ marginLeft: 'auto' }}
            onClick={resetView}
          >
            전국 보기로
          </button>
        </div>
      )}

      <ChartTooltip tooltip={tooltip} />
    </div>
  )
}
