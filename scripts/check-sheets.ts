import { readServiceAccount } from '../src/lib/google-auth'
import { fetchDataset } from '../src/lib/sheets'

// 시트 연결이 실제로 되는지 한 번에 확인한다 (배포 전 점검용): npm run check:sheets
const sa = readServiceAccount()
console.log(sa
  ? `인증 방식: 서비스 계정 (${sa.clientEmail})\n  → 이 주소로 시트 2개를 "뷰어" 공유해야 합니다`
  : '인증 방식: 공개 링크 (GOOGLE_SERVICE_ACCOUNT_KEY 미설정)\n  → 시트 공유가 "링크가 있는 모든 사용자: 뷰어"여야 합니다')

fetchDataset().then((d) => {
  console.log('\n성공 — 시트를 정상적으로 읽었습니다')
  console.table({
    'Global SCC': d.globalScc.length,
    'KOR SCC': d.korScc.length,
    'Global Damage': d.globalDamage.length,
    'KOR Damage': d.korDamage.length,
    'Regional': d.regional.length,
  })
}).catch((e) => {
  console.error('\n실패 —', e instanceof Error ? e.message : e)
  process.exit(1)
})
