// ─────────────────────────────────────────
// Elasticsearch 응답 관련 타입 정의
// ─────────────────────────────────────────

/** 검색 결과 1건 (ES _source 필드) */
export interface DocumentSource {
  content?: string        // PDF 전체 텍스트
  file?: {
    filename: string      // 파일명 (예: 보고서.pdf)
    filesize: number      // 파일 크기 (bytes)
    last_modified: string // 마지막 수정일 (ISO 8601)
    content_type: string  // MIME 타입 (예: application/pdf)
  }
  path?: {
    real: string          // 서버의 실제 파일 경로
    virtual: string       // 가상 경로
  }
}

/** ES 검색 결과 1건 (hit) */
export interface SearchHit {
  _id: string                         // ES 문서 ID
  _score: number                      // 관련도 점수 (높을수록 관련성 높음)
  _source: DocumentSource             // 실제 문서 내용
  highlight?: {
    content?: string[]                // 매칭된 텍스트 스니펫 (하이라이팅 포함)
    'file.filename'?: string[]        // 파일명 하이라이팅
  }
}

/** 폴더별 집계 버킷 1개 */
export interface FolderBucket {
  key: string       // 폴더명 (예: "Manual", "Catalog")
  doc_count: number // 해당 폴더의 문서 수
}

/** ES 검색 전체 응답 */
export interface SearchResponse {
  hits: {
    total: { value: number }          // 전체 매칭 문서 수
    hits: SearchHit[]                 // 검색 결과 목록
  }
  took: number                        // 검색 소요 시간 (ms)
  aggregations?: {
    folders: {
      buckets: FolderBucket[]         // 폴더별 문서 수 집계
    }
  }
}

/** 검색 상태 */
export type SearchStatus = 'idle' | 'loading' | 'success' | 'error'
