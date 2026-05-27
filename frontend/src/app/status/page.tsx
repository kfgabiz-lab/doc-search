'use client'

/**
 * 인덱스 현황 페이지
 *
 * - 통계 카드: 전체 / 완료 / 대기 파일 수
 * - 파일 목록 테이블: 폴더 / 파일명 / 크기 / 문서생성일 / 상태 / 인덱싱 완료 시간 / 삭제
 * - 전체 삭제 / 단건 삭제 기능
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatFileSize, formatDate } from '@/lib/elasticsearch'

interface FileStatus {
  folder:      string
  filename:    string
  size:        number
  status:      'indexed' | 'pending'
  esId:        string | null
  indexedAt:   string | null
  createdAt:   string | null
  virtualPath: string   // 단건 인덱싱 요청 시 사용
}

interface Stats {
  total:   number
  indexed: number
  pending: number
}

const STATUS_LABEL = { indexed: '완료', pending: '대기' } as const

export default function StatusPage() {
  const [files, setFiles]             = useState<FileStatus[]>([])
  const [stats, setStats]             = useState<Stats | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [filter, setFilter]           = useState<'all' | 'indexed' | 'pending'>('all')
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [deletingAll, setDeletingAll]     = useState(false)
  const [indexingPath, setIndexingPath]   = useState<string | null>(null)  // 인덱싱 중인 단건 virtualPath
  const [indexingAll, setIndexingAll]     = useState(false)

  // 현황 데이터 불러오기
  const fetchStatus = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/index-status')
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setFiles(data.files)
      setStats(data.stats)
      setLastFetched(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  // 전체 삭제
  const handleDeleteAll = async () => {
    if (!confirm('인덱싱된 전체 문서를 삭제하시겠습니까?\n파일 목록은 유지되며 상태가 "대기"로 변경됩니다.')) return
    setDeletingAll(true)
    try {
      const res = await fetch('/api/index-status/all', { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      await fetchStatus()
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 실패')
    } finally {
      setDeletingAll(false)
    }
  }

  // 전체 인덱싱 (대기 파일 전체)
  const handleIndexAll = async () => {
    setIndexingAll(true)
    try {
      const res = await fetch('/api/index-all', { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      await fetchStatus()
    } catch (err) {
      alert(err instanceof Error ? err.message : '인덱싱 실패')
    } finally {
      setIndexingAll(false)
    }
  }

  // 단건 인덱싱
  const handleIndexOne = async (virtualPath: string) => {
    setIndexingPath(virtualPath)
    try {
      const res = await fetch('/api/index-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ virtualPath }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.status === 'error') throw new Error(data.message)
      await fetchStatus()
    } catch (err) {
      alert(err instanceof Error ? err.message : '인덱싱 실패')
    } finally {
      setIndexingPath(null)
    }
  }

  // 단건 삭제
  const handleDeleteOne = async (esId: string) => {
    setDeletingId(esId)
    try {
      const res = await fetch(`/api/index-status/${esId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      // 목록에서 해당 파일 상태만 대기로 전환 (전체 재조회 없이 즉시 반영)
      setFiles((prev) =>
        prev.map((f) =>
          f.esId === esId ? { ...f, status: 'pending', esId: null, indexedAt: null, createdAt: null } : f
        )
      )
      setStats((prev) =>
        prev ? { ...prev, indexed: prev.indexed - 1, pending: prev.pending + 1 } : prev
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 실패')
    } finally {
      setDeletingId(null)
    }
  }

  // 필터 적용
  const visibleFiles = filter === 'all'
    ? files
    : files.filter((f) => f.status === filter)

  return (
    <div>
      {/* ── 상단바 ── */}
      <nav className="topbar">
        <div className="topbar-inner">
          <Link className="topbar-logo" href="/">
            <div className="topbar-logo-icon">DS</div>
            <span className="topbar-logo-text">DocSearch</span>
          </Link>
          <span className="status-page-title">인덱스 현황</span>
        </div>
      </nav>

      <div className="status-page">

        {/* ── 통계 카드 ── */}
        {stats && (
          <div className="stat-cards">
            <div className="stat-card">
              <span className="stat-card-label">전체 파일</span>
              <span className="stat-card-value">{stats.total.toLocaleString()}</span>
            </div>
            <div className="stat-card stat-card--indexed">
              <span className="stat-card-label">인덱싱 완료</span>
              <span className="stat-card-value">{stats.indexed.toLocaleString()}</span>
            </div>
            <div className="stat-card stat-card--pending">
              <span className="stat-card-label">대기 중</span>
              <span className="stat-card-value">{stats.pending.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* ── 필터 + 버튼 툴바 ── */}
        <div className="status-toolbar">
          <div className="status-filters">
            {(['all', 'indexed', 'pending'] as const).map((f) => (
              <button
                key={f}
                className={`status-filter-btn ${filter === f ? 'status-filter-btn--active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? '전체' : f === 'indexed' ? '완료' : '대기'}
                {stats && (
                  <span className="status-filter-count">
                    {f === 'all' ? stats.total : f === 'indexed' ? stats.indexed : stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="status-toolbar-right">
            {lastFetched && (
              <span className="status-last-fetched">{lastFetched.toLocaleTimeString('ko-KR')} 기준</span>
            )}
            <button
              className="status-refresh-btn"
              onClick={fetchStatus}
              disabled={loading || deletingAll}
            >
              {loading ? '조회 중...' : '새로고침'}
            </button>
            <button
              className="status-index-all-btn"
              onClick={handleIndexAll}
              disabled={indexingAll || loading || stats?.total === 0}
            >
              {indexingAll ? '인덱싱 중...' : '전체 인덱싱'}
            </button>
            <button
              className="status-delete-all-btn"
              onClick={handleDeleteAll}
              disabled={deletingAll || loading || stats?.indexed === 0}
            >
              {deletingAll ? '삭제 중...' : '전체 삭제'}
            </button>
          </div>
        </div>

        {/* ── 로딩 / 오류 ── */}
        {loading && <div className="status-message">조회 중입니다...</div>}
        {error   && <div className="status-message status-message--error">⚠️ {error}</div>}

        {/* ── 파일 목록 테이블 ── */}
        {!loading && !error && visibleFiles.length > 0 && (
          <div className="status-table-wrap">
            <table className="status-table">
              <thead>
                <tr>
                  <th>폴더</th>
                  <th>파일명</th>
                  <th>크기</th>
                  <th>문서 생성일</th>
                  <th>상태</th>
                  <th>인덱싱 완료 시간</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleFiles.map((f, i) => (
                  <tr key={i}>
                    <td className="status-td-folder">{f.folder}</td>
                    <td className="status-td-filename">{f.filename}</td>
                    <td className="status-td-size">{f.size > 0 ? formatFileSize(f.size) : '-'}</td>
                    <td className="status-td-date">{f.createdAt ? formatDate(f.createdAt) : '-'}</td>
                    <td>
                      <span className={`status-badge status-badge--${f.status}`}>
                        {STATUS_LABEL[f.status]}
                      </span>
                    </td>
                    <td className="status-td-date">{f.indexedAt ? formatDate(f.indexedAt) : '-'}</td>
                    <td className="status-td-action">
                      {f.status === 'pending' && (
                        <button
                          className="status-index-btn"
                          onClick={() => handleIndexOne(f.virtualPath)}
                          disabled={indexingPath === f.virtualPath}
                        >
                          {indexingPath === f.virtualPath ? '...' : '인덱싱'}
                        </button>
                      )}
                      {f.status === 'indexed' && f.esId && (
                        <button
                          className="status-delete-btn"
                          onClick={() => handleDeleteOne(f.esId!)}
                          disabled={deletingId === f.esId}
                        >
                          {deletingId === f.esId ? '...' : '삭제'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && visibleFiles.length === 0 && (
          <div className="status-message">파일이 없습니다.</div>
        )}
      </div>
    </div>
  )
}
