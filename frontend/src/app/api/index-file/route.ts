/**
 * 단건 인덱싱 API
 *
 * 사용법:
 *   POST /api/index-file
 *   body: { virtualPath: "/Manual/file.pdf" }
 *   → { ok: true } | { error }
 *
 * 동작:
 *   - 파일을 읽어 FSCrawler REST API의 /_upload 로 전송
 *   - FSCrawler가 Tika로 내용 추출 후 ES에 인덱싱
 */

import { NextRequest, NextResponse } from 'next/server'
import fs   from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DOCS_PATH      = process.env.DOCS_PATH      || '/usr/share/fscrawler/documents'
const FSCRAWLER_URL  = process.env.FSCRAWLER_URL  || 'http://fscrawler:8080'

export async function POST(req: NextRequest) {
  try {
    const { virtualPath } = await req.json()
    if (!virtualPath) {
      return NextResponse.json({ error: 'virtualPath가 없습니다' }, { status: 400 })
    }

    // 실제 파일 경로 계산
    const realPath = path.join(DOCS_PATH, virtualPath)
    if (!fs.existsSync(realPath)) {
      return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 })
    }

    // 파일 읽기
    const fileBuffer = fs.readFileSync(realPath)
    const filename   = path.basename(realPath)

    // FSCrawler _upload API로 전송 (multipart/form-data)
    const formData = new FormData()
    formData.append('file', new Blob([fileBuffer]), filename)

    const res = await fetch(`${FSCRAWLER_URL}/_upload`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `FSCrawler 응답 오류: ${text}` }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({ ok: true, filename, data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
