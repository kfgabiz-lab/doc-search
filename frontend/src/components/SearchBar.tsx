'use client'

/**
 * SearchBar 컴포넌트
 * 검색어 입력창과 검색 버튼을 담당합니다
 *
 * 사용법:
 *   <SearchBar onSearch={(keyword) => handleSearch(keyword)} isLoading={false} />
 */

import { useState, KeyboardEvent } from 'react'

interface SearchBarProps {
  onSearch: (keyword: string) => void  // 검색 실행 콜백
  isLoading: boolean                    // 검색 중 여부 (버튼 비활성화용)
  initialValue?: string                 // 초기 검색어 값
}

export default function SearchBar({ onSearch, isLoading, initialValue = '' }: SearchBarProps) {
  // 입력창 상태 관리
  const [keyword, setKeyword] = useState(initialValue)

  // 검색 실행 함수
  const handleSearch = () => {
    // 공백만 입력된 경우 실행 안 함
    if (!keyword.trim()) return
    onSearch(keyword.trim())
  }

  // 엔터키 입력 시 검색 실행
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="search-bar-container">
      <input
        type="text"
        className="search-input"
        placeholder="문서 내용이나 파일명을 검색하세요..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        autoFocus
      />
      <button
        className="search-button"
        onClick={handleSearch}
        disabled={isLoading || !keyword.trim()}  // 빈 입력 또는 로딩 중 비활성화
      >
        {isLoading ? '검색 중...' : '검색'}
      </button>
    </div>
  )
}
