import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '문서 검색 시스템',
  description: '내부 PDF 문서 빠른 검색',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
