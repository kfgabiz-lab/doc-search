FROM dadoonet/fscrawler:2.9

# _settings.yaml만 복사 (커스텀 _mapping 파일 제외 - 2.10과 비호환)
USER root
RUN mkdir -p /root/.fscrawler/docsearch
COPY config/docsearch/_settings.yaml /root/.fscrawler/docsearch/_settings.yaml
RUN chmod -R 755 /root/.fscrawler
