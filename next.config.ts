import type { NextConfig } from 'next'

// 아임웹(Climateeconlab.com) iframe 임베드 허용, admin은 임베드 금지 (§7.3)
const EMBED_CSP = "frame-ancestors 'self' https://climateeconlab.com https://www.climateeconlab.com https://*.imweb.me"

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: '/admin', headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }] },
      { source: '/admin/:path*', headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }] },
      { source: '/((?!admin).*)', headers: [{ key: 'Content-Security-Policy', value: EMBED_CSP }] },
    ]
  },
}

export default nextConfig
