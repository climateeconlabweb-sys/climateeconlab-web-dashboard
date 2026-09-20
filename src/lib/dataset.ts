import type { Snapshot } from './types'
import snapshot from '@/data/dataset.json'

// 정적 사이트이므로 데이터는 빌드 시점에 확정된다.
// 이 파일은 GitHub Actions가 주기적으로 구글 시트에서 다시 만들어 커밋한다 (npm run convert).
export const DATA = snapshot as unknown as Snapshot
