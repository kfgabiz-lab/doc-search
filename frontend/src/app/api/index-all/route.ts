/**
 * 전체 인덱싱 API
 *
 * 사용법:
 *   POST /api/index-all
 *   → { ok: true, message } | { error }
 *
 * 동작:
 *   - FSCrawler REST API의 /_start 를 호출하여 전체 스캔 즉시 실행
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const FSCRAWLER_URL = process.env.FSCRAWLER_URL || 'http://fscrawler:8080'

export async function POST() {
  try {
    // FSCrawler 전체 스캔 즉시 실행
    const res = await fetch(`${FSCRAWLER_URL}/_start`, {
      method: 'GET',
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `FSCrawler 응답 오류: ${text}` }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({ ok: true, message: 'FSCrawler 스캔 시작됨', data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
