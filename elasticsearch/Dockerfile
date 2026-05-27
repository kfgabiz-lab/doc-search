# Elasticsearch 커스텀 이미지
# 기본 이미지에 한국어 형태소 분석기(nori)를 추가합니다

FROM elasticsearch:7.17.21

# nori 한국어 형태소 분석 플러그인 설치
# --batch 옵션: 라이선스 동의 자동 승인
RUN elasticsearch-plugin install analysis-nori --batch
