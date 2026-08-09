const compact = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 })
const full = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 })

/** 축 눈금용 축약 표기 (만/억 단위) */
export const fmtCompact = (v: number): string => compact.format(v)
/** 툴팁·표용 전체 표기 */
export const fmtFull = (v: number): string => full.format(v)
