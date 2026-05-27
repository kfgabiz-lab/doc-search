'use client'

/**
 * 메인 검색 페이지
 *
 * - 랜딩 없이 항상 상단바 표시
 * - 탭 4개 (All / Manual / Catalog / CAD / Software) 항상 고정 표시
 * - 검색 후 각 탭에 카운트 표시
 */

import { useState } from 'react'
import Link from 'next/link'
import SearchResultCard from '@/components/SearchResultCard'
import { searchDocuments, ALL_TAB_SIZE } from '@/lib/elasticsearch'
import { SearchHit, SearchStatus, FolderBucket } from '@/types/search'

// 항상 표시할 고정 폴더 탭 목록 (표시 순서 고정)
const FIXED_FOLDERS = ['Manual', 'Catalog', 'CAD', 'Software']

/** All 탭에서 폴더당 최대 표시 결과 수 */
const SECTION_LIMIT = 5

// path.virtual 에서 첫 번째 폴더명 추출
// 예) '/Manual/file.pdf' → 'Manual'
function getFolderName(virtualPath: string): string {
  if (!virtualPath) return ''
  const parts = virtualPath.split('/')
  return parts.length > 2 ? parts[1] : ''
}

export default function HomePage() {
  // ── 상태 ──────────────────────────────────
  const [keyword, setKeyword]           = useState('')
  const [inputValue, setInputValue]     = useState('')
  const [hits, setHits]                 = useState<SearchHit[]>([])
  const [totalCount, setTotalCount]     = useState(0)
  const [tookMs, setTookMs]             = useState(0)
  const [status, setStatus]             = useState<SearchStatus>('idle')
  const [errorMsg, setErrorMsg]         = useState('')
  const [folders, setFolders]           = useState<FolderBucket[]>([])
  const [activeFolder, setActiveFolder] = useState<string | undefined>()
  const [sortBy, setSortBy]             = useState<'relevance' | 'date'>('relevance')
  const [hasSearched, setHasSearched]   = useState(false)
  const [isLoading, setIsLoading]       = useState(false)

  // ── 검색 실행 ─────────────────────────────
  const runSearch = async (
    searchKeyword: string,
    folder?: string,
    sort: 'relevance' | 'date' = 'relevance'
  ) => {
    setStatus('loading')
    setIsLoading(true)
    setErrorMsg('')

    try {
      // All 탭은 폴더당 5개씩 표시하기 위해 더 많이 fetch
      const fetchSize = folder ? undefined : ALL_TAB_SIZE
      const data = await searchDocuments(searchKeyword, 1, folder, sort, fetchSize)
      setHits(data.hits.hits)
      setTotalCount(data.hits.total.value)
      setTookMs(data.took)
      setStatus('success')
      setIsLoading(false)

      // 전체 탭에서만 폴더 집계 갱신
      if (!folder) {
        setFolders(data.aggregations?.folders.buckets || [])
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '알 수 없는 오류')
      setStatus('error')
      setIsLoading(false)
      setHits([])
    }
  }

  // ── 새 검색어로 검색 ───────────────────────
  const handleSearch = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setKeyword(trimmed)
    setInputValue(trimmed)
    setActiveFolder(undefined)
    setSortBy('relevance')
    setHasSearched(true)
    runSearch(trimmed)
  }

  // ── 탭 클릭 ───────────────────────────────
  const handleTabClick = (folder?: string) => {
    if (!keyword) return   // 검색어 없으면 탭 클릭 무시
    setActiveFolder(folder)
    runSearch(keyword, folder, sortBy)
  }

  // ── 정렬 변경 ─────────────────────────────
  const handleSortChange = (sort: 'relevance' | 'date') => {
    setSortBy(sort)
    runSearch(keyword, activeFolder, sort)
  }

  // ── All 탭: 결과를 폴더별로 그룹핑 ─────────
  const groupedHits = hits.reduce((acc, hit) => {
    const folder = getFolderName(hit._source.path?.virtual || '') || '기타'
    if (!acc[folder]) acc[folder] = []
    acc[folder].push(hit)
    return acc
  }, {} as Record<string, SearchHit[]>)

  // 폴더별 전체 카운트 (집계 기반)
  const getFolderCount = (folderName: string) =>
    folders.find((f) => f.key === folderName)?.doc_count ?? 0

  const allCount = folders.reduce((sum, f) => sum + f.doc_count, 0)

  // ── 렌더링 ────────────────────────────────
  return (
    <>
      {/* ── 상단 네비게이션 바 (항상 표시) ── */}
      <nav className="topbar">
        <div className="topbar-inner">

          {/* 로고 */}
          <a className="topbar-logo" href="/" onClick={(e) => {
            e.preventDefault()
            setStatus('idle')
            setInputValue('')
            setKeyword('')
            setHasSearched(false)
            setHits([])
            setFolders([])
          }}>
            <div className="topbar-logo-icon">DS</div>
            <span className="topbar-logo-text">DocSearch</span>
          </a>

          {/* 인덱스 현황 버튼 */}
          <Link href="/status" className="topbar-status-btn">
            인덱스 현황
          </Link>

          {/* 검색창 */}
          <div className="topbar-search">
            <input
              className="topbar-search-input"
              type="text"
              placeholder="문서를 검색하세요..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(inputValue)}
              autoFocus
            />
            <button
              className="topbar-search-btn"
              onClick={() => handleSearch(inputValue)}
              disabled={isLoading}
            >
              검색
            </button>
          </div>

        </div>
      </nav>

      {/* ── 결과 영역 ── */}
      <div className="results-page">

        {/* 탭 + 정렬 (항상 표시) */}
        <div className="tabs-row">
          <div className="folder-tabs">
            {/* All 탭 */}
            <button
              className={`folder-tab ${!activeFolder ? 'folder-tab--active' : ''}`}
              onClick={() => handleTabClick(undefined)}
            >
              All{hasSearched ? ` (${allCount.toLocaleString()})` : ''}
            </button>

            {/* 고정 폴더 탭 4개 */}
            {FIXED_FOLDERS.map((name) => {
              const count = getFolderCount(name)
              return (
                <button
                  key={name}
                  className={`folder-tab ${activeFolder === name ? 'folder-tab--active' : ''}`}
                  onClick={() => handleTabClick(name)}
                >
                  {name}{hasSearched ? ` (${count.toLocaleString()})` : ''}
                </button>
              )
            })}
          </div>

          {/* 정렬 (검색 후에만 표시) */}
          {hasSearched && (
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as 'relevance' | 'date')}
            >
              <option value="relevance">Relevance</option>
              <option value="date">Date</option>
            </select>
          )}
        </div>

        {/* 검색 전 안내 */}
        {!hasSearched && (
          <div className="status-message">검색어를 입력하세요.</div>
        )}

        {/* 로딩 */}
        {status === 'loading' && (
          <div className="status-message">
            <span className="loading-spinner" />검색 중입니다...
          </div>
        )}

        {/* 오류 */}
        {status === 'error' && (
          <div className="status-message status-message--error">⚠️ {errorMsg}</div>
        )}

        {/* 결과 */}
        {status === 'success' && (
          <>
            {/* 결과 없음 */}
            {hits.length === 0 && (
              <div className="status-message">검색 결과가 없습니다.</div>
            )}

            {/* All 탭: Manual → Catalog → CAD → Software 고정 순서, 폴더당 5개 */}
            {!activeFolder && hits.length > 0 && (
              <div className="sections">
                {FIXED_FOLDERS.map((folderName) => {
                  const folderHits = (groupedHits[folderName] || []).slice(0, SECTION_LIMIT)
                  const total      = getFolderCount(folderName)
                  if (folderHits.length === 0) return null
                  return (
                    <div key={folderName} className="section">
                      <div className="section-header">
                        <span className="section-title">{folderName}</span>
                        <span className="section-count">
                          Showing {folderHits.length} / {total > 0 ? total : folderHits.length} result
                        </span>
                        {total > folderHits.length && (
                          <button
                            className="section-more"
                            onClick={() => handleTabClick(folderName)}
                          >
                            +
                          </button>
                        )}
                      </div>
                      <div className="result-list">
                        {folderHits.map((hit) => (
                          <SearchResultCard key={hit._id} hit={hit} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 폴더 탭: 해당 폴더 결과만 */}
            {activeFolder && hits.length > 0 && (
              <div className="section">
                <div className="section-header">
                  <span className="section-title">{activeFolder}</span>
                  <span className="section-count">
                    Showing {hits.length} / {totalCount.toLocaleString()} result
                  </span>
                  <span className="results-took">{tookMs}ms</span>
                </div>
                <div className="result-list">
                  {hits.map((hit) => (
                    <SearchResultCard key={hit._id} hit={hit} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
