/**
 * SearchResultCard 컴포넌트
 * 검색 결과 1건을 리스트 아이템 형태로 보여줍니다
 *
 * 사용법:
 *   <SearchResultCard hit={searchHit} />
 */

import { SearchHit } from '@/types/search'
import { formatFileSize, formatDate } from '@/lib/elasticsearch'

interface SearchResultCardProps {
  hit: SearchHit
}

export default function SearchResultCard({ hit }: SearchResultCardProps) {
  const { _source, highlight } = hit

  const filename    = _source.file?.filename || '파일명 없음'
  const filesize    = _source.file?.filesize || 0
  const lastModified = _source.file?.last_modified || ''

  // 하이라이팅된 파일명 (없으면 일반 파일명)
  const highlightedFilename = highlight?.['file.filename']?.[0] || filename

  // 본문 스니펫 첫 번째만 표시 (한 줄)
  const snippet = highlight?.content?.[0] || ''

  return (
    <div className="result-item">

      {/* 상단: 파일명(좌) + 파일크기(우) */}
      <div className="result-item-header">
        <span className="result-item-icon">↓</span>
        <h3
          className="result-item-filename"
          dangerouslySetInnerHTML={{ __html: highlightedFilename }}
        />
        {filesize > 0 && (
          <span className="result-item-size">{formatFileSize(filesize)}</span>
        )}
      </div>

      {/* 본문 스니펫 */}
      {snippet && (
        <p
          className="result-item-snippet"
          dangerouslySetInnerHTML={{ __html: snippet }}
        />
      )}

      {/* 날짜 */}
      {lastModified && (
        <p className="result-item-date">{formatDate(lastModified)}</p>
      )}

    </div>
  )
}
