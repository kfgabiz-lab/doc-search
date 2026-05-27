/**
 * 인덱스 전체 삭제 API
 *
 * 사용법:
 *   DELETE /api/index-status/all
 *   → { deleted: number }
 *
 * ES _delete_by_query로 모든 문서를 삭제합니다.
 * 인덱스 자체는 유지되므로 FSCrawler가 재인덱싱 시 바로 사용 가능합니다.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ES_URL   = process.env.ES_INTERNAL_URL      || 'http://elasticsearch:9200'
const ES_INDEX = process.env.NEXT_PUBLIC_ES_INDEX  || 'docsearch'

export async function DELETE() {
  try {
    // refresh=true: 삭제 즉시 ES에 반영 (fetchStatus 호출 전 완료 보장)
    const res = await fetch(`${ES_URL}/${ES_INDEX}/_delete_by_query?refresh=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { match_all: {} } }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `ES 오류 (${res.status}): ${text}` }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({ deleted: data.deleted ?? 0 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
