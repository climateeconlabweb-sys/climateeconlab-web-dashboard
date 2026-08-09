'use client'
import { downloadExcel, downloadPng, downloadSvg } from '@/lib/download'

interface Props {
  svgId: string
  imageName: string
  excelRows: object[]
  excelName: string
}

/** 차트별 다운로드 툴바 (§5.2) — 엑셀 + 이미지 PNG/SVG */
export default function ChartToolbar({ svgId, imageName, excelRows, excelName }: Props) {
  const getSvg = () => document.getElementById(svgId) as SVGSVGElement | null
  return (
    <div className="toolbar">
      <button type="button" onClick={() => downloadExcel(excelRows, excelName)}>엑셀 내려받기</button>
      <button type="button" onClick={() => { const s = getSvg(); if (s) downloadPng(s, `${imageName}.png`) }}>이미지 저장 PNG</button>
      <button type="button" onClick={() => { const s = getSvg(); if (s) downloadSvg(s, `${imageName}.svg`) }}>이미지 저장 SVG</button>
    </div>
  )
}
