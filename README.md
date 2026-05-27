# 📂 DocSearch — 문서 기반 검색 시스템

PDF 문서를 폴더에 넣으면 자동 인덱싱되어 빠르게 검색할 수 있는 내부 문서 검색 시스템입니다.

---

## 🏗 구조

```
DocSearch/
├── docker-compose.yml          # 전체 서비스 실행 설정
├── elasticsearch/
│   └── Dockerfile              # nori(한국어) 플러그인 포함 ES 이미지
├── fscrawler/
│   └── config/docSearch/
│       ├── _settings.yaml      # FSCrawler 인덱싱 설정
│       └── _mapping            # ES 인덱스 매핑 (nori 분석기)
├── documents/                  # ← PDF 파일을 여기에 넣으세요
└── frontend/                   # Next.js 검색 화면
```

---

## 🚀 시작하기

### 사전 준비
- Docker Desktop 설치 필요

### 1단계: 서비스 실행

```bash
docker-compose up -d
```

최초 실행 시 Elasticsearch 이미지 빌드 (~3분 소요)

### 2단계: PDF 추가

```
documents/ 폴더에 PDF 파일을 복사하세요
```

최대 5분 내 자동 인덱싱됩니다.

### 3단계: 검색

브라우저에서 http://localhost:3000 접속

---

## ⚙️ 설정 변경

### 인덱싱 주기 변경

`fscrawler/config/docSearch/_settings.yaml`
```yaml
fs:
  update_rate: "1m"  # 1분으로 변경
```

### 검색 결과 수 변경

`frontend/src/lib/elasticsearch.ts`
```ts
const PAGE_SIZE = 20  # 20개로 변경
```

---

## 🛑 종료

```bash
docker-compose down
```

데이터 완전 삭제 (인덱스 초기화):
```bash
docker-compose down -v
```

---

## 📋 포트

| 서비스 | 포트 | 용도 |
|---|---|---|
| 검색 화면 | 3000 | 사용자 접속 |
| Elasticsearch | 9200 | 검색 API |
