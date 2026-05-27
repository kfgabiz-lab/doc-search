/**
 * 인덱스 현황 API Route (서버사이드)
 *
 * 사용법:
 *   GET /api/index-status
 *   → { files: FileStatus[], stats: Stats }
 *
 * 동작:
 *   1. 파일시스템에서 허용 확장자 파일 목록 수집
 *   2. ES에서 인덱싱 완료 파일 목록 조회
 *   3. 두 목록 비교 → 상태(완료/대기) 병합 후 반환
 */

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// 매 요청마다 실시간으로 파일시스템 + ES를 조회 (캐시 비활성화)
export const dynamic = 'force-dynamic'

const DOCS_PATH    = process.env.DOCS_PATH        || '/usr/share/fscrawler/documents'
const ES_URL       = process.env.ES_INTERNAL_URL  || 'http://elasticsearch:9200'
const ES_INDEX     = process.env.NEXT_PUBLIC_ES_INDEX || 'docsearch'

// 시스템/숨김 파일만 차단 - ZIP 포함 모든 파일 허용 (파일명 인덱싱)
const BLOCKED_EXT = new Set([
  'ds_store', 'gitkeep', 'gitignore',
])

interface FsFile {
  folder:   string
  filename: string
  size:     number
  realPath: string  // ES path.real 비교용
}

/**
 * 디렉토리 재귀 탐색 - 압축 파일 제외한 모든 파일 수집
 */
function walkDir(dir: string, baseDir: string): FsFile[] {
  const results: FsFile[] = []

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return results  // 읽기 실패 시 빈 배열 반환
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, baseDir))
    } else if (entry.isFile()) {
      const ext = entry.name.split('.').pop()?.toLowerCase() || ''
      if (BLOCKED_EXT.has(ext)) continue  // 압축 파일만 제외

      // path.real 형식 맞추기: 슬래시 통일
      const realPath = fullPath.split(path.sep).join('/')

      // 첫 번째 하위 폴더명 추출 (baseDir 기준)
      const relative = realPath.replace(baseDir.split(path.sep).join('/'), '').replace(/^\//, '')
      const parts    = relative.split('/')
      const folder   = parts.length > 1 ? parts[0] : 'root'

      let size = 0
      try { size = fs.statSync(fullPath).size } catch { /* 무시 */ }

      results.push({ folder, filename: entry.name, size, realPath })
    }
  }

  return results
}

export async function GET() {
  try {
    // ── 1. 파일시스템 탐색 ─────────────────────
    const fsFiles = walkDir(DOCS_PATH, DOCS_PATH)

    // ── 2. ES 인덱싱 완료 목록 조회 ────────────
    // path.real 기준으로 매핑 (최대 10,000건)
    const indexedMap = new Map<string, { esId: string; indexedAt: string | null; createdAt: string | null }>()

    try {
      const esRes = await fetch(`${ES_URL}/${ES_INDEX}/_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          size: 10000,
          query: { match_all: {} },
          _source: ['file.indexing_date', 'path.real', 'meta.creation_date'],
        }),
      })

      if (esRes.ok) {
        const esData = await esRes.json()
        for (const hit of (esData.hits?.hits || [])) {
          const realPath = hit._source?.path?.real as string | undefined
          if (realPath) {
            indexedMap.set(realPath, {
              esId:      hit._id,
              indexedAt: hit._source?.file?.indexing_date   || null,
              createdAt: hit._source?.meta?.creation_date   || null,
            })
          }
        }
      }
    } catch {
      // ES 조회 실패 시 전체를 대기 상태로 표시
    }

    // ── 3. 파일시스템 목록 + ES 상태 병합 ───────
    const files = fsFiles.map((f) => {
      const esInfo = indexedMap.get(f.realPath)
      // virtual path: realPath에서 DOCS_PATH 제거
      const virtualPath = f.realPath
        .replace(DOCS_PATH.split(path.sep).join('/'), '')
      return {
        folder:      f.folder,
        filename:    f.filename,
        size:        f.size,
        status:      esInfo ? 'indexed' : 'pending',
        esId:        esInfo?.esId      || null,
        indexedAt:   esInfo?.indexedAt || null,
        createdAt:   esInfo?.createdAt || null,
        virtualPath,
      }
    })

    // 폴더 → 파일명 순 정렬
    files.sort((a, b) =>
      a.folder.localeCompare(b.folder) || a.filename.localeCompare(b.filename)
    )

    const stats = {
      total:   files.length,
      indexed: files.filter((f) => f.status === 'indexed').length,
      pending: files.filter((f) => f.status === 'pending').length,
    }

    return NextResponse.json({ files, stats })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
