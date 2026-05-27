/**
 * Elasticsearch API 호출 라이브러리
 *
 * 사용법:
 *   import { searchDocuments } from '@/lib/elasticsearch'
 *   const result = await searchDocuments('검색어')
 */

import { SearchResponse } from '@/types/search'

// 환경변수에서 ES 주소와 인덱스명을 읽어옵니다
const ES_URL = process.env.NEXT_PUBLIC_ES_URL || 'http://localhost:9200'
const ES_INDEX = process.env.NEXT_PUBLIC_ES_INDEX || 'docsearch'

/** 폴더 탭 페이지당 결과 수 */
const PAGE_SIZE = 10

/** All 탭 fetch 수 - 폴더당 5개씩 표시하기 위해 충분히 크게 설정 */
export const ALL_TAB_SIZE = 100

/**
 * 문서 검색 함수
 *
 * @param keyword - 검색어
 * @param page    - 페이지 번호 (1부터 시작, 기본값: 1)
 * @param folder  - 폴더 필터 (예: "Manual"). 없으면 전체 검색
 * @param sortBy  - 정렬 기준 ('relevance' | 'date')
 * @returns Elasticsearch 검색 응답
 *
 * 사용 예시:
 *   const data = await searchDocuments('g100')
 *   const data = await searchDocuments('g100', 1, 'Manual', 'date')
 */
export async function searchDocuments(
  keyword: string,
  page: number = 1,
  folder?: string,
  sortBy: 'relevance' | 'date' = 'relevance',
  size: number = PAGE_SIZE
): Promise<SearchResponse> {
  // 빈 검색어 방어
  if (!keyword.trim()) {
    throw new Error('검색어를 입력해주세요')
  }

  // 페이지 계산 (ES는 0-based offset 사용)
  const from = (page - 1) * size

  // 키워드 검색 쿼리
  // should 조건 2가지를 OR로 묶음:
  // 1) 본문(content) + 파일명(text 분석) 검색
  // 2) 파일명 와일드카드: 바이너리 파일(.dwg, .INV 등)처럼 본문이 없는 파일도 파일명으로 검색 가능
  const matchQuery = {
    bool: {
      should: [
        {
          multi_match: {
            query: keyword,
            fields: ['content', 'file.filename^2'],
            type: 'best_fields',
            operator: 'and'   // 모든 단어 포함 필수 (AND 검색)
          }
        },
        {
          // keyword 타입 파일명 대소문자 무시 와일드카드 검색 (ES 7.10+)
          wildcard: {
            'file.filename': {
              value: `*${keyword.toLowerCase()}*`,
              case_insensitive: true,
              boost: 1.5   // 파일명 직접 매칭 시 가중치
            }
          }
        }
      ],
      minimum_should_match: 1
    }
  }

  // 폴더 필터가 있으면 filter 조건 추가
  const esQuery = folder
    ? {
        bool: {
          must: matchQuery,
          filter: {
            prefix: { 'path.virtual': `/${folder}/` }
          }
        }
      }
    : matchQuery

  // ES 검색 쿼리 구성
  const query = {
    from,
    size,
    query: esQuery,

    // 하이라이팅 설정: 매칭 키워드를 <mark> 태그로 감쌈
    highlight: {
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
      fields: {
        content: {
          fragment_size: 150,
          number_of_fragments: 3
        },
        'file.filename': {
          number_of_fragments: 0
        }
      }
    },

    // 정렬 설정 (relevance = ES 기본 점수순, date = 최신순)
    ...(sortBy === 'date' && {
      sort: [{ 'file.last_modified': { order: 'desc' } }]
    }),

    // 불필요한 content 전체 텍스트는 제외 (응답 크기 최소화 → 속도 향상)
    _source: {
      excludes: ['content']
    },

    // 폴더별 문서 수 집계 (탭에 표시할 숫자)
    // painless 스크립트로 path.virtual에서 첫 번째 폴더명만 추출
    aggs: {
      folders: {
        terms: {
          script: {
            source: `
              String path = doc['path.virtual'].value;
              int idx = path.indexOf('/', 1);
              return idx > 0 ? path.substring(1, idx) : 'root'
            `,
            lang: 'painless'
          },
          size: 20  // 최대 20개 폴더까지 집계
        }
      }
    }
  }

  // ES REST API 호출
  const response = await fetch(`${ES_URL}/${ES_INDEX}/_search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(query)
  })

  // 오류 처리
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`검색 오류 (${response.status}): ${errorText}`)
  }

  return response.json()
}

/**
 * 파일 크기를 읽기 쉬운 형태로 변환
 *
 * @param bytes - 바이트 단위 파일 크기
 * @returns 예: "2.3 MB", "512 KB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * ISO 날짜를 한국 날짜 형식으로 변환
 *
 * @param isoDate - ISO 8601 날짜 문자열
 * @returns 예: "2024년 3월 15일"
 */
export function formatDate(isoDate: string): string {
  if (!isoDate) return ''
  return new Date(isoDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
