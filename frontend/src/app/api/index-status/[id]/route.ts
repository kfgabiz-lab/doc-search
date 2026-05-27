/**
 * 인덱스 단건 삭제 API
 *
 * 사용법:
 *   DELETE /api/index-status/{esId}
 *   → { result: 'deleted' }
 *
 * ES _doc/{id} API로 특정 문서 하나를 삭제합니다.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ES_URL   = process.env.ES_INTERNAL_URL      || 'http://elasticsearch:9200'
const ES_INDEX = process.env.NEXT_PUBLIC_ES_INDEX  || 'docsearch'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  if (!id) {
    return NextResponse.json({ error: 'id가 없습니다' }, { status: 400 })
  }

  try {
    // refresh=wait_for: 삭제 즉시 ES에 반영
    const res = await fetch(`${ES_URL}/${ES_INDEX}/_doc/${id}?refresh=wait_for`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `ES 오류 (${res.status}): ${text}` }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({ result: data.result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
