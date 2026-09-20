import * as XLSX from 'xlsx'
import { normalizeSccRows, normalizeDamageRows, normalizeRegionalRows, validateDataset } from './parse'
import { readServiceAccount, getAccessToken } from './google-auth'
import type { Dataset } from './types'

// 구글 시트 ID — 시트를 갈아끼울 때는 Vercel 환경변수로 덮어쓰면 코드 수정 없이 바뀜
const NATIONAL_ID = process.env.SHEET_NATIONAL_ID ?? '1XMUKfbiBKT9zeLnAEelxINDeWu7FlqTpezga5AvozN0'
const REGIONAL_ID = process.env.SHEET_REGIONAL_ID ?? '1UqO0zAsIQyJZHqoIS2aQ_eM8y1_k7xmc6JrDZwR8rBE'

/** 시트 수정이 반영되기까지의 최대 지연(초). Next fetch 캐시가 이 주기로 재검증한다 */
export const REVALIDATE_SECONDS = 60

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

/**
 * 시트를 엑셀로 내려받는다.
 * 서비스 계정 키가 설정돼 있으면 Drive API로 인증해 읽고(시트 비공개 유지),
 * 없으면 공개 링크 방식으로 읽는다.
 * 인증 헤더가 붙어도 Next fetch 캐시는 정상 동작하므로 호출 수는 방문자 수와 무관하다.
 */
async function loadWorkbook(id: string): Promise<XLSX.WorkBook> {
  const sa = readServiceAccount()
  const url = sa
    ? `https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=${encodeURIComponent(XLSX_MIME)}`
    : `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`
  const headers = sa ? { Authorization: `Bearer ${await getAccessToken(sa, DRIVE_SCOPE)}` } : undefined

  const res = await fetch(url, { headers, next: { revalidate: REVALIDATE_SECONDS } })
  if (!res.ok) {
    const hint = res.status !== 401 && res.status !== 403
      ? ''
      : sa
        ? ` — 시트를 서비스 계정(${sa.clientEmail})에 "뷰어"로 공유했는지 확인해주세요`
        : ' — 시트 공유 설정을 "링크가 있는 모든 사용자: 뷰어"로 바꾸거나, GOOGLE_SERVICE_ACCOUNT_KEY를 설정해주세요'
    throw new Error(`시트(${id}) 불러오기 실패: HTTP ${res.status}${hint}`)
  }
  return XLSX.read(await res.arrayBuffer(), { type: 'array' })
}

function rowsOf(wb: XLSX.WorkBook, name: string): unknown[][] {
  const ws = wb.Sheets[name]
  if (!ws) throw new Error(`시트 탭 없음: ${name} (이 문서의 탭: ${wb.SheetNames.join(', ')})`)
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][]
}

/** 워크북 2종을 대시보드용 데이터셋으로 조립. 형식이 깨졌으면 예외 */
export function buildDataset(a: XLSX.WorkBook, b: XLSX.WorkBook): Dataset {
  // 두 시트의 ID 순서가 바뀌어도 동작하도록 탭 이름으로 구분
  const [nat, reg] = a.SheetNames.includes('Global_SCC') ? [a, b] : [b, a]
  const dataset: Dataset = {
    globalScc: normalizeSccRows(rowsOf(nat, 'Global_SCC')),
    korScc: normalizeSccRows(rowsOf(nat, 'KOR_SCC')),
    globalDamage: normalizeDamageRows(rowsOf(nat, 'Global_Damage')),
    korDamage: normalizeDamageRows(rowsOf(nat, 'KOR_Damage')),
    regional: normalizeRegionalRows(rowsOf(reg, reg.SheetNames[0])),
  }
  const errors = validateDataset(dataset)
  if (errors.length) throw new Error(`시트 데이터 검증 실패:\n${errors.join('\n')}`)
  return dataset
}

/** 구글 시트 2종을 내려받아 데이터셋으로 변환 */
export async function fetchDataset(): Promise<Dataset> {
  const [a, b] = await Promise.all([loadWorkbook(NATIONAL_ID), loadWorkbook(REGIONAL_ID)])
  return buildDataset(a, b)
}
