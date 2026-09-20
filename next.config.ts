import type { NextConfig } from 'next'

// GitHub Pages 배포는 정적 내보내기(next build → out/). 서버가 없으므로 API 라우트·커스텀 헤더는 쓸 수 없다.
// 로컬 개발은 기존대로 서버 모드로 돌아가 /admin CMS가 동작한다.
const isStaticExport = process.env.STATIC_EXPORT === '1'
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

// 아임웹(Climateeconlab.com) iframe 임베드 허용, admin은 임베드 금지 (§7.3)
const EMBED_CSP = "frame-ancestors 'self' https://climateeconlab.com https://www.climateeconlab.com https://*.imweb.me"

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: 'export' as const,
        basePath,
        images: { unoptimized: true },   // 정적 내보내기는 기본 이미지 최적화를 쓸 수 없다
        trailingSlash: true,             // Pages에서 /damage 같은 경로가 404 나지 않도록
      }
    : {
        // 정적 내보내기에서는 headers()가 무시되므로 서버 모드에서만 적용
        async headers() {
          return [
            { source: '/admin', headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }] },
            { source: '/admin/:path*', headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }] },
            { source: '/((?!admin).*)', headers: [{ key: 'Content-Security-Policy', value: EMBED_CSP }] },
          ]
        },
      }),
}

export default nextConfig
