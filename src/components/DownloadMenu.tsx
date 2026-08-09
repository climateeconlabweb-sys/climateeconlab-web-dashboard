'use client'
import { useEffect, useRef, useState } from 'react'
import { downloadExcel, downloadPng, downloadSvg } from '@/lib/download'

interface Props {
  svgId: string
  imageName: string
  excelRows: object[]
  excelName: string
}

/** 섹션 우측 상단 다운로드 드롭다운 (§5.2) — 엑셀·PNG·SVG 선택 */
export default function DownloadMenu({ svgId, imageName, excelRows, excelName }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const getSvg = () => document.getElementById(svgId) as SVGSVGElement | null
  const pick = (fn: () => void) => {
    fn()
    setOpen(false)
  }

  return (
    <div className="download-menu" ref={ref}>
      <button
        type="button" className="filter-btn"
        aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        다운로드 ▾
      </button>
      {open && (
        <div className="menu" role="menu">
          <button type="button" role="menuitem" onClick={() => pick(() => downloadExcel(excelRows, excelName))}>
            엑셀 (.xlsx)
          </button>
          <button type="button" role="menuitem" onClick={() => pick(() => { const s = getSvg(); if (s) downloadPng(s, `${imageName}.png`) })}>
            이미지 (PNG)
          </button>
          <button type="button" role="menuitem" onClick={() => pick(() => { const s = getSvg(); if (s) downloadSvg(s, `${imageName}.svg`) })}>
            이미지 (SVG)
          </button>
        </div>
      )}
    </div>
  )
}
