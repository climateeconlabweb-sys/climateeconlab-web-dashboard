'use client'
import { useEffect, useMemo, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, Geometry } from 'geojson'
import { quantileThresholds, binIndex, rankDesc } from '@/lib/stats'
import { fmtCompact, fmtFull } from '@/lib/format'
import type { RegionalRow } from '@/lib/types'
import ChartTooltip, { type TooltipState } from './ChartTooltip'

const W = 640
const H = 720

type RegionFeature = Feature<Geometry, { code: string; name: string }>

interface Props {
  regional: RegionalRow[]
  unitLabel: string
  svgId?: string
}

/** 시군구 단계구분도 (M-1~M-5) — 분위수 7구간, 데이터 없음 빗금, 클릭 확대 */
export default function ChoroplethMap({ regional, unitLabel, svgId = 'regional-map' }: Props) {
  const [features, setFeatures] = useState<RegionFeature[] | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetch('/geo/sigungu.topo.json')
      .then((r) => r.json())
      .then((topo: Topology) => {
        const objName = Object.keys(topo.objects)[0]
        const fc = feature(topo, topo.objects[objName] as GeometryCollection<{ code: string; name: string }>)
        setFeatures(fc.features as RegionFeature[])
      })
      .catch(() => setFeatures([]))
  }, [])

  const byCode = useMemo(() => new Map(regional.map((r) => [r.sigCd, r])), [regional])
  const valued = useMemo(() => regional.filter((r) => r.value !== null) as (RegionalRow & { value: number })[], [regional])
  const thresholds = useMemo(() => quantileThresholds(valued.map((r) => r.value), 7), [valued])
  const rankByCode = useMemo(() => {
    const ranks = rankDesc(valued.map((r) => r.value))
    return new Map(valued.map((r, i) => [r.sigCd, ranks[i]]))
  }, [valued])

  const { path, transform } = useMemo(() => {
    if (!features || features.length === 0) return { path: null, transform: undefined }
    const projection = geoMercator().fitSize([W, H], { type: 'FeatureCollection', features })
    const p = geoPath(projection)
    let transform: string | undefined
    if (selected) {
      const sel = features.filter((f) => f.properties.code === selected)
      if (sel.length) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
        sel.forEach((f) => {
          const [[a, b], [c, d]] = p.bounds(f)
          x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d)
        })
        const scale = Math.min(6, 0.7 / Math.max((x1 - x0) / W, (y1 - y0) / H))
        const tx = W / 2 - scale * (x0 + x1) / 2
        const ty = H / 2 - scale * (y0 + y1) / 2
        transform = `translate(${tx},${ty}) scale(${scale})`
      }
    }
    return { path: p, transform }
  }, [features, selected])

  if (features === null) return <div className="empty-state">지도를 불러오는 중…</div>
  if (features.length === 0 || !path) return <div className="empty-state">지도 데이터를 불러오지 못했습니다</div>

  const fillOf = (code: string): string => {
    const row = byCode.get(code)
    if (!row || row.value === null) return 'url(#hatch-nodata)'
    return `var(--map-${binIndex(row.value, thresholds) + 1})`
  }

  const selectedRow = selected ? byCode.get(selected) : undefined

  return (
    <div>
      <svg
        id={svgId}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', background: 'var(--bg)' }}
        role="img"
        aria-label="지역별 피해비용 지도"
        onClick={() => setSelected(null)}
      >
        <defs>
          <pattern id="hatch-nodata" width={6} height={6} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width={6} height={6} fill="var(--surface)" />
            <line x1={0} y1={0} x2={0} y2={6} stroke="var(--ink-muted)" strokeWidth={1.2} />
          </pattern>
        </defs>
        <g transform={transform} style={{ transition: 'transform 0.45s ease' }}>
          {features.map((f, i) => {
            const code = f.properties.code
            const row = byCode.get(code)
            const isHover = hovered === code
            return (
              <path
                key={`${code}-${i}`}
                d={path(f) ?? undefined}
                fill={fillOf(code)}
                stroke={isHover || selected === code ? 'var(--ink)' : 'var(--bg)'}
                strokeWidth={(isHover || selected === code ? 1.2 : 0.5) / (transform ? 3 : 1)}
                style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setSelected(selected === code ? null : code) }}
                onMouseEnter={() => setHovered(code)}
                onMouseLeave={() => { setHovered(null); setTooltip(null) }}
                onMouseMove={(e) => {
                  const name = row ? `${row.sidoNm} ${row.sigunguNm}` : f.properties.name
                  const lines = [name]
                  if (row && row.value !== null) {
                    lines.push(`피해비용 ${fmtFull(row.value)} (${unitLabel})`)
                    lines.push(`전국 ${rankByCode.get(code)}위 / ${valued.length}곳`)
                  } else {
                    lines.push('데이터 없음')
                  }
                  setTooltip({ x: e.clientX, y: e.clientY, lines })
                }}
              />
            )
          })}
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

      {/* 범례 (M-2) — 분위수 7구간 실제 경계값 표기 */}
      <div className="legend" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {Array.from({ length: 7 }, (_, i) => {
            const lo = i === 0 ? Math.min(...valued.map((r) => r.value)) : thresholds[i - 1]
            const hi = i === 6 ? Math.max(...valued.map((r) => r.value)) : thresholds[i]
            return (
              <div key={i} className="legend-row" style={{ marginRight: 8 }}>
                <span className="swatch" style={{ background: `var(--map-${i + 1})` }} />
                <span>{fmtCompact(lo)}~{fmtCompact(hi)}</span>
              </div>
            )
          })}
        </div>
      </div>

      <ChartTooltip tooltip={tooltip} />
    </div>
  )
}
