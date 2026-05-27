/**
 * 파일 인덱싱 공통 라이브러리 (서버사이드 전용)
 *
 * 사용법:
 *   import { indexFile } from '@/lib/indexer'
 *   const result = await indexFile('/Manual/file.pdf')
 *
 * 동작:
 *   1. 파일시스템에서 파일 읽기
 *   2. PDF → pdf-parse로 텍스트 추출 / 나머지 → 메타데이터만
 *   3. 기존 ES 문서 삭제 (중복 방지)
 *   4. ES에 새 문서 인덱싱
 */

import fs   from 'fs'
import path from 'path'

const DOCS_PATH = process.env.DOCS_PATH       || '/usr/share/fscrawler/documents'
const ES_URL    = process.env.ES_INTERNAL_URL  || 'http://elasticsearch:9200'
const ES_INDEX  = process.env.NEXT_PUBLIC_ES_INDEX || 'docsearch'

// 확장자별 Content-Type 매핑
const CONTENT_TYPE_MAP: Record<string, string> = {
  pdf:  'application/pdf',
  doc:  'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:  'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt:  'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt:  'text/plain',
  hwp:  'application/x-hwp',
  dwg:  'application/acad',
  dxf:  'application/dxf',
  inv:  'application/octet-stream',
  iam:  'application/octet-stream',
  ipt:  'application/octet-stream',
}

export interface IndexResult {
  filename: string
  status:   'ok' | 'error'
  message?: string
}

/**
 * 단일 파일을 ES에 인덱싱
 *
 * @param virtualPath - 문서 폴더 기준 상대 경로 (예: '/Manual/file.pdf')
 */
export async function indexFile(virtualPath: string): Promise<IndexResult> {
  const realPath = path.join(DOCS_PATH, virtualPath).split(path.sep).join('/')
  const filename = path.basename(realPath)
  const ext      = filename.split('.').pop()?.toLowerCase() || ''

  // ── 1. 파일 읽기 ────────────────────────────
  let fileBuffer: Buffer
  let fileSize   = 0
  let lastModified = new Date().toISOString()

  try {
    const stat = fs.statSync(realPath)
    fileSize     = stat.size
    lastModified = stat.mtime.toISOString()
    fileBuffer   = fs.readFileSync(realPath)
  } catch (e) {
    return { filename, status: 'error', message: `파일 읽기 실패: ${e}` }
  }

  // ── 2. PDF 텍스트 추출 ────────────────────────
  let content = ''
  let creationDate: string | null = null

  if (ext === 'pdf') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const parsed   = await pdfParse(fileBuffer)
      content        = parsed.text || ''
      // PDF 메타데이터에서 생성일 추출
      const info     = parsed.info || {}
      if (info.CreationDate) {
        // PDF 날짜 형식: D:YYYYMMDDHHmmSS → ISO 변환 시도
        const raw = String(info.CreationDate).replace('D:', '').slice(0, 14)
        const y   = raw.slice(0, 4), mo = raw.slice(4, 6), d = raw.slice(6, 8)
        const h   = raw.slice(8, 10), mi = raw.slice(10, 12), s = raw.slice(12, 14)
        creationDate = `${y}-${mo}-${d}T${h}:${mi}:${s}.000+00:00`
      }
    } catch {
      // PDF 파싱 실패 시 메타데이터만 인덱싱
    }
  }

  // ── 3. 기존 ES 문서 삭제 (중복 방지) ──────────
  try {
    await fetch(`${ES_URL}/${ES_INDEX}/_delete_by_query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: { term: { 'path.real': realPath } },
      }),
    })
  } catch {
    // 삭제 실패는 무시하고 계속 진행
  }

  // ── 4. ES 문서 인덱싱 ─────────────────────────
  const doc = {
    content,
    file: {
      filename,
      extension:    ext,
      filesize:     fileSize,
      content_type: CONTENT_TYPE_MAP[ext] || 'application/octet-stream',
      last_modified: lastModified,
      indexing_date: new Date().toISOString(),
      url: `file://${realPath}`,
    },
    path: {
      virtual: virtualPath,
      real:    realPath,
      root:    '',
    },
    meta: {
      ...(creationDate ? { creation_date: creationDate } : {}),
    },
  }

  try {
    // refresh=wait_for: 인덱싱 완료 후 즉시 검색 가능하도록 대기
    const res = await fetch(`${ES_URL}/${ES_INDEX}/_doc?refresh=wait_for`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(doc),
    })
    if (!res.ok) {
      const text = await res.text()
      return { filename, status: 'error', message: `ES 인덱싱 실패 (${res.status}): ${text}` }
    }
  } catch (e) {
    return { filename, status: 'error', message: `ES 연결 실패: ${e}` }
  }

  return { filename, status: 'ok' }
}
