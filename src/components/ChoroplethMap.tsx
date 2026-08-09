'use client'
import { useEffect, useMemo, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import { feature, mesh } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, Geometry } from 'geojson'
import { niceThresholds, binIndex, rankDesc } from '@/lib/stats'
import { fmtFull } from '@/lib/format'
import type { RegionalRow } from '@/lib/types'
import ChartTooltip, { type TooltipState } from './ChartTooltip'

const W = 640
const H = 720

type RegionFeature = Feature<Geometry, { code: string; name: string }>
type SigunguCollection = GeometryCollection<{ code: string; name: string }>

interface Props {
  regional: RegionalRow[]
  unitLabel: string
  svgId?: string
}

/** 시군구 단계구분도 (M-1~M-5) — 분위수 7구간, 시도 경계·이름 라벨, 데이터 없음 빗금, 클릭 확대 */
export default function ChoroplethMap({ regional, unitLabel, svgId = 'regional-map' }: Props) {
  const [topoData, setTopoData] = useState<{ topo: Topology; features: RegionFeature[] } | null | undefined>(undefined)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

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

  // 경계 패스는 한 번만 계산해 재사용 — 호버 때마다 229개를 다시 그리면 끊긴다
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

  const zoom = useMemo(() => {
    if (!features || !path || !selected) return undefined
    const sel = features.filter((f) => f.properties.code === selected)
    if (!sel.length) return undefined
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    sel.forEach((f) => {
      const [[a, b], [c, d]] = path.bounds(f)
      x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d)
    })
    const k = Math.min(6, 0.7 / Math.max((x1 - x0) / W, (y1 - y0) / H))
    const tx = W / 2 - k * (x0 + x1) / 2
    const ty = H / 2 - k * (y0 + y1) / 2
    return { t: `translate(${tx},${ty}) scale(${k})`, k, tx, ty }
  }, [features, path, selected])

  // 확대 시 화면 안에 들어오는 시군구 이름 라벨 (코드당 가장 큰 조각 기준)
  const zoomLabels = useMemo(() => {
    if (!zoom || !features || centroids.length === 0) return []
    const vx0 = -zoom.tx / zoom.k, vx1 = (-zoom.tx + W) / zoom.k
    const vy0 = -zoom.ty / zoom.k, vy1 = (-zoom.ty + H) / zoom.k
    const best = new Map<string, { x: number; y: number; a: number; name: string }>()
    features.forEach((f, i) => {
      const { c, a } = centroids[i]
      if (c[0] < vx0 || c[0] > vx1 || c[1] < vy0 || c[1] > vy1) return
      const code = f.properties.code
      const cur = best.get(code)
      if (cur && cur.a >= a) return
      const row = byCode.get(code)
      best.set(code, { x: c[0], y: c[1], a, name: row ? row.sigunguNm : f.properties.name })
    })
    return [...best.values()]
  }, [zoom, features, centroids, byCode])

  // 기본 지도 레이어 — 호버/툴팁 상태와 무관하게 캐시 (호버 강조는 아래 오버레이가 담당)
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
            strokeWidth={0.5 / (zoom?.k ?? 1)}
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
    [features, ds, fills, zoom, byCode, rankByCode, valued.length, unitLabel],
  )

  if (topoData === undefined) return <div className="empty-state">지도를 불러오는 중…</div>
  if (!features || features.length === 0 || !path) return <div className="empty-state">지도 데이터를 불러오지 못했습니다</div>

  const selectedRow = selected ? byCode.get(selected) : undefined
  const k = zoom?.k ?? 1

  return (
    <div>
      <svg
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
        <g transform={zoom?.t} style={{ transition: 'transform 0.45s ease' }}>
          {basePaths}
          {/* 시도 경계선 (굵은 경계) */}
          {sidoBorderD && (
            <path d={sidoBorderD} fill="none" stroke="var(--ink-secondary)" strokeWidth={1.1 / k} pointerEvents="none" strokeLinejoin="round" />
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
                strokeWidth={1.2 / k}
                pointerEvents="none"
              />
            )
          })}
          {/* 전국 화면: 시도 이름 / 확대 화면: 화면 안 시군구 이름 */}
          {!zoom &&
            sidoLabels.map((l) => (
              <text
                key={l.name}
                x={l.x} y={l.y}
                textAnchor="middle" dy="0.35em"
                fontSize={10} fontWeight={600} fill="var(--ink-secondary)"
                stroke="var(--bg)" strokeWidth={2.5} paintOrder="stroke"
                pointerEvents="none"
              >
                {l.name}
              </text>
            ))}
          {zoom &&
            zoomLabels.map((l) => (
              <text
                key={`z-${l.name}-${Math.round(l.x)}`}
                x={l.x} y={l.y}
                textAnchor="middle" dy="0.35em"
                fontSize={12 / k} fontWeight={600} fill="var(--ink)"
                stroke="var(--bg)" strokeWidth={2.5 / k} paintOrder="stroke"
                pointerEvents="none"
              >
                {l.name}
              </text>
            ))}
        </g>
      </svg>

      {/* 확대 시 상세 카드 (M-5) */}
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
            onClick={() => setSelected(null)}
          >
            전국 보기로
          </button>
        </div>
      )}

      <ChartTooltip tooltip={tooltip} />
    </div>
  )
}
