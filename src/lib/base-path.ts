// GitHub Pages는 github.io/<저장소이름> 하위 경로에 배포되므로 정적 자산 주소에 접두사가 붙는다.
// next.config.ts의 basePath와 같은 값을 써야 한다 (빌드 시 주입되는 NEXT_PUBLIC_ 변수).
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** public/ 아래 파일을 직접 가리킬 때 쓴다. Next가 처리해 주지 않는 fetch·HTML src 용. */
export const asset = (path: string): string => `${BASE_PATH}${path}`
