import type { Metadata } from 'next'
import '@/styles/theme.css'

export const metadata: Metadata = {
  title: '한국형 앙상블 기후변화통합평가모형',
  description: '기후변화 피해비용과 탄소의 사회적 비용(SCC) 데이터 대시보드',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
