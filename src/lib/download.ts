import * as XLSX from 'xlsx'
import type { FilterState } from './filter'

/** 파일명 규칙 (§5.2) — 현재 필터 조건을 파일명에 표기 */
export function excelFileName(kind: 'SCC' | 'Damage' | 'Regional', f: FilterState): string {
  if (kind === 'Regional') return 'Regional_피해비용.xlsx'
  const cond = f.model === 'ALL' && f.ecs === 'ALL' && f.dr === 'ALL'
    ? '전체'
    : [
        f.model === 'ALL' ? '모형전체' : f.model,
        f.ecs === 'ALL' ? 'ECS전체' : `ECS${f.ecs}`,
        f.dr === 'ALL' ? 'DR전체' : `DR${f.dr}`,
      ].join('_')
  return `${f.region}_${kind}_${cond}.xlsx`
}

export function downloadExcel(rows: object[], fileName: string): void {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'data')
  XLSX.writeFile(wb, fileName)
}

export function downloadSvg(svg: SVGSVGElement, fileName: string): void {
  const blob = new Blob([new XMLSerializer().serializeToString(withInlineTheme(svg))], { type: 'image/svg+xml' })
  triggerDownload(URL.createObjectURL(blob), fileName)
}

export function downloadPng(svg: SVGSVGElement, fileName: string, scale = 2): void {
  const { width, height } = svg.getBoundingClientRect()
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((b) => b && triggerDownload(URL.createObjectURL(b), fileName))
  }
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(withInlineTheme(svg)))))
}

/** CSS 변수는 SVG 단독 파일에서 해석되지 않으므로 계산된 색상 값으로 치환한 복제본을 만든다 */
function withInlineTheme(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const walk = (orig: Element, copy: Element) => {
    const style = getComputedStyle(orig as SVGElement)
    for (const attr of ['fill', 'stroke'] as const) {
      const v = (orig as SVGElement).getAttribute(attr)
      if (v && v.startsWith('var(')) copy.setAttribute(attr, style[attr] || v)
    }
    for (let i = 0; i < orig.children.length; i++) walk(orig.children[i], copy.children[i])
  }
  walk(svg, clone)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  return clone
}

function triggerDownload(url: string, fileName: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
